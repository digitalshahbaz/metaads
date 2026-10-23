# ₹999 funnel: where do Purchase events come from? (22–28 Sep 2026)

**Sources:**
- Pixel 661515593233055, Purchase events split into browser-only and server-only (Meta dataset stats, 21 Sep 22:23 → 28 Sep 22:23 PT).
- GHL/Kairoas payment transactions for the same week (63 transactions).

Real paid orders and pixel events were matched hour by hour.

## Headline numbers
| Source | Count |
|---|---|
| Real paid orders in GHL (all products; bundle = 33) | 36 in the pixel window |
| **Browser Purchase events (pixel)** | **37** (≈35 from digitalshahbaz.in) |
| **Server Purchase events (CAPI)** | **43** (≈40 from digitalshahbaz.in) |
| Purchase events from **mex.academy** (another site on this pixel) | ≈4–5 |
| Purchases Meta attributed to ads (Ads Manager, 22–28 Sep) | 31 |
| Pending / failed payment attempts in GHL | 26 (25 people, **16 never paid, about ₹19k lost**) |

## Findings
1. **Both browser and server fire on every sale.** Hour by hour, almost every paid order shows exactly 1 browser + 1 server Purchase. The setup is pixel + CAPI, as it should be.
2. **Deduplication looks like it's working.** Meta credited ads with 31 purchases against 36 real paid orders (86%). If the browser and server copies weren't being merged, Meta would have up to about 80 events to credit. **This week's Meta purchase numbers are close to reality**, unlike August (26 in Meta against 1 real sale).
3. **The server fires about 4–5 more than real sales.**
   - Extra server-only events at 22 Sep 09h, 23 Sep 20h, 24 Sep 07h (+2), 25 Sep 21h and 27 Sep 04h (PT) have no matching paid order.
   - Several come just after a **pending** payment attempt (24 Sep 06h → 07h; 27 Sep 03h → 04h).
   - Likely cause: a GHL workflow or integration sends the CAPI Purchase on order-form submit or on a payment *attempt*, not only on payment *success*. Some could also be the ₹2,498 bump orders sending a second event.
4. **The browser misses about 2–3 sales** (23 Sep 11h, 28 Sep 11h, and one on 24 Sep). The buyer most likely closed the tab before the thank-you page loaded. The server copy covers these, which is why server > browser.
5. **mex.academy sends Purchase events into this pixel** (about 4–5 this week). Those are another business's sales training the ₹999 campaigns.
6. **The biggest money leak isn't tracking, it's checkout.**
   - 26 payment attempts stayed pending. 9 of those people paid later; **16 never paid** (about ₹19k at ₹999–2,498).
   - That's roughly 1 in 3 people who tried to pay.

## Fixes (priority order)
1. **Recover the 16 unpaid people now, and automate it:**
   - A GHL workflow on "transaction pending/failed" that sends a WhatsApp and an email within 15 minutes, again after 24 hours, with the direct payment link.
   - Expected result: 20–30% of them come back, about 3–5 extra sales a week.
2. **Fire the CAPI Purchase only on payment success.**
   - In GHL, find which workflow or integration sends the Meta "Purchase" and trigger it on *Payment Received / Order status = paid*, not "Order submitted".
   - Use the transaction/order ID as the `event_id` in both the browser and the server event.
3. **Block mex.academy.** Events Manager → pixel settings → Traffic permissions → allow list: digitalshahbaz.in, link.digitalshahbaz.in.
4. **Confirm deduplication** in Events Manager → Purchase → Event deduplication. Expect about 100% overlap between browser and server.
5. **Weekly check:** compare real GHL paid orders with Meta purchases every Monday. Anything more than 10–15% apart points to a tracking change.
