import { NextRequest, NextResponse } from "next/server";
import { searchDemo } from "@/lib/demoAds";
import { searchAdLibrary } from "@/lib/metaAdLibrary";
import type { ActiveStatus, AdType, MediaType, SearchParams, SearchType } from "@/lib/types";

const ACTIVE: ActiveStatus[] = ["ACTIVE", "INACTIVE", "ALL"];
const MEDIA: MediaType[] = ["ALL", "IMAGE", "VIDEO", "MEME", "NONE"];
const SEARCH: SearchType[] = ["KEYWORD_UNORDERED", "KEYWORD_EXACT_PHRASE"];
const AD_TYPES: AdType[] = [
  "ALL",
  "POLITICAL_AND_ISSUE_ADS",
  "HOUSING_ADS",
  "EMPLOYMENT_ADS",
  "FINANCIAL_PRODUCTS_AND_SERVICES_ADS",
];

function pick<T extends string>(value: string | null, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function list(value: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const params: SearchParams = {
    q: (sp.get("q") ?? "").slice(0, 100),
    pageIds: list(sp.get("pageIds")).filter((id) => /^\d+$/.test(id)).slice(0, 10),
    countries: list(sp.get("countries")).map((c) => c.toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c)),
    activeStatus: pick(sp.get("status"), ACTIVE, "ACTIVE"),
    mediaType: pick(sp.get("media"), MEDIA, "ALL"),
    searchType: pick(sp.get("searchType"), SEARCH, "KEYWORD_UNORDERED"),
    adType: pick(sp.get("adType"), AD_TYPES, "ALL"),
    limit: Math.min(Math.max(Number(sp.get("limit")) || 25, 1), 100),
    after: sp.get("after") ?? undefined,
  };
  if (!params.countries.length) params.countries = ["IN"];

  if (!params.q && !params.pageIds.length) {
    return NextResponse.json({ error: "Enter a keyword or at least one Page ID." }, { status: 400 });
  }

  const token = process.env.META_ACCESS_TOKEN;
  const result = token ? await searchAdLibrary(params, token) : searchDemo(params);
  return NextResponse.json(result, { status: result.error ? 502 : 200 });
}
