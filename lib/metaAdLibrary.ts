import "server-only";
import { daysBetween } from "./analysis";
import type { Ad, SearchParams, SearchResponse } from "./types";

const FIELDS = [
  "id",
  "page_id",
  "page_name",
  "ad_creative_bodies",
  "ad_creative_link_titles",
  "ad_creative_link_descriptions",
  "ad_creative_link_captions",
  "ad_delivery_start_time",
  "ad_delivery_stop_time",
  "publisher_platforms",
  "languages",
].join(",");

interface RawAd {
  id: string;
  page_id?: string;
  page_name?: string;
  ad_creative_bodies?: string[];
  ad_creative_link_titles?: string[];
  ad_creative_link_descriptions?: string[];
  ad_creative_link_captions?: string[];
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
  publisher_platforms?: string[];
  languages?: string[];
}

interface RawResponse {
  data?: RawAd[];
  paging?: { cursors?: { after?: string }; next?: string };
  error?: { message: string; code?: number; error_user_msg?: string };
}

export function normaliseAd(raw: RawAd, now = new Date()): Ad {
  const stop = raw.ad_delivery_stop_time ?? null;
  return {
    id: raw.id,
    pageId: raw.page_id ?? "",
    pageName: raw.page_name ?? "Unknown page",
    bodies: raw.ad_creative_bodies ?? [],
    titles: raw.ad_creative_link_titles ?? [],
    descriptions: raw.ad_creative_link_descriptions ?? [],
    captions: raw.ad_creative_link_captions ?? [],
    startTime: raw.ad_delivery_start_time ?? null,
    stopTime: stop,
    platforms: raw.publisher_platforms ?? [],
    languages: raw.languages ?? [],
    // Public Ad Library link. The API's ad_snapshot_url embeds the access
    // token, so it must never be sent to the browser.
    libraryUrl: `https://www.facebook.com/ads/library/?id=${raw.id}`,
    daysRunning: daysBetween(raw.ad_delivery_start_time ?? null, stop, now),
    isActive: !stop || new Date(stop) > now,
  };
}

export async function searchAdLibrary(
  params: SearchParams,
  token: string,
  version = process.env.META_GRAPH_VERSION || "v23.0",
): Promise<SearchResponse> {
  const url = new URL(`https://graph.facebook.com/${version}/ads_archive`);
  const qs = url.searchParams;
  qs.set("access_token", token);
  qs.set("fields", FIELDS);
  qs.set("ad_reached_countries", JSON.stringify(params.countries));
  qs.set("ad_active_status", params.activeStatus);
  qs.set("ad_type", params.adType);
  qs.set("media_type", params.mediaType);
  qs.set("search_type", params.searchType);
  qs.set("limit", String(params.limit));
  if (params.q) qs.set("search_terms", params.q);
  if (params.pageIds.length) qs.set("search_page_ids", JSON.stringify(params.pageIds));
  if (params.after) qs.set("after", params.after);

  const res = await fetch(url, { cache: "no-store" });
  const json = (await res.json()) as RawResponse;
  if (!res.ok || json.error) {
    const msg = json.error?.error_user_msg || json.error?.message || `HTTP ${res.status}`;
    return { ads: [], nextCursor: null, demo: false, error: msg };
  }
  return {
    ads: (json.data ?? []).map((a) => normaliseAd(a)),
    nextCursor: json.paging?.next ? json.paging.cursors?.after ?? null : null,
    demo: false,
  };
}
