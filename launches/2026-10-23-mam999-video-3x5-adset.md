# Launch: MAM ₹999, video ad set (3 videos), 23 Oct 2026

## Ad set (published 23 Oct, ACTIVE)
- **ID:** 120251789541060062, `AS3 | VIDEO-3 | IN 18-65 | Adv+ Aud | FB+IG | ABO 600 | 23 Oct`
- **Campaign:** DS | Meta Ads with AI Mastery | 999 | 22 Oct (120251754141830062)
- **Budget:** ₹600/day, highest volume (no cap)
- **Goal:** Purchase, DS pixel 661515593233055
- **Audience and placements:** same as AS2 (India, Advantage+ audience 18–65, FB + IG placements)

## Ads: built as 3 videos × copies P1–P5 = 15 ads
- Every ad has the Learn More button, the Instagram account, and Advantage+ creative enhancements off. Copies P1–P5 are the same as in AS2.
- **Why 15 ads:** one ad with all 5 texts (asset_feed_spec) was rejected by Meta's draft API ("link field required"), so each text became its own ad.

| Video (Media Library) | Video ID | Code | Thumbnail hash |
|---|---|---|---|
| amam 999 ad video 1 student testimonial.mp4 (58s) | 1758854175403051 | V01 StudentTestimonial | 205bedf6d210b873bdaed2116879907f |
| morning-phone-hookC-9x16.mp4 (46s) | 1113824211388101 | V02 MorningPhone | 30cf865d3a0eab73d75fa377d3e8dc9d |
| lead-mausam-hookB-9x16.mp4 (57s) | 1426287102355919 | V03 LeadMausam | bddad9a519e180bcb3e7530224af6fbd |

| Ad | Ad ID | Creative ID | Status |
|---|---|---|---|
| MAM-V01-P1 | 120251789620400062 | 1099057089422266 | ACTIVE |
| MAM-V01-P2 | 120251789621970062 | 1147453951120796 | paused |
| MAM-V01-P3 | 120251789623020062 | 1866392571465497 | paused |
| MAM-V01-P4 | 120251789623870062 | 1104229192313519 | paused |
| MAM-V01-P5 | 120251789624220062 | 1784921792834297 | paused |
| MAM-V02-P1 | 120251789637910062 | 1488696123114691 | ACTIVE |
| MAM-V02-P2 | 120251789639250062 | 1114102861022743 | paused |
| MAM-V02-P3 | 120251789641030062 | 1503932264853167 | paused |
| MAM-V02-P4 | 120251789642520062 | 1918241049542741 | paused |
| MAM-V02-P5 | 120251789644080062 | 1446961544267327 | paused |
| MAM-V03-P1 | 120251789657470062 | 1105636455344611 | ACTIVE |
| MAM-V03-P2 | 120251789658410062 | 2128634528039505 | paused |
| MAM-V03-P3 | 120251789658640062 | 1522906952980063 | paused |
| MAM-V03-P4 | 120251789659530062 | 1801208087764342 | paused |
| MAM-V03-P5 | 120251789660480062 | 1641003544435485 | paused |

- **UTMs:** `utm_source={{site_source_name}}&utm_medium=paid&utm_campaign=MAM999_22Oct&utm_term=AS3_VIDEO3_23Oct&utm_content=MAM-V0x-Px_<video>`

## Change (23 Oct): down to 3 ads, one per video
- **Owner's call:** keep one ad per video, so the test is video vs video.
- **Still ACTIVE (P1 "Boost button" copy):** MAM-V01-P1, MAM-V02-P1, MAM-V03-P1.
- **PAUSED:** P2–P5 on all 3 videos (12 ads). They stay in the ad set, so they can be switched back on to test copy later.

## Notes
- **Two broken test drafts are left in Ads Manager drafts, never published:**
  - "DISCARD | broken draft | MAM-V01 test" (120251789552750062)
  - "DISCARD | broken draft 2 | thumb conflict" (120251789587370062)
  - Discard them in Ads Manager → Review and publish.
- **Thumbnails** are Meta's auto-generated 160px frames.
- **AI disclosure** is not set on the video creatives (owner to decide).
- **First result, 23–25 Oct (GHL real sales):** 1 sale from MAM-V01-P1 (Student testimonial). See reports/2026-10-25-mam999-real-sales-23-25oct.md.
