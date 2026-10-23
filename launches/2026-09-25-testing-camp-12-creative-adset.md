# Launch plan: Testing Camp, 12-creative ad set (25 Sep 2026)

## Ad set (created, PAUSED)
- **ID:** 120251289956630062, "Broad_India_ABO1500_12Creative_25Sep"
- **Campaign:** AMAB999_Testing Camp (120251244057720062). ABO, so the budget sits on the ad set.
- **Budget:** ₹1,500/day, lowest cost (no cap)
- **Optimisation:** Purchase, pixel 661515593233055. Attribution: 7-day click / 1-day view.
- **Audience:** India, 18–65, Advantage+ audience, no interests
- **Placements:** Facebook + Instagram only. That leaves out WhatsApp marketing messages and Audience Network, which wasted spend in the 20-creative ad set.
- [Open in Ads Manager](https://www.facebook.com/adsmanager/manage/adsets/edit?act=237212394898837&selected_adset_ids=120251289956630062)

## Ads (waiting for the owner to upload 12 creatives)
Settings for every ad:
- **Page:** Digital Shahbaz (109659681838816), with the Instagram account attached
- **Link:** https://digitalshahbaz.in/amab-3-page
- **URL parameters:** `utm_source={{site_source_name}}&utm_medium=paid&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}`
- **CTA:** "Get Access" (owner's choice). Falls back to Learn More if the API doesn't accept Get Access.
- **AI disclosure:** OPT_IN (owner confirmed the creatives use AI)
- **Advantage+ creative enhancements:** off

Copy rotation: each primary text is used on 2–3 ads, so the test compares creatives and copy angles side by side.

| Ad # | Primary text | Headline | Description |
|---|---|---|---|
| 1 | PT1 Short & direct | H1 Run Your Meta Ads With Claude AI | D1 First 300 members only |
| 2 | PT2 Pain-first story | H2 AI Meta Ads Bundle — Just ₹999 | D5 ₹30Cr+ ad spend managed |
| 3 | PT3 Value stack | H3 ₹50,991 Value. Founding Price ₹999 | D3 Regular price ₹4,999 |
| 4 | PT4 Contrarian | H4 Create, Launch & Scale Ads With AI | D1 First 300 members only |
| 5 | PT5 Identity | H5 Meta Ads + Claude AI, in Hindi | D2 Full Hindi course + AI kit + community |
| 6 | PT1 | H2 | D4 12-month Meta Ads Circle included |
| 7 | PT2 | H1 | D1 |
| 8 | PT3 | H3 | D2 |
| 9 | PT4 | H4 | D5 |
| 10 | PT5 | H5 | D4 |
| 11 | PT1 | H1 | D3 |
| 12 | PT2 | H2 | D1 |

Pairing of creative to copy is decided once the 12 files are in: the story copy (PT2) goes with talking-head videos, the value-stack copy (PT3) goes with offer/stack graphics.

## Budget note
- ₹1,500 across 12 ads is about ₹125 per ad per day, below the ₹300–500 per creative the playbook recommends.
- Expect Meta to push most of the spend to 2–4 ads within 48 hours.
- Judge on 3-day windows. Don't edit ads once they're live.

## Built (25 Sep): 11 ads, all PAUSED
Only 11 images were uploaded ("ChatGPT Image Sep 25, 2026, 10_09_*.png"), so there are 11 ads, not 12.
- **CTA is Learn More.** The API rejected GET_ACCESS; that button isn't available on the Marketing API.
- **AI disclosure:** OPT_IN
- **Links:** carry UTMs, `utm_content` = ad name
- **Instagram:** the connector returned no linked IG account, so the creatives have no instagram_user_id. Set the Instagram identity in Ads Manager before activating.

| Ad | Ad ID | Creative ID | Image | Primary text | Headline | Description |
|---|---|---|---|---|---|---|
| T25_01_Fire_Your_Agency | 120251290049700062 | 1510977854203429 | 10_09_19 | PT5 | H1 | D5 |
| T25_02_Master_Claude_ChatGPT_Flow | 120251290050260062 | 1651149539860920 | 10_09_22 | PT3 | H3 | D2 |
| T25_03_What_If_Claude | 120251290050460062 | 1061363940290891 | 10_09_23 | PT1 | H1 | D1 |
| T25_04_Manual_Already_Behind | 120251290050740062 | 1072460135674272 | 10_09_28 | PT4 | H4 | D3 |
| T25_05_Launch_In_One_Day | 120251290051040062 | 1751188916098343 | 10_09_31 | PT3 | H2 | D1 |
| T25_06_Stop_Guessing_Claude | 120251290051730062 | 1466010135395411 | 10_09_30 | PT1 | H4 | D4 |
| T25_07_Run_Ads_With_Claude | 120251290053830062 | 1396444426012217 | 10_09_17 | PT2 | H1 | D5 |
| T25_08_Master_Claude_Meta | 120251290054420062 | 1978916726108108 | 10_09_20 | PT5 | H5 | D2 |
| T25_09_Whats_Your_CPL | 120251290054990062 | 1099830315833843 | 10_09_25 | PT2 | H2 | D3 |
| T25_10_Read_Before_Next_1000 | 120251290055650062 | 1758156225421609 | 10_09_26 | PT2 | H3 | D1 |
| T25_11_Create_Launch_Scale | 120251290056370062 | 1450040960551537 | 10_09_15 | PT4 | H4 | D4 |
