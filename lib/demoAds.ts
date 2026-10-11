import { normaliseAd } from "./metaAdLibrary";
import type { Ad, SearchParams, SearchResponse } from "./types";

const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString().slice(0, 10);

interface Seed {
  page: [string, string];
  body: string;
  title: string;
  start: number;
  stop?: number;
  media: "IMAGE" | "VIDEO";
  platforms: string[];
}

const SEEDS: Seed[] = [
  {
    page: ["1001", "GrowthLab Academy"],
    body: "Stop posting every day and still getting zero leads.\nIn this free 90-minute workshop I'll show you the 3-step content system that brought 1,200 booked calls last year.\nSeats are limited — register now.",
    title: "Free Workshop: 3-Step Lead System",
    start: 142,
    media: "VIDEO",
    platforms: ["facebook", "instagram"],
  },
  {
    page: ["1001", "GrowthLab Academy"],
    body: "Most coaches don't have a traffic problem. They have an offer problem.\nJoin Saturday's live masterclass and rebuild your offer in 2 hours.",
    title: "Live Masterclass — This Saturday",
    start: 34,
    media: "IMAGE",
    platforms: ["instagram"],
  },
  {
    page: ["1001", "GrowthLab Academy"],
    body: "Your reels get views but no DMs? Here's why.",
    title: "Watch the breakdown",
    start: 9,
    media: "VIDEO",
    platforms: ["instagram"],
  },
  {
    page: ["2002", "PureGlow Skincare"],
    body: "I tried 14 serums before this one actually cleared my pigmentation.\n30-day money-back guarantee. Free shipping today only.",
    title: "Vitamin C Serum — 40% Off",
    start: 211,
    media: "VIDEO",
    platforms: ["facebook", "instagram", "audience_network"],
  },
  {
    page: ["2002", "PureGlow Skincare"],
    body: "Dermatologist-approved. 50,000+ happy customers.\nBuy 2, get 1 free.",
    title: "Shop the Glow Kit",
    start: 73,
    stop: 12,
    media: "IMAGE",
    platforms: ["facebook"],
  },
  {
    page: ["3003", "FitWithRiya"],
    body: "Lose 5 kg in 30 days without giving up roti or rice.\nMy 4-week home workout + Indian meal plan — now just ₹499.",
    title: "30-Day Desi Fat Loss Plan",
    start: 96,
    media: "VIDEO",
    platforms: ["facebook", "instagram"],
  },
  {
    page: ["3003", "FitWithRiya"],
    body: "Busy mom? 20 minutes a day is all you need.",
    title: "Start today for ₹499",
    start: 5,
    media: "IMAGE",
    platforms: ["instagram"],
  },
  {
    page: ["4004", "Ledgerly Accounting App"],
    body: "GST filing took me 6 hours every month. Now it takes 6 minutes.\nTry Ledgerly free for 14 days — no card required.",
    title: "Free 14-Day Trial",
    start: 58,
    media: "IMAGE",
    platforms: ["facebook", "messenger"],
  },
  {
    page: ["5005", "Prime Realty Group"],
    body: "2 & 3 BHK homes starting ₹68L — 5 minutes from the metro.\nBook a free site visit this weekend.",
    title: "Book Your Site Visit",
    start: 27,
    media: "VIDEO",
    platforms: ["facebook", "instagram"],
  },
  {
    page: ["6006", "AI Career Accelerator"],
    body: "Non-tech background? You can still land a ₹12 LPA AI job.\nAttend the free 2-day AI career workshop and get your roadmap.",
    title: "Free AI Career Workshop",
    start: 64,
    media: "VIDEO",
    platforms: ["facebook", "instagram"],
  },
];

function seedToAd(s: Seed, i: number): Ad & { media: Seed["media"] } {
  const ad = normaliseAd({
    id: `demo_${i + 1}`,
    page_id: s.page[0],
    page_name: s.page[1],
    ad_creative_bodies: [s.body],
    ad_creative_link_titles: [s.title],
    ad_delivery_start_time: ago(s.start),
    ad_delivery_stop_time: s.stop !== undefined ? ago(s.stop) : undefined,
    publisher_platforms: s.platforms,
    languages: ["en"],
  });
  return { ...ad, libraryUrl: "https://www.facebook.com/ads/library/", media: s.media };
}

export function searchDemo(params: SearchParams): SearchResponse {
  const q = params.q.trim().toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);
  const ads = SEEDS.map(seedToAd).filter((ad) => {
    const text = [ad.pageName, ...ad.bodies, ...ad.titles].join(" ").toLowerCase();
    if (q) {
      const ok = params.searchType === "KEYWORD_EXACT_PHRASE" ? text.includes(q) : terms.every((t) => text.includes(t));
      if (!ok) return false;
    }
    if (params.pageIds.length && !params.pageIds.includes(ad.pageId)) return false;
    if (params.activeStatus === "ACTIVE" && !ad.isActive) return false;
    if (params.activeStatus === "INACTIVE" && ad.isActive) return false;
    if ((params.mediaType === "IMAGE" || params.mediaType === "VIDEO") && ad.media !== params.mediaType) return false;
    return true;
  });
  return { ads: ads.map(({ media: _media, ...ad }) => ad), nextCursor: null, demo: true };
}
