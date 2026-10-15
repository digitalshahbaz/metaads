# Instagram Starter Pack: Meta Ads Agency

Built with the installed skills (`/ig-reel`, `/ig-carousel`, `/ig-caption`, `/ig-plan`, `social`).
Hook formula numbers refer to `.claude/skills/ig-reel/hooks.json`.

> **Rule from the skills: never fabricate.** Every `{{...}}` is a real number or
> story you have to fill in. Do not post a placeholder or a made-up result.

---

## How the system works

1. **Research** with `/ig-viral`: pick 6-12 accounts (4 in your niche, 4 adjacent, 2-4 big ones for format only).
   Log `account, followers, median views, views, hook` per reel. Rank by **outlier multiple**
   (views ÷ that account's median). Above 3x is a signal. Raw views are not.
2. **Find the pattern.** Note which hook formulas show up most in the top third, and how the top third
   is built (hook length, motion in the first frame, where the ask goes).
3. **Write** with `/ig-reel`: three hooks from different formulas, score them, script the winner, time the beats.
4. **Humanize** with `/ig-human` (strips AI tells like em dashes and filler words), then write the caption with `/ig-caption`.
5. **Post, then audit** with `/ig-audit` after 7 days. Rank by outlier multiple and **sends per reach**, not views.

---

## Reel 1: "Boosting posts"

**Hook options**

| # | Formula | Spoken | On screen |
|---|---|---|---|
| A | #2 Negative Command | "Stop pressing Boost Post. Run it from Ads Manager with one conversion goal instead." | STOP BOOSTING POSTS |
| B | #1 Cost Confession | "{{$ amount}} is what boosting posts cost one client before we switched them over." | {{$X}} WASTED ON BOOST |
| C | #10 If This, Then Watch | "If your boosted posts get likes and no leads, the next 30 seconds fix it." | LIKES BUT NO LEADS? |

**Pick A** unless you have a real number for B. A works without proof.

**Script (about 28s)**
```
[0:00] Stop pressing Boost Post.
[0:02] It optimizes for likes. Likes don't pay your rent.
[0:05] Open Ads Manager. Pick the Leads or Sales objective.
[0:09] Now Meta hunts for people who actually fill the form, not people who tap a heart.
[0:14] Same budget. Different buyer.
[0:17] For one of our clients that went from {{before metric}} to {{after metric}}.
[0:22] Comment BOOST and I'll send the 5-step setup.
[0:25] And stop pressing Boost.
```
**On-screen cards:** STOP BOOSTING POSTS (0:00) · LIKES ≠ LEADS (0:02) · ADS MANAGER → LEADS (0:05) · SAME BUDGET. DIFFERENT BUYER. (0:14) · COMMENT "BOOST" (0:22)

---

## Reel 2: "First ads lose money"

| # | Formula | Spoken | On screen |
|---|---|---|---|
| A | #3 Nobody Tells You | "Nobody tells you your first week of Meta ads is supposed to look bad." | WEEK 1 IS SUPPOSED TO SUCK |
| B | #20 Permission | "You don't need a bigger budget. You need to stop editing your ads every day." | STOP EDITING YOUR ADS |
| C | #16 Verbatim Question | "'Why are my ads not working after 3 days?' I get this every week." | "NOT WORKING AFTER 3 DAYS" |

**Script on A (about 30s)**
```
[0:00] Nobody tells you your first week of Meta ads is supposed to look bad.
[0:03] It's called the learning phase. Meta needs about 50 conversions to figure out who buys.
[0:08] Every time you edit the ad, that clock resets.
[0:11] So people panic on day 3, change the audience, and start over. Again.
[0:16] The fix: set it, leave it for 7 days, then judge it on cost per result.
[0:21] Not on day-one CPM.
[0:24] Save this for the next time you want to touch your ads.
[0:27] Week one is supposed to look bad.
```

---

## Reel 3: "Creative is the targeting"

| # | Formula | Spoken | On screen |
|---|---|---|---|
| A | #22 Contrarian Flip | "Targeting doesn't matter anymore. Your creative is the targeting." | CREATIVE = TARGETING |
| B | #17 Head To Head | "Detailed targeting versus broad. We ran both for {{N}} days and it wasn't close." | DETAILED vs BROAD |
| C | #9 The Steal | "Steal this 3-ad creative test. It's how we find winners in a week." | STEAL THIS TEST |

Use B only with a real test result. C carries saves; put the 3-ad test grid on screen so people can screenshot it.

---

## Carousel: "5 reasons your Meta ads stopped working (#4 is the one nobody checks)"
Formula #11 Numbered With A Favourite · size 1080x1350

1. **Cover:** 5 reasons your Meta ads stopped working. #4 is the one nobody checks.
2. **Creative fatigue.** Frequency above 3 and CTR dropping = the same people are sick of your ad.
3. **You edited during learning.** Every edit resets the 50-conversion clock.
4. **Your offer is the problem, not the ad.** A great ad can't sell a weak offer.
5. **Your pixel is broken.** ← the favourite. If Meta can't see purchases, it can't find buyers. Check Events Manager.
6. **Audience too narrow.** Broad plus strong creative usually beats 12 stacked interests.
7. **Recap slide** (the one people screenshot and send): all 5 in one checklist.
8. **CTA:** Comment AUDIT and I'll send the free checklist.

---

## Captions (first 125 characters are what shows before "...more")

**Reel 1:** `Boost Post optimizes for likes. Your business needs leads. Here's the 30-second switch.`
then: 2-3 short lines of value · `Comment BOOST for the setup.` · 3-5 niche hashtags (#metaads #facebookads #smallbusinessmarketing)

**Carousel:** `Your Meta ads didn't stop working by accident. Swipe to #4, that's the one nobody checks.`

---

## Week plan

| Day | Format | Piece | Goal |
|---|---|---|---|
| Mon | Reel | Reel 1 (Boost Post) | Comments: BOOST |
| Tue | Stories | Poll: "Do you boost posts?" → DM the yeses | DMs |
| Wed | Carousel | 5 reasons ads stopped working | Saves + sends |
| Thu | Reel | Reel 2 (Week 1) | Saves |
| Fri | Stories | Behind-the-scenes Ads Manager screen | Trust |
| Sat | Reel | Reel 3 (Creative = targeting) | Shares |
| Sun | Rest / `/ig-audit` | Rank the week by outlier multiple + sends | Learn |

Every day: spend 20 minutes leaving real comments on 10 accounts your buyers follow (`/ig-comment`).
