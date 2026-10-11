import type { Ad, AdvertiserSummary } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysBetween(start: string | null, stop: string | null, now = new Date()): number {
  if (!start) return 0;
  const s = new Date(start).getTime();
  const e = stop ? new Date(stop).getTime() : now.getTime();
  if (Number.isNaN(s) || Number.isNaN(e)) return 0;
  return Math.max(0, Math.floor((e - s) / DAY_MS));
}

/**
 * Advertisers rarely keep paying for an ad that doesn't work, so run time is
 * the best public proxy for performance the Ad Library offers.
 */
export function longevityTier(days: number): { label: string; tone: "hot" | "warm" | "new" } {
  if (days >= 60) return { label: "Proven winner", tone: "hot" };
  if (days >= 21) return { label: "Likely profitable", tone: "warm" };
  return { label: "Testing", tone: "new" };
}

export function summariseAdvertisers(ads: Ad[]): AdvertiserSummary[] {
  const byPage = new Map<string, Ad[]>();
  for (const ad of ads) {
    const list = byPage.get(ad.pageId) ?? [];
    list.push(ad);
    byPage.set(ad.pageId, list);
  }
  return [...byPage.entries()]
    .map(([pageId, list]) => {
      const days = list.map((a) => a.daysRunning);
      return {
        pageId,
        pageName: list[0].pageName,
        adCount: list.length,
        activeCount: list.filter((a) => a.isActive).length,
        maxDaysRunning: Math.max(...days),
        avgDaysRunning: Math.round(days.reduce((a, b) => a + b, 0) / list.length),
      };
    })
    .sort((a, b) => b.adCount - a.adCount || b.maxDaysRunning - a.maxDaysRunning);
}

/** First non-empty line of the primary text: the hook people see before "See more". */
export function hookOf(ad: Ad): string {
  const body = ad.bodies.find((b) => b.trim()) ?? "";
  return body.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
}

export function toCsv(ads: Ad[]): string {
  const header = [
    "id",
    "page_name",
    "page_id",
    "hook",
    "primary_text",
    "headline",
    "start",
    "stop",
    "days_running",
    "active",
    "platforms",
    "library_url",
  ];
  const esc = (v: string | number | boolean) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = ads.map((a) =>
    [
      a.id,
      a.pageName,
      a.pageId,
      hookOf(a),
      a.bodies[0] ?? "",
      a.titles[0] ?? "",
      a.startTime ?? "",
      a.stopTime ?? "",
      a.daysRunning,
      a.isActive,
      a.platforms.join("|"),
      a.libraryUrl,
    ]
      .map(esc)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}
