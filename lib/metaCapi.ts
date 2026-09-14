import crypto from "crypto";

// Server-side Purchase event via Meta's Conversions API (CAPI), sent from
// app/api/webhooks/systeme/route.ts on a confirmed sale. Complements (does
// not replace) the client-side Meta Pixel Purchase event fired on
// Systeme.io's own order-confirmation page -- CAPI is the reliable half:
// it isn't affected by ad blockers, Safari's ITP, or a buyer closing the
// tab before the confirmation page's pixel fires, and it uses the same
// order.totalPrice/pricePlan.currency values the webhook already verified
// are correct (2026-08-21/22 fix), rather than whatever Systeme.io's page
// editor can expose to client-side JS on that page.
//
// GRAPH_API_VERSION pinned, not "latest": Meta deprecates versions on a
// schedule: pin so this doesn't silently break on Meta's timeline instead
// of ours. Bump deliberately, not automatically.
const GRAPH_API_VERSION = "v21.0";
const TIMEOUT_MS = 5_000;

export type MetaPurchaseEvent = {
  email: string | null;
  orderId: string | null;
  // Cents, same unit as purchases.amount (order.totalPrice from the
  // webhook payload) -- converted to a decimal below, since CAPI's
  // custom_data.value is a plain number in the currency's major unit.
  amountCents: number;
  currency: string;
};

function sha256Lower(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

async function timedFetch(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Never throws -- a tracking-side failure must never fail the webhook
// response or block the purchases-table write it follows, same reasoning
// as lib/systeme.ts's syncSystemeContact.
export async function sendMetaPurchaseEvent(event: MetaPurchaseEvent): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !accessToken) {
    console.warn("[metaCapi] META_PIXEL_ID or META_CAPI_ACCESS_TOKEN not set, skipping Purchase event");
    return;
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        // Shared with the client-side pixel's event_id (same Systeme.io
        // order id) so Meta dedupes the two into one conversion instead of
        // double-counting -- see the /begin handoff notes for the
        // client-side snippet that needs to match this.
        ...(event.orderId ? { event_id: event.orderId } : {}),
        action_source: "website",
        user_data: event.email ? { em: [sha256Lower(event.email)] } : {},
        custom_data: {
          currency: event.currency,
          value: event.amountCents / 100,
          ...(event.orderId ? { order_id: event.orderId } : {}),
        },
      },
    ],
    ...(process.env.META_CAPI_TEST_EVENT_CODE
      ? { test_event_code: process.env.META_CAPI_TEST_EVENT_CODE }
      : {}),
  };

  try {
    const res = await timedFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "(unreadable)");
      console.error(`[metaCapi] POST /events failed ${res.status}: ${errBody}`);
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("[metaCapi] POST /events timed out after 5s");
    } else {
      console.error("[metaCapi] POST /events network error:", err);
    }
  }
}
