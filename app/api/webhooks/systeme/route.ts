import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Systeme.io webhook receiver for "new sale" and "canceled sale/refund"
// events (configure under Systeme.io: Settings > Webhooks, pointed at
// https://stillgrowing.co/api/webhooks/systeme). Feeds the `purchases`
// table (0045_purchases.sql) -- the real-sales side of reconciling
// against `book_unlocks`, since GROWBABY is one shared code across every
// buyer and unlock count alone can't tell a real purchase from a
// leaked/pirated copy.
//
// IMPORTANT: the signature header name/algorithm and the payload field
// paths below are built from Systeme.io's public help articles plus a
// third-party integration guide (Rollout), not their official developer
// reference -- that page (developer.systeme.io) was blocked by
// robots.txt when this was written, so none of this is confirmed
// first-hand against real traffic. The full raw event is always stored
// in `raw_payload` regardless of whether the typed-column extraction
// below is right, specifically so nothing is lost if a guessed field path
// is wrong. Once this route is wired up for real in Systeme.io, send a
// test event (or wait for the first live sale) and check what actually
// landed in `purchases.raw_payload` against what got extracted into the
// other columns -- adjust the field paths below to match reality, and
// confirm requests are actually passing signature verification rather
// than silently failing closed.

export const runtime = "nodejs"; // needs Node's crypto + raw request body

function verifySignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const givenBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== givenBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, givenBuf);
}

export async function POST(request: NextRequest) {
  const secret = process.env.SYSTEME_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhooks/systeme] SYSTEME_WEBHOOK_SECRET not set, rejecting request");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // Read as raw text (not request.json()) -- HMAC verification has to run
  // against the exact bytes systeme.io signed, not a re-serialized object.
  const rawBody = await request.text();
  const signature = request.headers.get("x-systeme-signature");

  if (!verifySignature(rawBody, signature, secret)) {
    console.warn("[webhooks/systeme] Signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawType = String((payload as { type?: unknown })?.type ?? "").toLowerCase();
  const isRefund = rawType.includes("refund") || rawType.includes("cancel");
  const isSale = rawType.includes("sale") && !isRefund;

  if (!isSale && !isRefund) {
    // Not a sale/refund event -- e.g. contact/tag/opt-in events, if this
    // webhook is ever scoped more broadly than just sales+refunds.
    // Acknowledge with 200 so systeme.io doesn't treat it as a failure
    // and keep retrying.
    return NextResponse.json({ ok: true, ignored: true, type: rawType || null });
  }

  // Best-effort extraction against the documented (but unconfirmed) shape:
  // { type, data: { customer, order, order_item, funnel_step, offer_price_plan, coupon }, account, created_at }
  const data = (payload as any)?.data ?? {};
  const email: string | null = data?.customer?.email ?? data?.order?.customer?.email ?? null;
  const orderId: string | null = data?.order?.id != null ? String(data.order.id) : null;
  const amount: number | null =
    data?.order?.direct_charge_amount ?? data?.order_item?.direct_charge_amount ?? null;
  const currency: string | null = data?.order?.currency ?? null;
  const productName: string | null =
    data?.order_item?.name ?? data?.funnel_step?.name ?? data?.offer_price_plan?.name ?? null;

  if (!orderId) {
    console.warn(`[webhooks/systeme] No order id found in "${rawType}" payload, inserting without dedup`);
  }

  const supabase = createAdminClient();

  const row = {
    systeme_order_id: orderId,
    email,
    product_name: productName,
    amount,
    currency,
    event_type: (payload as { type?: string })?.type ?? "unknown",
    status: isRefund ? "refunded" : "completed",
    raw_payload: payload,
    ...(isRefund ? { refunded_at: new Date().toISOString() } : {}),
  };

  const { error } = orderId
    ? await supabase.from("purchases").upsert(row, { onConflict: "systeme_order_id" })
    : await supabase.from("purchases").insert(row);

  if (error) {
    console.error("[webhooks/systeme] Write failed:", error);
    return NextResponse.json({ error: "Write failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
