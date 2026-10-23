# Learnings — Digital Shahbaz (act 237212394898837)

Running notes on what's been proven in this account. Newest first.

## 2026-09-24: Kairoas reconciliation (SOURCE OF TRUTH)
- Kairoas sub-account `KNQpK3JEkYYjX10w7A8W` holds the real orders. Bundle funnels:
  - "AI Meta Ads Training & System" (`/checkout-page`): old funnel.
  - "AI Meta Ads Bundle 1" (`/checkout2`): new funnel, from 22 Aug.
- **Correction:** the old funnel's pixel over-fired. 18 Aug was 26 Meta purchases vs 1 real sale. Real Phase A: 45 sales at ₹951 each, not ₹476 or ₹659. New-funnel era: 108 real sales at ₹893. **The New LP didn't hurt sales.** Stop citing "Phase A ₹659".
- From 22 Aug, Meta purchases ≈ real orders. The last 6 days (19–24 Sep) are the best: 34 real sales at ₹742 each.
- UTMs: utm_source and utm_content (the ad name) are captured, but utm_campaign is never set. Ads launched from 19 Sep mostly have no UTMs (17 of 34 sales are Meta clicks with no UTM).
- Real cost per sale by ad:
  - Best: V-1 (₹900), Ads_Campaign_Structure (~₹934), AiVid 2 (~₹1,030)
  - Worst: Ad-5 ₹999 Complete (₹4,561), V-2 (~₹2,300)
- About 45% of people who reach the bundle order form don't pay (123 unpaid vs 153 paid).

## 2026-09-24 — AMAB999_Sales_20Creative_ABO review (19–24 Sep)
- Lifetime ₹10,250 → 14 purchases (₹732 each, ROAS 1.36). The first 2 days did most of the work: 8 purchases at ₹415. The last 3 closed days (21–23 Sep) got 5 at ₹1,144, ROAS ~0.87. It's fading after a strong start. Don't scale.
- Meta put 71% of spend on one ad (Ads_Campaign_Structure). Its CTR fell from 6.0% to 3.0% in 5 days even though frequency stayed around 1.1–1.2. That means Meta is reaching colder people, not showing the same people the ad too often.
- 4 small ads (Only_300_Founding, Generated_15_Sales, Looks_Huge_AI, Gave_11_Sales) got 5 purchases on ₹1,927 (₹385 each) with 6.3% LPV→checkout. The main ad gets 3.4%. They need their own ad set to get a fair budget.
- Facebook feed took ₹2,184 (21%) at ₹1,040 CPM for **0 checkouts**. WhatsApp marketing messages took ₹503 for 0 LPVs. Instagram feed: ₹3,539 → 8 purchases (ROAS 2.26). WhatsApp status: ₹635 → 2 (ROAS 3.15).
- Buyers: men 35–44 (7 purchases, ROAS 2.43) and men 25–34 (5, ROAS 1.67). Women, men 18–24 and 55+: ₹2.5k spend, 0 purchases.

## 2026-09-24 — first deep dive (1 Aug – 23 Sep)

### Business facts (from owner)
- Main funnel: **AI Meta Ads Bundle at ₹999**, live since 1 Aug 2026. Active landing page: `https://digitalshahbaz.in/amab-3-page`.
- ChatGPT Ads Blueprint (free, then ₹199) and the free Meta Ads Masterclass were tested in the same period. **Both are paused.** The ₹999 bundle is the only live funnel.

### Measurement
- **18 Aug 2026:** 26 purchases on 1 checkout started and 31 LPVs. The ads didn't drive these (likely a broadcast, or the purchase event firing twice). Remove about 25 purchases (₹24,975) from any August analysis. Affected ads: MTP02 (14), Ad-2 (7), Ad-3 (2).
- Checkout → purchase is steady at about 67–68%. If it moves, look at checkout or payment. If LPV → checkout moves, look at the landing page.
- The API doesn't return video ads' destination URLs. Get the landing page per campaign from the owner.
- Ad-level queries leave out ARCHIVED ads. Always reconcile ad sums against ad-set totals and query archived ads separately.

### What works
- Best ad ever: **MTP02 "most practical"**. Adjusted ₹659/purchase, ROAS 1.72 on ₹24k.
- Best live ad: **AiVid 2 – Meta Board Multiple People**. ₹590/purchase, cheap CPM (₹165), but frequency is about 8.
- Practical "how I actually do it" hooks beat value-stack, "launch" and income-claim hooks.
- Buyers are **men 25–54**. Men 35–44 have the best ROAS.

### What doesn't
- Value-stack statics (₹1.5k → 1 purchase). "Launch" ads (₹2,282/purchase). Income-claim video "Bhai 5 naye client" (0 purchases on ₹1.7k).
- ₹99 and ₹199 tripwires with no upsell: ROAS 0.17–0.41.
- Retargeting optimised for landing page views: 913 LPVs, 0 checkouts.
- High-CTR curiosity hooks (8–9% CTR) that don't lead to checkouts.

### Mistakes to avoid repeating
- Pausing winning campaigns (Training 02/08, AMTP 6 Aug, 08 Aug, 12 Aug) to relaunch in new campaigns.
- Archiving a working ad (V-1, 20 purchases) and running a copy (1 purchase).
- 20 creatives in a ₹2,000/day ad set. The floor is ₹300–500 per creative per day.

### Open questions for owner
- What happened on 18 Aug? What does Razorpay show for 22 Aug–23 Sep?
- Old landing page URL vs amab-3-page. What changed on the page around 22–24 Aug?
- GST-inclusive price? Back-end offer after ₹999? Target cost per purchase and daily sales goal?
