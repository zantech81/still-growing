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
// The header names, event-type source, and payload field paths below were
// wrong in the original version of this route (built from Systeme.io's
// public help articles plus a third-party integration guide, not their
// official developer reference, which was blocked by robots.txt at the
// time). Confirmed and corrected 2026-08-21 against two real rejected
// deliveries (order ids 12462465, 12462602) pulled from Systeme.io's own
// webhook delivery log -- ground truth, not docs. The full raw event is
// still always stored in `raw_payload` regardless of whether the
// typed-column extraction below is right, so nothing is lost if a field
// path turns out wrong again later.

export const runtime = "nodejs"; // needs Node's crypto + raw request body

type SystemeWebhookPayload = {
  customer?: { email?: string };
  order?: { id?: number | string; totalPrice?: number };
  pricePlan?: { currency?: string; name?: string; innerName?: string };
  orderItem?: { resources?: Array<{ tag?: { name?: string } }> };
  funnelStep?: { funnel?: { name?: string } };
};

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
  // Real header, confirmed against captured traffic -- NOT x-systeme-signature.
  const signature = request.headers.get("x-webhook-signature");

  if (!verifySignature(rawBody, signature, secret)) {
    console.warn("[webhooks/systeme] Signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: SystemeWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Real payloads carry no "type" field in the body at all -- the event
  // kind comes from this header instead (e.g. "SALE_NEW").
  const eventType = request.headers.get("x-webhook-event") ?? "";
  const rawType = eventType.toLowerCase();
  const isRefund = rawType.includes("refund") || rawType.includes("cancel");
  const isSale = rawType.includes("sale") && !isRefund;

  if (!isSale && !isRefund) {
    // Not a sale/refund event -- e.g. contact/tag/opt-in events, if this
    // webhook is ever scoped more broadly than just sales+refunds.
    // Acknowledge with 200 so systeme.io doesn't treat it as a failure
    // and keep retrying.
    return NextResponse.json({ ok: true, ignored: true, type: eventType || null });
  }

  // Real payload shape has these fields at the root, no "data" wrapper.
  const email: string | null = payload.customer?.email ?? null;
  const orderId: string | null = payload.order?.id != null ? String(payload.order.id) : null;
  // The amount actually charged, post-discount, in cents (matches
  // pricePlan.amount's unit) -- not pricePlan.amount itself, which is the
  // undiscounted list price.
  const amount: number | null = payload.order?.totalPrice ?? null;
  const currency: string | null = payload.pricePlan?.currency ?? null;
  const productName: string | null = payload.pricePlan?.name ?? payload.pricePlan?.innerName ?? null;
  // Which funnel/offer this came from (e.g. "llfab-book-buyer" vs.
  // "llfab-gift-buyer"), so a gift-funnel purchase is distinguishable from
  // a main-funnel one -- see 0046_purchases_product_tag.sql.
  const productTag: string | null =
    payload.orderItem?.resources?.[0]?.tag?.name ?? payload.funnelStep?.funnel?.name ?? null;

  if (!orderId) {
    console.warn(`[webhooks/systeme] No order id found in "${rawType}" payload, inserting without dedup`);
  }

  const supabase = createAdminClient();

  const row = {
    systeme_order_id: orderId,
    email,
    product_name: productName,
    product_tag: productTag,
    amount,
    currency,
    event_type: eventType || "unknown",
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
