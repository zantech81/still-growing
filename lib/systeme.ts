import { createAdminClient } from "@/lib/supabase/admin";

const API_URL = "https://api.systeme.io/api/contacts";
const PLATFORM_TAG = "platform-member";
const TIMEOUT_MS = 5_000;

// Syncs a newly signed-in user to Systeme.io as a marketing contact.
// Safe to call on every login — exits immediately if already synced.
// Never throws: all errors are logged and the caller is unaffected.
export async function syncSystemeContact(userId: string, email: string): Promise<void> {
  const apiKey = process.env.SYSTEME_API_KEY;
  if (!apiKey) {
    console.warn("[systeme] SYSTEME_API_KEY not set — skipping sync");
    return;
  }
  if (!email) return;

  try {
    const supabase = createAdminClient();

    // Idempotency guard: skip if we already have a contact ID for this user.
    const { data: profile } = await supabase
      .from("users")
      .select("systeme_contact_id")
      .eq("id", userId)
      .single();

    if (profile?.systeme_contact_id) return;

    const contactId = await createOrFindContact(apiKey, email);
    if (!contactId) return;

    const { error } = await supabase
      .from("users")
      .update({ systeme_contact_id: contactId })
      .eq("id", userId);

    if (error) {
      console.error("[systeme] Failed to store contact ID:", error.message);
    }
  } catch (err) {
    console.error("[systeme] Unexpected error during sync:", err);
  }
}

// Wraps fetch with an AbortController timeout. Throws AbortError on timeout
// (caller is responsible for catching and logging it).
async function timedFetch(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

async function createOrFindContact(apiKey: string, email: string): Promise<string | null> {
  const headers = {
    "X-API-Key": apiKey,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  let createRes: Response;
  try {
    createRes = await timedFetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ email, fields: [], tags: [{ name: PLATFORM_TAG }] }),
    });
  } catch (err) {
    if (isAbortError(err)) {
      console.error("[systeme] POST /api/contacts timed out after 5 s");
    } else {
      console.error("[systeme] POST /api/contacts network error:", err);
    }
    return null;
  }

  if (createRes.ok) {
    const body = (await createRes.json()) as { id?: string | number };
    const id = body.id?.toString() ?? null;
    if (!id) console.error("[systeme] Created contact but response had no ID:", JSON.stringify(body));
    return id;
  }

  // 409 or 422 means the email already exists in Systeme.io.
  // Fall back to a search so we can store the existing contact's ID.
  if (createRes.status === 409 || createRes.status === 422) {
    return findContactByEmail(apiKey, email, headers);
  }

  const errBody = await createRes.text().catch(() => "(unreadable)");
  console.error(`[systeme] POST /api/contacts failed ${createRes.status}: ${errBody}`);
  return null;
}

async function findContactByEmail(
  apiKey: string,
  email: string,
  headers: Record<string, string>
): Promise<string | null> {
  const url = `${API_URL}?email=${encodeURIComponent(email)}`;

  let res: Response;
  try {
    res = await timedFetch(url, { method: "GET", headers });
  } catch (err) {
    if (isAbortError(err)) {
      console.error("[systeme] GET /api/contacts timed out after 5 s");
    } else {
      console.error("[systeme] GET /api/contacts network error:", err);
    }
    return null;
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => "(unreadable)");
    console.error(`[systeme] GET /api/contacts?email= failed ${res.status}: ${errBody}`);
    return null;
  }

  const body = (await res.json()) as { items?: Array<{ id?: string | number }> };
  const contact = body.items?.[0];
  if (!contact?.id) {
    console.error("[systeme] Contact lookup returned no results for email:", email);
    return null;
  }

  return contact.id.toString();
}
