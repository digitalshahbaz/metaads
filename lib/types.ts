export type ActiveStatus = "ACTIVE" | "INACTIVE" | "ALL";
export type MediaType = "ALL" | "IMAGE" | "VIDEO" | "MEME" | "NONE";
export type SearchType = "KEYWORD_UNORDERED" | "KEYWORD_EXACT_PHRASE";
export type AdType =
  | "ALL"
  | "POLITICAL_AND_ISSUE_ADS"
  | "HOUSING_ADS"
  | "EMPLOYMENT_ADS"
  | "FINANCIAL_PRODUCTS_AND_SERVICES_ADS";

export interface SearchParams {
  q: string;
  pageIds: string[];
  countries: string[];
  activeStatus: ActiveStatus;
  mediaType: MediaType;
  searchType: SearchType;
  adType: AdType;
  limit: number;
  after?: string;
}

/** Normalised ad, independent of whether it came from the API or demo data. */
export interface Ad {
  id: string;
  pageId: string;
  pageName: string;
  bodies: string[];
  titles: string[];
  descriptions: string[];
  captions: string[];
  startTime: string | null;
  stopTime: string | null;
  platforms: string[];
  languages: string[];
  libraryUrl: string;
  /** Days the ad has been (or was) running. */
  daysRunning: number;
  isActive: boolean;
}

export interface SearchResponse {
  ads: Ad[];
  nextCursor: string | null;
  demo: boolean;
  error?: string;
}

export interface AdvertiserSummary {
  pageId: string;
  pageName: string;
  adCount: number;
  activeCount: number;
  maxDaysRunning: number;
  avgDaysRunning: number;
}
