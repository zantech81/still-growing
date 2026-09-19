import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMetaPurchaseEvent } from "@/lib/metaCapi";
import { revokeAccessForRefund, describeRevocationOutcome } from "@/lib/refunds";
import {
  sendEmail,
  getEmailTemplate,
  renderEmailSubject,
  refundNotificationEmailHtml,
  refundNotificationEmailText,
} from "@/lib/sendgrid";

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

// Same address and reasoning as app/api/cron/unlock-alert/route.ts's
// ALERT_RECIPIENT: no "send alerts to the admin" convention/env var exists
// in this project, and this is the same real inbox that already gets
// unlock-cluster alerts.
const ADMIN_ALERT_RECIPIENT = "admin@stillgrowing.co";

type SystemeWebhookPayload = {
  customer?: { email?: string };
  order?: { id?: number | string; totalPrice?: number };
  pricePlan?: { id?: number | string; currency?: string; name?: string; innerName?: string };
  orderItem?: { id?: number | string; resources?: Array<{ tag?: { name?: string } }> };
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

  // Meta's event_id must be unique per Purchase event, not per order: an
  // order with a bump fires one SALE_NEW webhook per line item, all
  // sharing the same order.id (confirmed 2026-09-19, order 12702840 --
  // book + $3.99 bump). orderItem.id is the per-line-item id; pricePlan.id
  // is the fallback should orderItem.id ever also collide; plain orderId
  // is the last resort when neither is present (matches the single-item,
  // no-bump case this app has always had). See lib/metaCapi.ts's
  // MetaPurchaseEvent.eventId for how this is used.
  const orderItemId: string | null = payload.orderItem?.id != null ? String(payload.orderItem.id) : null;
  const pricePlanId: string | null = payload.pricePlan?.id != null ? String(payload.pricePlan.id) : null;
  const metaEventId: string | null = orderId
    ? orderItemId
      ? `${orderId}-${orderItemId}`
      : pricePlanId
        ? `${orderId}-${pricePlanId}`
        : orderId
    : null;

  if (!orderId) {
    console.warn(`[webhooks/systeme] No order id found in "${rawType}" payload, inserting without dedup`);
  }

  const supabase = createAdminClient();

  if (isRefund) {
    // Targeted update, not a full-row upsert: unlike "New sale" (confirmed
    // against real captured deliveries, 2026-08-21), "Sale cancelled"'s
    // payload shape has never been verified against a real event, and may
    // well carry fewer fields. Upserting the WHOLE row here would silently
    // null out product_name/product_tag/amount/currency that the original
    // sale event already recorded correctly. Only status/refunded_at
    // change on the existing row.
    let matchedExisting = false;
    if (orderId) {
      const { data: updated, error: updateError } = await supabase
        .from("purchases")
        .update({ status: "refunded", refunded_at: new Date().toISOString(), event_type: eventType || "unknown" })
        .eq("systeme_order_id", orderId)
        .select("id");

      if (updateError) {
        console.error("[webhooks/systeme] Refund update failed:", updateError);
        return NextResponse.json({ error: "Write failed" }, { status: 500 });
      }
      matchedExisting = (updated?.length ?? 0) > 0;
    }

    if (!matchedExisting) {
      // No prior "New sale" row to update against -- out-of-order
      // delivery, or the original sale event was missed. Insert what we
      // have so the refund is still recorded somewhere rather than
      // silently dropped.
      console.warn(
        `[webhooks/systeme] No existing purchase row for order ${orderId ?? "(none)"} on refund, inserting standalone row`
      );
      const { error: insertError } = await supabase.from("purchases").insert({
        systeme_order_id: orderId,
        email,
        product_name: productName,
        product_tag: productTag,
        amount,
        currency,
        event_type: eventType || "unknown",
        status: "refunded",
        raw_payload: payload,
        refunded_at: new Date().toISOString(),
      });
      if (insertError) {
        console.error("[webhooks/systeme] Refund insert failed:", insertError);
        return NextResponse.json({ error: "Write failed" }, { status: 500 });
      }
    }

    // 7-day money-back guarantee (2026-09-15): stop future access, don't
    // touch anything already read/watched -- see lib/refunds.ts.
    const outcome = await revokeAccessForRefund(email, productTag);
    const revocationStatus = describeRevocationOutcome(outcome);
    console.log(`[webhooks/systeme] Refund revocation for order ${orderId ?? "(none)"}: ${outcome.kind}`);

    // Admin-email backstop, sent regardless of whether the automatic
    // revocation above actually succeeded -- gift purchases in particular
    // are never auto-revoked (see lib/refunds.ts), so the admin needs to
    // see every refund either way.
    try {
      const fields = await getEmailTemplate("refund_notification");
      const vars = {
        email: email ?? "(no email on order)",
        productName: productName ?? "(unknown product)",
        orderId: orderId ?? "(none)",
        amountFormatted:
          amount != null && currency ? `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}` : "(unknown amount)",
        revocationStatus,
      };
      const bookId = outcome.kind === "revoked" ? outcome.bookId : null;
      await sendEmail({
        to: ADMIN_ALERT_RECIPIENT,
        subject: renderEmailSubject(fields, vars),
        html: refundNotificationEmailHtml(fields, vars, bookId),
        text: refundNotificationEmailText(fields, vars, bookId),
      });
    } catch (err) {
      console.error("[webhooks/systeme] Refund notification email failed:", err);
    }

    return NextResponse.json({ ok: true, revocation: outcome.kind });
  }

  // isSale path
  const { error } = orderId
    ? await supabase.from("purchases").upsert(
        {
          systeme_order_id: orderId,
          email,
          product_name: productName,
          product_tag: productTag,
          amount,
          currency,
          event_type: eventType || "unknown",
          status: "completed",
          raw_payload: payload,
        },
        { onConflict: "systeme_order_id" }
      )
    : await supabase.from("purchases").insert({
        systeme_order_id: orderId,
        email,
        product_name: productName,
        product_tag: productTag,
        amount,
        currency,
        event_type: eventType || "unknown",
        status: "completed",
        raw_payload: payload,
      });

  if (error) {
    console.error("[webhooks/systeme] Write failed:", error);
    return NextResponse.json({ error: "Write failed" }, { status: 500 });
  }

  // Purchase funnel-tracking event -- see lib/metaCapi.ts. amount/currency
  // here are the same verified order.totalPrice/pricePlan.currency values
  // just written to `purchases` above, not a separate parse.
  if (amount != null && currency) {
    await sendMetaPurchaseEvent({ email, eventId: metaEventId, orderId, amountCents: amount, currency });
  }

  return NextResponse.json({ ok: true });
}
