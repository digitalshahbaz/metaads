# Tracking gap diagnosis: MAM ₹999 (23–25 Oct 2026)

**Problem:** Meta credits the campaign with **20 purchases**, but GHL shows **10 paid ₹999 orders** (plus 5 × ₹199 e-book).

**Data checked:**
- Pixel 661515593233055: browser vs server Purchase, hour by hour (Meta dataset stats).
- Pixel event rules (Event Setup Tool).
- Event match quality.
- GHL transactions and each buyer's contact attribution.
- GHL workflow list. Workflow contents could not be read: the GHL workflow API is not enabled for this sub-account.

## Pixel Purchase events vs real orders (23 Oct 00:00 – 25 Oct 23:59 IST)
| | Count |
|---|---|
| Real paid orders, all products (10 × ₹999 + 5 × ₹199) | 15 |
| Browser Purchase events | **23** (+8) |
| Server (CAPI) Purchase events | **37** (+22, about 2.5×) |
| Meta-attributed purchases in the ₹999 campaign | 20 (2× real ₹999 orders) |

## Gap 1: the server sends Purchase twice for every order (main cause)
Almost every paid order shows **1 browser + 2 server** Purchase events in the same hour. Times are PT; IST is PT + 12:30.

| Hour (PT) | Orders | Browser | Server |
|---|---|---|---|
| 23 Oct 02:00 | Harshal | 1 | 2 |
| 23 Oct 03:00 | e-book | 1 | 2 |
| 23 Oct 06:00 | Sijo | 1 | 2 |
| 24 Oct 05:00 | Lalit | 1 | 2 |
| 24 Oct 09:00 | Ankur | 1 | 2 |
| 24 Oct 20:00 | e-book | 1 | 2 |
| 25 Oct 01:00 | Khalid | 1 | 2 |
| 25 Oct 02:00 | Harsh + e-book | 2 | 4 |

Two separate server-side senders are firing Purchase for the same order. They are most likely:
1. GHL's native funnel Conversions API (funnel / Events tab). It also sends the custom `OrderFormPurchase` event, which appears in this dataset.
2. A GHL workflow "Meta Conversion API" action, e.g. in **"Meta Ads With Ai Mastery 999/-"** (created 21 Oct) or **"MTP - UTM TO CRM"** (edited 25 Oct).

Meta merges a browser and a server event only when they share the same `event_id`. One server copy merges with the browser event; the second has a different (or no) `event_id`, so Meta counts **two purchases per sale**. That matches 20 vs 10 almost exactly.

This is a regression: in the 22–28 Sep audit, server ≈ browser and Meta credited 86% of real orders.

## Gap 2: "Purchase" fires on thank-you page loads with no payment
- **Purchase events with no GHL transaction in that hour:**
  - 24 Oct 03:00 PT: 1 browser + 1 server.
  - 25 Oct 04:00 PT: 2 browser + 2 server.
  - 25 Oct 09:00 PT: **5 browser + 7 server**, against 1 real order (Namit).
- **Why:** the browser Purchase is an Event Setup Tool URL rule ("page = /meta-ads-mastery-ty-page"). It fires on every load of that page: refreshes, revisits, someone sharing the link, internal tests.
- **Server events also appear with no order**, so a workflow is probably also triggered by something other than "payment received" (e.g. a tag added or contact updated). The 25 Oct 09:00 burst lines up with Namit's contact being re-tagged.

## Gap 3: every product sends the same "Purchase" event
- **Active Purchase URL rules:**
  - /meta-ads-mastery-ty-page (₹999)
  - /ebook-ty-page (₹199)
  - /ty-page-ai-marketing (₹99 workshop)
  - /thank-you-page
  - aiadskill.com/step/thank-you-mapm/
- The ₹999 campaign optimises for "Purchase", so a ₹199 e-book buyer who saw a ₹999 ad counts as a ₹999 win. Meta learns to find **cheap buyers**.
- Only the /thank-you-page rule sends a `value`. The others send no value, so Meta's ROAS / value numbers are unreliable.

## Gap 4: lost UTMs on returning buyers (GHL side)
- 5 of the 10 real buyers have no UTM. They were earlier leads or customers who came back straight to /meta-ads-mastery-checkout-page.
- 3 of them still had a fresh Facebook click ID (`fbc`), so a Meta ad brought them back, but GHL can't say which one.
- Ad Set 1 links use raw `|` and spaces in UTMs, so one buyer's `utm_campaign` was cut to "DS".

## Gap 5: attribution window
Ad Set 1 uses 7-day click + **1-day view**. It gets credit for buyers who only saw an ad. The new ad sets use 7-day click only.

## Fine
- **Purchase match quality:** 8.2/10 (email 78%, phone 78%, fbc 94%).
- **Pending payments:** no events fired at the moments orders went pending. The September problem of Purchase firing on pending orders is not seen this week.

## Fix list (priority order)
1. **Keep ONE server Purchase sender.**
   - In GHL, open workflows "Meta Ads With Ai Mastery 999/-", "MTP - UTM TO CRM" and "Claude E-book Funnel - 199".
   - Remove any "Meta Conversion API → Purchase" action, or turn off the funnel's native CAPI Purchase. Keep only one.
2. **Make sure browser and server Purchase share the same `event_id`** (the order or transaction id). Then confirm in Events Manager → Purchase → Deduplication.
3. **Stop thank-you URL rules from firing Purchase.** Delete the Event Setup Tool Purchase rules and fire Purchase only from GHL's payment-success event (with value + currency). Or at least keep a single rule per product with `value`.
4. **Give each product its own event:**
   - ₹999 bundle → `Purchase`
   - ₹199 e-book → custom `Purchase_Ebook` (or a custom conversion on value = 199)
   - ₹99 workshop → `Purchase_Workshop`
   - Then point the ₹999 campaign at a custom conversion for the ₹999 product only.
5. **URL-encode UTMs** in Ad Set 1 and keep using the dynamic `{{ad.name}}` codes.
6. **Weekly check:** GHL paid orders vs Meta purchases. More than 15% apart means investigate.
