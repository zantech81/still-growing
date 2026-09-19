import crypto from "crypto";

// Server-side Purchase event via Meta's Conversions API (CAPI), sent from
// app/api/webhooks/systeme/route.ts on a confirmed sale. There is no
// client-side Purchase pixel anywhere in this funnel -- Systeme.io's
// order-confirmation page doesn't fire one -- so this server event is the
// only Purchase signal Meta gets, not a complement to one. Uses the same
// order.totalPrice/pricePlan.currency values the webhook already verified
// are correct (2026-08-21/22 fix), rather than whatever Systeme.io's page
// editor could expose to client-side JS on that page.
//
// GRAPH_API_VERSION pinned, not "latest": Meta deprecates versions on a
// schedule: pin so this doesn't silently break on Meta's timeline instead
// of ours. Bump deliberately, not automatically.
const GRAPH_API_VERSION = "v21.0";
const TIMEOUT_MS = 5_000;

export type MetaPurchaseEvent = {
  email: string | null;
  // Meta's event_id -- must be unique per Purchase event sent. There's no
  // client-side pixel to dedupe against (see the file-level comment
  // above); this exists purely so Meta's OWN dedup logic doesn't collapse
  // two genuinely different sales into one. NOT always the same as
  // orderId below: a single Systeme order with an order bump fires one
  // SALE_NEW webhook per line item, all sharing the same order.id, so
  // using order.id alone here makes Meta treat every item after the first
  // as a duplicate of the one before it and drop it silently -- confirmed
  // 2026-09-19 via order 12702840 (book + $3.99 bump): the bump's Purchase
  // never appeared in Test Events. The caller
  // (app/api/webhooks/systeme/route.ts) builds this from order.id plus a
  // per-line-item id.
  eventId: string | null;
  // Systeme's order id -- always order.id, regardless of eventId above.
  // Still written to custom_data.order_id unchanged.
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
    console.error("[metaCapi] CAPI skipped: missing META_PIXEL_ID or META_CAPI_ACCESS_TOKEN env var");
    return;
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;

  // Single source of truth for both the request body below and the log
  // lines further down, so the logs always describe exactly what was sent,
  // never a value that's drifted from it.
  const eventName = "Purchase";
  const value = event.amountCents / 100;
  const hasTestEventCode = !!process.env.META_TEST_EVENT_CODE;

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        // Unique per line item, not per order, so Meta's own dedup doesn't
        // collapse a multi-item sale (e.g. book + bump) into one Purchase
        // -- see MetaPurchaseEvent.eventId above. No client-side pixel
        // exists to match ids against.
        ...(event.eventId ? { event_id: event.eventId } : {}),
        action_source: "website",
        user_data: event.email ? { em: [sha256Lower(event.email)] } : {},
        custom_data: {
          currency: event.currency,
          // amountCents is order.totalPrice's unit (cents, e.g. 1499 =
          // $14.99); Graph API's custom_data.value is the plain decimal
          // amount, hence the /100 here.
          value,
          ...(event.orderId ? { order_id: event.orderId } : {}),
        },
      },
    ],
    // Optional: set only while verifying in Events Manager's Test Events
    // tab. A test_event_code routes events to test-only, not the reported
    // ad account totals -- unset in production once verification is done.
    ...(hasTestEventCode ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}),
  };

  // Logged on both success and failure below -- never the code itself,
  // just whether one was included, and never the token or raw email.
  const logContext =
    `event_name=${eventName} event_id=${event.eventId ?? "(none)"} value=${value} ` +
    `currency=${event.currency} test_event_code_included=${hasTestEventCode}`;

  try {
    const res = await timedFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const resText = await res.text().catch(() => "(unreadable response body)");
    if (!res.ok) {
      // Meta's error body is JSON: { error: { message, type, code,
      // fbtrace_id, ... } }. Parse for the fields that actually explain
      // the rejection; fall back to the raw text if it isn't JSON (e.g. an
      // upstream proxy/edge error page instead of a Graph API response).
      let message: string | undefined;
      let fbtraceId: string | undefined;
      try {
        const parsed = JSON.parse(resText);
        message = parsed?.error?.message;
        fbtraceId = parsed?.error?.fbtrace_id;
      } catch {
        // Not JSON -- resText alone is logged below.
      }
      console.error(
        `[metaCapi] POST /events failed: status=${res.status}` +
          (message ? ` message=${JSON.stringify(message)}` : "") +
          (fbtraceId ? ` fbtrace_id=${fbtraceId}` : "") +
          ` ${logContext} body=${resText}`
      );
      return;
    }
    console.log(`[metaCapi] Purchase event sent: status=${res.status} ${logContext} body=${resText}`);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("[metaCapi] POST /events timed out after 5s");
    } else {
      console.error("[metaCapi] POST /events network error:", err);
    }
  }
}
