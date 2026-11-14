// Post-apply check for supabase/migrations/0068_lock_down_codes_and_progress.sql.
// Run from the repo root AFTER the migration is applied to production:
//
//   node scripts/verify-0068.mjs
//
// Reads NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and
// SUPABASE_SERVICE_ROLE_KEY from .env.local at runtime. Nothing is hardcoded.
// Prints only pass/fail flags, HTTP statuses and row counts: never emails,
// user ids, tokens or code values.
//
// What it checks:
// 1. With the anon key, the code columns (books.redemption_code,
//    books.redemption_code_amazon, chapters.unlock_code) and select=* on
//    books/chapters are refused; ordinary book columns are still readable.
// 2. Signed in as a demo account (is_demo = true) that has no unlock,
//    badge or progress rows for the book, direct inserts into book_unlocks,
//    user_badges and user_books are refused, and reading its own progress
//    still works. The session is minted with admin.generateLink + verifyOtp,
//    which sends no email.
// 3. Unlock, badge and progress row counts are the same before and after.
//
// If a probe insert unexpectedly succeeds, that exact row is deleted again
// straight away and the script exits with code 1.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = {};
for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SERVICE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(2);
}

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
let problems = 0;
const log = (label, value, ok) => {
  if (!ok) problems++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${(label + " ").padEnd(62, ".")} ${value}`);
};

async function count(table) {
  const { count: n, error } = await admin.from(table).select("id", { count: "exact", head: true });
  if (error) throw new Error(`count ${table}: ${error.message}`);
  return n;
}
async function counts() {
  return { book_unlocks: await count("book_unlocks"), user_badges: await count("user_badges"), user_books: await count("user_books") };
}

const before = await counts();

// 1. Anon reads
const anonH = { apikey: ANON, Authorization: `Bearer ${ANON}` };
for (const q of [
  "books?select=redemption_code",
  "books?select=redemption_code_amazon",
  "books?select=*",
  "chapters?select=unlock_code",
  "chapters?select=*",
]) {
  const r = await fetch(`${URL_}/rest/v1/${q}`, { headers: anonH });
  const body = await r.json().catch(() => null);
  log(`anon read ${q} is refused`, r.ok ? `ALLOWED (${Array.isArray(body) ? body.length : "?"} rows)` : `${r.status} ${body?.code ?? ""}`, !r.ok);
}
const pub = await fetch(`${URL_}/rest/v1/books?select=id,slug,title&status=eq.published`, { headers: anonH });
log("anon read of ordinary book columns still works", pub.status, pub.ok);

// 2. Direct writes as a demo account with no rows for the book
const { data: book } = await admin.from("books").select("id").eq("status", "published").order("created_at").limit(1).single();
const { data: chapter } = await admin.from("chapters").select("id, badges(id)").eq("book_id", book.id).order("number").limit(1).single();
const badgeId = (Array.isArray(chapter.badges) ? chapter.badges[0] : chapter.badges)?.id;

const { data: demos } = await admin.from("users").select("id").eq("is_demo", true).order("id");
let demoId = null;
for (const { id } of demos ?? []) {
  const [u, b, p] = await Promise.all([
    admin.from("book_unlocks").select("id", { count: "exact", head: true }).eq("user_id", id).eq("book_id", book.id),
    admin.from("user_badges").select("id", { count: "exact", head: true }).eq("user_id", id).eq("book_id", book.id),
    admin.from("user_books").select("id", { count: "exact", head: true }).eq("user_id", id).eq("book_id", book.id),
  ]);
  if (!u.count && !b.count && !p.count) { demoId = id; break; }
}
if (!demoId || !badgeId) {
  log("found a demo account with no rows for the book, and a badge", "none found, write probes skipped", false);
} else {
  const { data: authUser } = await admin.auth.admin.getUserById(demoId);
  const email = authUser.user.email;
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkErr) throw linkErr;
  const anonClient = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data: v, error: otpErr } = await anonClient.auth.verifyOtp({ email, token: link.properties.email_otp, type: "email" });
  if (otpErr) throw otpErr;
  const userH = { apikey: ANON, Authorization: `Bearer ${v.session.access_token}`, "Content-Type": "application/json", Prefer: "return=minimal" };

  const probes = [
    ["book_unlocks", { user_id: demoId, book_id: book.id }],
    ["user_badges", { user_id: demoId, book_id: book.id, badge_id: badgeId }],
    ["user_books", { user_id: demoId, book_id: book.id, current_chapter: 99, badges_earned: 98 }],
  ];
  for (const [table, row] of probes) {
    const r = await fetch(`${URL_}/rest/v1/${table}`, { method: "POST", headers: userH, body: JSON.stringify(row) });
    const body = await r.json().catch(() => null);
    log(`demo user direct insert into ${table} is refused`, r.ok ? "ALLOWED" : `${r.status} ${body?.code ?? ""}`, !r.ok);
    if (r.ok) await admin.from(table).delete().match(row);
  }
  const own = await fetch(`${URL_}/rest/v1/user_books?select=current_chapter&user_id=eq.${demoId}`, { headers: userH });
  log("demo user can still read own progress", own.status, own.ok);
}

// 3. Counts
const after = await counts();
log("unlock/badge/progress counts unchanged", `${JSON.stringify(before)} / ${JSON.stringify(after)}`, JSON.stringify(before) === JSON.stringify(after));

console.log(problems ? `\n${problems} check(s) FAILED` : "\nAll checks passed");
process.exit(problems ? 1 : 0);
