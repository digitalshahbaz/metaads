# Real sales vs Meta: Kairoas (GHL) reconciliation, 1 Aug to 24 Sep 2026

**Sources:**
- Kairoas sub-account "Digital Shahbaz" (`KNQpK3JEkYYjX10w7A8W`): 393 orders and 129 buyer contacts, read-only.
- Meta ad account 237212394898837: daily purchases.
- Today (24 Sep) is a part day.

## 1. Orders (1 Aug – 24 Sep)
| | Count |
|---|---|
| All orders | 393 (252 paid, 141 unpaid/pending) |
| **Paid ₹999 bundle orders** | **152 + 1 at ₹2,498 = 153** |
| Unpaid ₹999/₹2,498 bundle orders (checkout started, not paid) | 123 |
| Paid "Old Student Upgrade" (₹0, mex.academy/upgrade) | 77. Not ad sales. |
| Paid ChatGPT Blueprint ₹199 | 15 |

Bundle funnels:
- **"AI Meta Ads Training & System"** (`/checkout-page`): 58 paid, 2 Aug – 22 Sep. This is the old funnel.
- **"AI Meta Ads Bundle 1"** (`/checkout2`): 95 paid, 22 Aug onward. This is the new funnel.

Revenue: about ₹1,54,346 gross on about ₹1,39,231 bundle ad spend. That's a **true ROAS of about 1.11 gross**, or about 0.94 if ₹999 includes GST. Overall cost per real sale is ₹910. This is the best case, because it assumes every sale came from ads.

## 2. Meta vs real, by period
| Period | Meta purchases | Real paid orders | Bundle ad spend | Real cost per sale |
|---|---|---|---|---|
| 2–21 Aug (old funnel) | 76 | **45** | ₹42,805 | **₹951** |
| 22 Aug – 24 Sep (new funnel era) | 119 (incl. ~9 ChatGPT ₹199) | **108** | ≈₹96,426 | **₹893** |
| 17–23 Sep | 27 (incl. 3 ChatGPT) | **30** | ₹23,666 | **₹789** |
| **19–24 Sep** | 29 | **34** | ≈₹25,229 | **₹742** |
| 24 Sep (part day) | 5 | **6** | ₹4,194 | ₹699 |

- **18 Aug: Meta counted 26 purchases, but there was 1 real order.** The purchase event fired over and over on the old funnel. It wasn't a broadcast.
- The old funnel over-reported on other days too (3 Aug: 6 vs 3; 15 Aug: 4 vs 2).
- **From 22 Aug onward Meta and real sales match closely.** The new funnel's tracking is reliable.
- **Correction to the earlier audit:** "Phase A was ₹659 per sale, the New LP broke the funnel" was wrong. With real orders, the old funnel cost ₹951 per sale and the new funnel ₹893. **The new page didn't hurt sales; the old pixel inflated August.** The last 6 days (₹742 per sale) are the best stretch since 1 Aug.

## 3. Attribution of the 153 paid buyers
| Source | Buyers |
|---|---|
| UTM-tagged (utm_content = ad name) | 100 |
| Meta click ID (fbclid) but **no UTMs** | 16 |
| No attribution data | 9 |
| Contact existed before Aug (old lead or student; no attribution in this pull) | 28, of which 23 are in 2–21 Aug |

- `utm_source`: ig 54, fb 42, wa 3, facebook 1. Some values have trailing spaces ("ig ", "fb ").
- **`utm_campaign` is empty on every buyer.** It isn't in the URL parameters.
- **Since 19 Sep, 17 of 34 sales have a Meta click ID but no UTMs.** The new ads (20-Creative ABO, Testing Camp) seem to have been created without UTM URL parameters. Ads_Campaign_Structure is the exception.

## 4. Real sales by ad (utm_content), 1 Aug – 24 Sep
| Ad | Real sales (UTM) | Meta purchases | Spend | Real cost per sale |
|---|---|---|---|---|
| V-1 \| 5k spend \| 2nd sept (archived) | **18** | 20 | ₹16,196 | **₹900** |
| MTP02 most practical | 17* | 51 | ₹24,368 | ≥₹1,433* |
| AiVid 2 – Meta Board Multiple People | 10 | 17 (+1 today) | ~₹10,300 | ~₹1,030 |
| Ads_Campaign_Structure | 9 | 9 (+1 today) | ~₹8,400 | ~₹934 |
| MTP02B most practical | 8 | 11 | ₹11,198 | ₹1,400 |
| Ad-2 (08 Aug) | 5 | 15 | ₹6,241 | ₹1,248 |
| V-2 \| Kya aap bhi | 4 | 6 | ~₹9,300 | ~₹2,300 |
| Ad-3 \| Meta Ads \| 24 Aug | 4 | 6 | ₹5,386 | ₹1,347 |
| MTP05 Claude can run | 3 | 4 | ₹2,358 | ₹786 |
| **Ad-5 \| ₹999 – Complete AI Ads \| 4 Sept** | **3** | 11 | ₹13,684 | **₹4,561** |
| link_in_bio (organic) | 4 | – | – | – |
| wa (WhatsApp) | 3 | – | – | – |

*MTP02 ran on the old funnel, where 23 buyers were old contacts with no attribution data. Its true count is somewhere between 17 and about 40.

## 5. Checkout abandonment
- 123 unpaid bundle orders against 153 paid, so **about 45% of people who reach the order form don't pay.**
- 18–24 Sep: 35 paid, 21 unpaid.
- Recovering even a quarter of them adds about 5 sales a week with no extra ad spend.

## 6. Actions
1. **Add URL parameters to every live ad** (ad level → Tracking → URL parameters):
   `utm_source={{site_source_name}}&utm_medium=paid&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}`
2. **Pass UTMs from the landing page to `/checkout2`** so the last touch keeps them. Several buyers had UTMs only on first touch.
3. **Keep Ad-5 "₹999 Complete AI Ads" paused/off.** Real cost per sale is ₹4,561.
4. **Set up an abandoned-checkout workflow in Kairoas:** WhatsApp + email at 15 min, 2 h and 24 h for unpaid bundle orders.
5. **Use Kairoas paid orders as the daily source of truth.** Meta matches closely now, but only Kairoas carries the ad-level truth once UTMs are fixed.
