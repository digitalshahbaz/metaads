# Meta Ads Intelligence Dashboard: Architecture & Implementation Plan

Status: **proposal, awaiting approval**. Nothing past the existing prototype is built yet.
Date: 2026-10-11

This plan turns the current prototype into a multi-user research tool. The prototype is a Next.js app with one Ad Library search and a localStorage swipe file. The tool will:

- resolve any advertiser identifier to a stable Facebook Page ID,
- pull all of an advertiser's ads through a replaceable data provider,
- classify each ad by funnel and destination,
- sort every group from oldest to newest using source dates,
- add saved-ad management and AI analysis on top.

---

## 1. Architecture

```
 Browser (Next.js App Router, React, Tailwind)
   │  /search   /advertisers/[id] (opens in new tab)   /collections   /ads/[id]
   ▼
 Next.js server (Route Handlers + Server Actions; all keys live here)
   ├─ Search service ─────── input parser → identifier resolver → provider adapter
   ├─ Ingestion service ──── normalise → dedupe (stable IDs) → upsert → observation log
   ├─ Classification ─────── URL normaliser → rules engine → (optional) LLM fallback
   ├─ Landing-page fetcher ─ SSRF-safe fetch, robots.txt, timeout, cache by normalised URL
   ├─ AI analysis service ── Claude API (structured outputs, batch, prompt caching)
   └─ Job runner ─────────── Postgres-backed queue (advertiser backfill, LP fetch, AI)
   │
   ▼
 Supabase
   ├─ Postgres (+ pgvector, pg_trgm) with Row Level Security
   ├─ Auth (email magic link / Google)
   └─ Storage (optional creative thumbnails, only if the provider licence allows it)

 External: Ad-data provider(s) behind AdDataProvider interface · Anthropic API · embeddings API
```

### Key decisions

| Decision | Choice | Why |
|---|---|---|
| Framework | Next.js 15 App Router + TypeScript, keep this repo | The prototype already builds; server components keep provider keys off the client |
| Styling | Tailwind CSS (replace current hand-written CSS) | As requested; quick to build dense dashboard layouts |
| DB/Auth | Supabase Postgres + Auth + RLS | As requested; RLS scopes collections and notes per workspace |
| Background work | Postgres job table + a worker route triggered by Vercel Cron or Supabase `pg_cron` | No extra infra. Advertiser backfills and landing-page fetches must not block requests |
| Provider access | `AdDataProvider` interface + a registry. One adapter per vendor. A fixture adapter for tests | Lets us swap vendors without touching the UI, DB or classifier |
| Caching | Two layers: (1) raw provider response cache keyed by `hash(provider, endpoint, params)` with TTL; (2) normalised entities in tables, which are the source of truth | Cuts provider spend and keeps results stable across reloads |
| Classification | Deterministic rules first, LLM only for low-confidence ads; every result stores its signals, confidence and classifier version | Explainable, cheap, re-runnable when rules change |
| Dates | Store the source's value verbatim plus a typed column with explicit precision and timezone; never fill gaps | Meets the "never fabricate missing dates" requirement |

### Request flows

**Keyword search**
1. The UI posts `{ kind: "keyword", q, country, status }`.
2. The server checks the provider cache. On a miss, it calls the adapter, which handles retries and backoff.
3. Ads are normalised and upserted by `(provider, library_id)`. Advertisers are upserted by `page_id`. An observation row is appended for each ad.
4. The response returns matching ads plus advertisers. Advertisers are deduplicated by `page_id`, not by name.
5. Each advertiser card links to `/advertisers/{page_id}` with `target="_blank" rel="noopener noreferrer"`.

**Advertiser page**
1. The page renders immediately from the DB with whatever ads are already stored.
2. It enqueues an `advertiser_backfill` job that pages through *all* of the advertiser's ads: any status, all countries the provider allows, no keyword filter.
3. The UI polls a job-status endpoint and shows "Fetched N ads, still loading…" or "Complete: provider returned N ads".
4. If the provider caps or truncates the results, the page says so.

**Identifier resolution**

| Input | Parse | Resolve |
|---|---|---|
| FB Page URL `facebook.com/<vanity or id>` / `profile.php?id=` | Extract the numeric ID or vanity name | Numeric ID: use it. Vanity: provider page search, then exact-match the vanity or name |
| FB Page name | none | Provider page search, then a ranked candidate list. The user picks if more than one matches. Never auto-pick on a fuzzy match |
| IG username / IG URL | Extract the username (strip `@`, query, trailing slash) | Provider page search by username. Match on the linked IG handle in the page info. If there's no linked FB Page, say "not resolvable" |
| Keyword | none | Ad search |

Every resolution is stored in `advertiser_aliases` with the source and confidence, so repeat lookups are free.

---

## 2. Ad-data providers

I could not open the vendors' pricing pages directly from this environment. The prices below come from search results gathered on **2026-10-11**. **Confirm each one on the vendor's site before buying.**

| Provider | What it is | Advertiser / page lookup | Coverage | Pricing (as found) | Notes |
|---|---|---|---|---|---|
| **Meta Ad Library API** (official, `ads_archive`) | Official Graph API | `search_page_ids` (numeric IDs only), keyword search | **All ads only if delivered in EU/UK**. Elsewhere (incl. India, US) only political/issue ads | Free. Needs identity verification and app setup; tokens expire | The only path that is unambiguously permitted. No CTA or destination URL fields; no media URLs (snapshot page only) |
| **SearchApi.io** (`meta_ad_library`, `meta_ad_library_page_search`, `meta_ad_library_page_info`, `meta_ad_library_ad_details`) | Third-party API over the public Ad Library | Page search engine + page-info engine; search by page ID | Global commercial ads as shown on the public Ad Library | Developer plan **$40/mo for 10,000 searches (~$4 per 1k requests)**; billed per successful search | Four engines map neatly onto our adapter. Ads per request still needs measuring |
| **ScrapeCreators** (`/v1/facebook/adLibrary/search`, `/company/ads`, `/search/companies`, `/ad/details`, transcript) | Third-party unofficial API | `search/companies` → `pageId`; `company/ads` by pageId or name | Global, public Ad Library | **100 free credits; $47 → 25k credits; $497 → 500k credits**. Mostly 1 credit/request; cache hits are free; credits never expire | Pay-as-you-go suits uneven usage. Video transcript endpoint is useful for AI analysis |
| **Apify: official `apify/facebook-ads-scraper`** | Hosted scraper actor | Page URL input | Global, public Ad Library | **$3.40–$5.80 per 1,000 ads** depending on Apify plan | Asynchronous runs (start, poll, fetch dataset). Better for bulk backfills than interactive search |
| **Apify community actors** (e.g. curious_coder) | Third-party scrapers | Varies | Varies | ~$0.75–$4 per 1,000 results | Quality and upkeep vary by author. Use only as a fallback |
| **Foreplay API** | Foreplay's own indexed ad database (not live Ad Library) | Brand/page lookups in their index | Whatever Foreplay has indexed | Plans ~$59 / $175 / $459 per month incl. 10k credits; 1 credit = 1 ad | Licensed data from a vendor, not scraped by us. Coverage limited to their index |

### Recommendation

1. **Primary adapter: SearchApi.io.** Its separate page-search, page-info and ad-details engines line up with our resolver, advertiser page and classifier. Predictable monthly cost.
2. **Second adapter: ScrapeCreators.** Use it for failover, and to cross-check coverage while we evaluate. It also has a transcript endpoint for video-ad analysis.
3. **Official Meta adapter.** Use it for EU/UK research and as the compliant default where it covers the need. The prototype's client becomes this adapter.
4. **Before committing money:** run a one-week spike on free tiers. Measure coverage, field completeness (CTA, destination URL, start date, lead-form flag), page size and latency on ~20 known advertisers, including Indian ones.

### Licence and terms: needs your decision

- Third-party providers collect data from the public Ad Library website. That is not Meta's official API.
- Meta's terms restrict automated collection without permission. In *Meta v. Bright Data* (N.D. Cal., Jan 2024) the court found that scraping public data while logged out did not breach Meta's terms. That ruling does not grant permission, and Meta's terms can change.
- **This needs legal review before production use.** Read each vendor's terms too: what you may store, for how long, whether you may redistribute, and whether you may keep creative media.
- Engineering commitments regardless of provider:
  - no scraping code of our own,
  - no login or session use,
  - no CAPTCHA or rate-limit bypass,
  - respect provider rate limits,
  - store media only if the licence allows it.

---

## 3. Database schema (Postgres / Supabase)

Conventions:
- `uuid` primary keys; source IDs stored as `text`, because Meta IDs exceed JS safe integers.
- `timestamptz` for anything we observe; `date` for source-provided calendar dates.
- Every source value is kept raw alongside its parsed form.

```sql
-- ── Tenancy ─────────────────────────────────────────────────────────────
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
create table workspace_members (
  workspace_id uuid references workspaces on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role text not null check (role in ('owner','editor','viewer')),
  primary key (workspace_id, user_id)
);

-- ── Advertisers ─────────────────────────────────────────────────────────
create table advertisers (
  id uuid primary key default gen_random_uuid(),
  page_id text not null unique,                -- stable Facebook Page ID
  name text not null,
  page_url text,
  ig_username text,
  ig_user_id text,
  profile_image_url text,
  page_category text,
  page_like_count bigint,
  ig_follower_count bigint,
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  backfill_status text not null default 'never'
    check (backfill_status in ('never','queued','running','complete','partial','failed')),
  backfill_completed_at timestamptz,
  provider_reported_ad_count int,              -- what the provider says exists, if given
  raw jsonb                                   -- latest provider page-info payload
);
create index on advertisers using gin (name gin_trgm_ops);

create table advertiser_aliases (              -- resolution memory
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references advertisers on delete cascade,
  kind text not null check (kind in ('fb_page_name','fb_page_url','fb_vanity','ig_username','ig_url')),
  value_normalized text not null,
  source text not null,                        -- provider key or 'user_confirmed'
  confidence real not null,                    -- 1.0 = exact ID / user confirmed
  created_at timestamptz not null default now(),
  unique (kind, value_normalized, advertiser_id)
);

-- ── Ads ─────────────────────────────────────────────────────────────────
create table ads (
  id uuid primary key default gen_random_uuid(),
  library_id text not null unique,             -- Ad Library archive ID (stable)
  advertiser_id uuid not null references advertisers,
  collation_id text,                           -- groups "multiple versions" of one ad
  collation_count int,
  is_active boolean,
  -- Source dates: verbatim + typed. Never derived or filled in.
  source_start_raw text,
  source_start_date date,
  source_end_raw text,
  source_end_date date,
  source_date_precision text not null default 'unknown'
    check (source_date_precision in ('day','second','unknown')),
  source_date_timezone text,                   -- IANA name if the provider states one, else NULL
  source_date_kind text not null default 'delivery_start'
    check (source_date_kind in ('delivery_start','creation','unknown')),
  -- Our own observation timeline
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  first_observed_provider text not null,
  -- Creative + copy
  display_format text,                         -- image | video | carousel | dco | unknown
  body text,
  title text,
  link_description text,
  caption text,
  cta_text text,
  cta_type text,                               -- provider enum, e.g. LEARN_MORE, SIGN_UP
  platforms text[] not null default '{}',
  -- Destination
  destination_url_raw text,
  destination_url_normalized text,
  destination_domain text,
  destination_path text,
  normalization_rule_version int,
  is_instant_form boolean,                     -- Meta lead-form destination, NULL = unknown
  is_messaging_destination boolean,            -- WhatsApp / Messenger / IG Direct
  content_hash text,                           -- hash of normalised copy + media keys
  raw jsonb not null                           -- latest full provider payload
);
create index on ads (advertiser_id, source_start_date nulls last, first_observed_at, library_id);
create index on ads (destination_url_normalized);
create index on ads (content_hash);
create index on ads using gin (to_tsvector('simple', coalesce(body,'') || ' ' || coalesce(title,'')));

create table ad_media (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references ads on delete cascade,
  position int not null default 0,
  kind text not null check (kind in ('image','video','thumbnail')),
  source_url text,                             -- provider/CDN URL, may expire
  storage_path text,                           -- only if licence allows storing copies
  width int, height int, duration_s real,
  perceptual_hash text,
  transcript text
);

create table ad_observations (                 -- append-only, one row per sighting
  id bigint generated always as identity primary key,
  ad_id uuid not null references ads on delete cascade,
  provider text not null,
  observed_at timestamptz not null default now(),
  search_id uuid,
  is_active boolean,
  payload_hash text not null                   -- detect provider-side changes
);

-- ── Search + provider cache ─────────────────────────────────────────────
create table searches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces,
  user_id uuid references auth.users,
  input_kind text not null check (input_kind in ('keyword','fb_page_name','fb_page_url','ig_username','ig_url')),
  input_raw text not null,
  params jsonb not null,                       -- country, status, media type…
  provider text not null,
  resolved_advertiser_id uuid references advertisers,
  result_count int,
  created_at timestamptz not null default now()
);
create table search_results (
  search_id uuid references searches on delete cascade,
  ad_id uuid references ads on delete cascade,
  rank int not null,
  primary key (search_id, ad_id)
);
create table provider_cache (
  cache_key text primary key,                  -- sha256(provider|endpoint|canonical params)
  provider text not null,
  endpoint text not null,
  status int not null,
  response jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create table provider_usage (                  -- cost tracking
  id bigint generated always as identity primary key,
  provider text not null, endpoint text not null,
  units real not null, cached boolean not null,
  latency_ms int, status int,
  at timestamptz not null default now()
);

-- ── URL normalisation (configurable) ────────────────────────────────────
create table url_normalization_rules (
  id serial primary key,
  domain_pattern text not null default '*',    -- '*' or glob like '*.example.com'
  action text not null check (action in (
    'strip_params','keep_only_params','strip_www','lowercase_host','lowercase_path',
    'strip_trailing_slash','strip_fragment','rewrite_path_regex','resolve_redirects')),
  args jsonb not null default '{}',            -- e.g. {"params":["utm_*","fbclid","gclid"]}
  priority int not null default 100,
  enabled boolean not null default true,
  ruleset_version int not null
);

-- ── Landing pages ───────────────────────────────────────────────────────
create table landing_pages (
  url_normalized text primary key,
  final_url text, http_status int,
  title text, meta_description text,
  text_excerpt text,                           -- capped, for classification only
  signals jsonb,                               -- forms, calendly, checkout, whatsapp links, app store links…
  robots_allowed boolean,
  content_hash text,
  fetched_at timestamptz, error text
);

-- ── Classification ──────────────────────────────────────────────────────
create table funnel_types (
  key text primary key,                        -- lp_lead, instant_form, webinar_event, messaging,
  label text not null,                         -- application_booking, purchase, app_install, other
  sort_order int not null
);
create table ad_classifications (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references ads on delete cascade,
  funnel_key text not null references funnel_types,
  confidence real not null,
  method text not null check (method in ('rules','llm','manual')),
  signals jsonb not null,                      -- which rules fired + evidence
  classifier_version text not null,
  is_current boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index on ad_classifications (ad_id) where is_current;

create table ad_facets (                       -- filterable offer / hook / angle / campaign
  ad_id uuid references ads on delete cascade,
  facet text not null check (facet in ('offer','hook','angle','campaign','proof','cta')),
  value text not null,
  value_normalized text not null,
  source text not null,                        -- 'rules' | 'ai:<prompt_version>' | 'user'
  primary key (ad_id, facet, value_normalized)
);

-- ── AI analysis ─────────────────────────────────────────────────────────
create table ai_analyses (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references ads on delete cascade,
  model text not null,
  prompt_version text not null,
  input_hash text not null,                    -- skip re-analysis when nothing changed
  output jsonb not null,                       -- validated against the zod schema
  input_tokens int, output_tokens int,
  created_at timestamptz not null default now(),
  unique (ad_id, prompt_version, input_hash)
);
create table ad_embeddings (
  ad_id uuid references ads on delete cascade,
  model text not null,
  embedding vector(1024) not null,
  primary key (ad_id, model)
);

-- ── User curation (all workspace-scoped, RLS enforced) ──────────────────
create table bookmarks (
  workspace_id uuid references workspaces on delete cascade,
  user_id uuid references auth.users on delete cascade,
  ad_id uuid references ads on delete cascade,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id, ad_id)
);
create table collections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  name text not null, description text,
  created_by uuid references auth.users,
  created_at timestamptz not null default now()
);
create table collection_items (
  collection_id uuid references collections on delete cascade,
  ad_id uuid references ads on delete cascade,
  added_by uuid references auth.users,
  added_at timestamptz not null default now(),
  primary key (collection_id, ad_id)
);
create table notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  ad_id uuid not null references ads on delete cascade,
  author_id uuid references auth.users,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  name text not null, color text,
  unique (workspace_id, name)
);
create table ad_tags (
  tag_id uuid references tags on delete cascade,
  ad_id uuid references ads on delete cascade,
  primary key (tag_id, ad_id)
);

-- ── Jobs ────────────────────────────────────────────────────────────────
create table jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null,                          -- advertiser_backfill | landing_page_fetch | classify | ai_analyze | embed
  payload jsonb not null,
  dedupe_key text unique,                      -- e.g. 'backfill:<page_id>'
  status text not null default 'queued' check (status in ('queued','running','done','failed')),
  attempts int not null default 0,
  max_attempts int not null default 5,
  run_after timestamptz not null default now(),
  progress jsonb,                              -- {"fetched": 120, "pages": 4}
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

The ad and advertiser tables (`ads`, `advertisers`, `ad_media`, `landing_pages`, classifications) are a shared research corpus. Everyone can read them; only the server role can write. Curation tables are workspace-scoped through RLS policies on `workspace_members`.

---

## 4. Provider adapter interface

```ts
// lib/providers/types.ts
export type ProviderKey = "searchapi" | "scrapecreators" | "meta_official" | "fixture";

export interface ProviderCapabilities {
  keywordSearch: boolean;
  pageSearch: boolean;           // name / vanity / IG username → candidates
  pageInfo: boolean;
  adsByPage: boolean;
  adDetails: boolean;            // destination URL, CTA, lead-form flag
  countries: "global" | "eu_uk_only_for_commercial";
  returnsDestinationUrl: boolean;
  returnsCta: boolean;
  startDatePrecision: "day" | "second";
  startDateTimezone: string | null;   // null = provider does not say
}

export interface PageRequest { cursor?: string | null; pageSize?: number }
export interface Page<T> { items: T[]; nextCursor: string | null; totalReported?: number | null }

export interface AdSearchQuery extends PageRequest {
  keyword?: string;
  exactPhrase?: boolean;
  pageId?: string;
  countries?: string[];          // ISO-2; empty = provider's "ALL"
  status?: "active" | "inactive" | "all";
  mediaType?: "all" | "image" | "video";
}

export interface PageCandidate {
  pageId: string;
  name: string;
  vanity?: string | null;
  igUsername?: string | null;
  imageUrl?: string | null;
  verified?: boolean | null;
  likeCount?: number | null;
}

/** Provider output after mapping. Unknown values are null, never guessed. */
export interface ProviderAd {
  libraryId: string;
  pageId: string;
  pageName: string;
  collationId: string | null;
  collationCount: number | null;
  isActive: boolean | null;
  startRaw: string | null;
  startDate: string | null;      // YYYY-MM-DD in the provider's stated calendar
  endRaw: string | null;
  endDate: string | null;
  datePrecision: "day" | "second" | "unknown";
  dateTimezone: string | null;
  displayFormat: "image" | "video" | "carousel" | "dco" | "unknown";
  body: string | null;
  title: string | null;
  linkDescription: string | null;
  caption: string | null;
  ctaText: string | null;
  ctaType: string | null;
  destinationUrl: string | null;
  isInstantForm: boolean | null;
  platforms: string[];
  media: { kind: "image" | "video"; url: string; width?: number; height?: number }[];
  raw: unknown;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly kind: "rate_limited" | "auth" | "quota_exhausted" | "not_found" | "bad_request" | "upstream" | "timeout",
    readonly retryable: boolean,
    readonly retryAfterMs?: number,
  ) { super(message); }
}

export interface AdDataProvider {
  readonly key: ProviderKey;
  readonly capabilities: ProviderCapabilities;
  searchAds(q: AdSearchQuery, signal?: AbortSignal): Promise<Page<ProviderAd>>;
  searchPages(query: string, signal?: AbortSignal): Promise<PageCandidate[]>;
  getPage(pageId: string, signal?: AbortSignal): Promise<PageCandidate | null>;
  getAdsByPage(pageId: string, req: PageRequest & Omit<AdSearchQuery, "keyword" | "pageId">, signal?: AbortSignal): Promise<Page<ProviderAd>>;
  getAdDetails?(libraryId: string, signal?: AbortSignal): Promise<ProviderAd | null>;
}
```

Shared wrappers apply to every adapter, so individual adapters stay thin:

- **`withCache`**: reads and writes `provider_cache`, keyed by sorted canonical params.
  - Keyword searches: 6 h TTL.
  - Advertiser pages: 24 h TTL.
  - Ad details: 7 d TTL.
- **`withRetry`**:
  - exponential backoff with jitter (0.5 s, 1 s, 2 s, 4 s, max 4 tries),
  - honours `retryAfterMs`,
  - retries only errors where `retryable` is true,
  - stops at once on `quota_exhausted` or `auth`.
- **`withRateLimit`**: a token bucket per provider. Request-level limits stay in memory; a DB-backed daily budget prevents runaway backfills.
- **`withUsage`**: writes a row to `provider_usage`.
- **Deduplication**: upsert on `ads.library_id` and `advertisers.page_id`, plus `collation_id` grouping. Pagination guards against cursor loops: stop on a repeated cursor, an empty page, or the max-pages cap.

---

## 5. Classification design

### Pipeline

1. Normalise the destination URL.
2. Look up landing-page signals, which are cached and fetched by a background job.
3. Run the rules engine.
4. If the best confidence is below 0.6, the ad is queued for the LLM classifier (Phase 4).

### Rule signals, in precedence order

| Funnel | Strong signals |
|---|---|
| Instant lead form | Provider flag `isInstantForm` / lead-gen destination; CTA "Sign up"/"Apply now"/"Get quote" with no external URL |
| WhatsApp & messaging | URL host `wa.me`, `api.whatsapp.com`, `m.me`, `ig.me`; CTA `WHATSAPP_MESSAGE`, `MESSAGE_PAGE`, `SEND_MESSAGE` |
| App downloads | Host `apps.apple.com`, `play.google.com`, `onelink.me`, `app.adjust.com`; CTA `INSTALL_MOBILE_APP`, `USE_APP` |
| Webinar & event | Host `zoom.us` (path `/webinar/`), `webinarjam`, `eventbrite`, `lu.ma`; path `/webinar`, `/masterclass`, `/workshop`, `/register`, `/live`; copy terms (webinar, masterclass, live session, workshop) plus a date/time |
| Application & booking | Host `calendly.com`, `cal.com`, `typeform.com`, `tally.so`; path `/apply`, `/book`, `/schedule`, `/call`; CTA `BOOK_NOW`; LP signal: booking widget embed |
| Product sales & purchase | CTA `SHOP_NOW`, `BUY_NOW`, `ORDER_NOW`; path `/products/`, `/cart`, `/checkout`; LP signals: Shopify/WooCommerce markers, price + add-to-cart |
| Landing-page lead gen | External URL + LP has an email/phone form; CTA `LEARN_MORE`/`SIGN_UP`/`DOWNLOAD`; path `/optin`, `/free`, `/guide` |
| Other / unclassified | Nothing above crosses the threshold |

Within each funnel, ads are sub-grouped by **destination**: normalised URL, then domain + first path segment. That way "the same funnel at the same URL" shows as one block.

### Sorting, in every group

```
ORDER BY source_start_date ASC NULLS LAST, first_observed_at ASC, library_id ASC
```

- The UI labels dates, for example: `Started 2026-03-14 (source date, day precision, timezone not stated)` and `First seen by us 2026-10-11 09:12 IST`.
- Ads with no source date go in a separate "Start date not provided" section at the end of each group, ordered by first-observed time. They are never mixed into the dated ordering.

---

## 6. AI analysis service

- **Model:** Claude via `@anthropic-ai/sdk`, server-side only.
  - Default is `claude-opus-5-5` with structured outputs (`output_config.format` with a JSON schema, validated with zod).
  - Effort is `low` for extraction and `medium` for cross-ad synthesis. Tune effort before switching models.
  - A cheaper model such as `claude-haiku-5-5` for bulk classification is your call on cost versus quality. We would measure it on a labelled sample first.
  - Enable refusal fallbacks (`fallbacks: "default"`) on interactive requests.
- **Per-ad extraction schema:** `hook`, `angle`, `offer`, `proof[]`, `cta`, `creative_structure` (format, opening, beats), `audience_signals`, `funnel_guess` + rationale, `language`.
  - Every field may be `null`, and the prompt forbids guessing.
  - The input is copy, headline, CTA, destination, landing-page excerpt, and transcript or image when available.
- **Cost controls:**
  - Use the **Message Batches API** (50% cheaper) for bulk and backfill analysis.
  - Use **prompt caching** on the frozen system prompt, schema and few-shot examples.
  - Skip any ad whose `input_hash` hasn't changed.
  - Set a per-workspace monthly token budget.
- **Similar ads:** Anthropic has no embeddings endpoint, so this needs a separate embeddings provider (e.g. Voyage AI) stored in `pgvector`. Query by cosine similarity, filtered to the workspace's saved ads. Until embeddings are approved, a `pg_trgm` + full-text fallback works.
- **Saved-ad synthesis:** "Analyse this collection" sends the per-ad extractions, not raw ads, and returns patterns across hooks, offers and angles.

---

## 7. Implementation plan

Each phase ends with passing CI (lint, typecheck, unit tests) and a demo against the fixture provider plus one live provider.

**Phase 0: Foundations (approval gate)**
1. Decide on the provider spike and legal review.
2. Add Tailwind, Vitest and Playwright to the existing repo. Add a CI workflow.
3. Create the Supabase project. Set up SQL migrations (`supabase/migrations`), RLS policies and generated TS types.
4. Add auth (magic link) and auto-create a workspace on first sign-in.
5. Add env schema validation (zod) so provider and AI keys are server-only and the app fails fast if they're missing.

**Phase 1: Search, advertisers, ingestion**
1. `AdDataProvider` interface, fixture adapter, SearchApi adapter, and the existing Meta client turned into an adapter.
2. Cache, retry, rate-limit and usage wrappers.
3. Input parser and identifier resolver for all five input types, with a candidate picker UI.
4. Ingestion: normalise, upsert, observation log, collation grouping.
5. Search results page: ad grid plus a deduplicated advertiser list. "View All Ads" opens `/advertisers/[pageId]` in a new tab.
6. Job runner, the advertiser backfill job, and an advertiser page with live progress and a completeness banner.

**Phase 2: Classification and chronological groups**
1. Configurable URL normaliser (rules table and admin page) with versioning.
2. SSRF-safe landing-page fetcher:
   - block private IPs,
   - follow at most 5 redirects,
   - 8 s timeout,
   - 1 MB cap,
   - respect robots.txt,
   - honest User-Agent.
3. Rules engine with a labelled fixture set (≥150 ads). Report precision and recall per funnel in CI.
4. Grouped advertiser view: funnel, then destination, then ads oldest to newest. Explicit date labels and an undated section.
5. Facet filters: offer, hook, angle and campaign where identifiable. Campaign = shared destination URL + UTM campaign param + collation.

**Phase 3: Curation**
1. Bookmarks, collections, notes and tags (server actions, RLS).
2. Move the localStorage swipe file into the DB, with a one-time import.
3. CSV export per collection.

**Phase 4: AI**
1. Extraction service, with batch for bulk and synchronous for one ad.
2. LLM fallback classifier for low-confidence ads.
3. Embeddings and "Find similar saved ads".
4. Collection-level synthesis report.
5. Token usage dashboard and budgets.

**Phase 5: Hardening**
1. Second provider adapter (ScrapeCreators) and automatic failover.
2. Observability: structured logs, provider error rates, cost per search.
3. Load test the backfill of a large advertiser (≥2,000 ads). Deploy to Vercel.

---

## 8. Technical risks

| Risk | Impact | Mitigation |
|---|---|---|
| Provider terms / legal position | Could force a provider switch or shutdown | Legal review before Phase 1 goes live; adapter boundary; official API path kept |
| Incomplete coverage (official API is EU/UK only for commercial ads; third parties can miss ads or cap results) | "All ads" may not be all | Show the provider-reported count vs fetched count; "partial" status; never claim completeness |
| IG username has no linked FB Page, or many pages share a name | Wrong advertiser | Candidate picker; exact-match only for auto-resolve; store user-confirmed aliases |
| Date semantics (day precision, timezone not stated, "started running" vs created) | Misleading chronology | Store raw + precision + timezone; label in UI; never fill in dates |
| CDN media URLs expire | Broken thumbnails | Re-fetch on view through ad details; store copies only if licensed |
| Provider schema drift | Silent nulls | zod-validate provider responses; alert on field null-rate spikes; contract tests with recorded fixtures |
| Backfill cost blow-up on very large advertisers | Surprise bills | Per-job page cap, daily provider budget, cache, resume from last cursor |
| Landing-page fetch: SSRF, cloaking, bot blocks | Security / bad signals | Private-IP block and DNS-rebind check; treat a failed fetch as "no signal", not a classification |
| Rules misclassify | Wrong groups | Labelled fixture set in CI; confidence + signals visible; manual override (`method='manual'`) |
| LLM cost and hallucinated fields | Cost / trust | Null-allowed schema; batch + caching; input-hash skip; budgets |
| RLS mistakes leak notes across workspaces | Privacy | Policy tests in CI with two test users |

---

## 9. Acceptance criteria

**Search**
- [ ] Each of the 5 input kinds resolves correctly on a fixture set:
  - [ ] ≥20 known pages, including vanity URLs, `profile.php?id=` URLs, IG URLs with query strings, and `@handles`.
  - [ ] Ambiguous names show a candidate list instead of a guess.
- [ ] Keyword search returns ads plus advertisers deduplicated by `page_id`. The same advertiser never appears twice.
- [ ] "View All Ads" opens `/advertisers/<pageId>` in a new tab. That page shows ads from that advertiser that do **not** match the keyword.

**Advertiser page**
- [ ] It shows a progress state during backfill and a final count.
- [ ] It marks itself "partial" when the provider stops early or caps results.

**Data integrity**
- [ ] Re-running a search creates no duplicate `ads` or `advertisers` rows.
- [ ] `first_observed_at` never changes after insert.
- [ ] Source date fields are never overwritten with derived values.

**Classification and ordering**
- [ ] Every ad has exactly one current classification, with signals and a version.
- [ ] Rules reach ≥85% accuracy on the labelled fixture set.
- [ ] Within every group, ads are ordered by `(source_start_date asc nulls last, first_observed_at, library_id)`. A test checks this.
- [ ] Undated ads appear only in the "Start date not provided" section.
- [ ] Every date shown carries its type (source vs observed), precision and timezone label.
- [ ] Changing a URL normalisation rule and re-running normalisation updates `destination_url_normalized` and the grouping, with no code change.

**Provider resilience**
- [ ] An identical request within its TTL is served from cache, with no provider call recorded.
- [ ] A 429 is retried with backoff.
- [ ] Quota-exhausted surfaces a clear error.

**Security**
- [ ] No provider or AI key appears in client bundles. A CI grep of `.next/static` checks this.
- [ ] RLS tests show user A cannot read user B's workspace notes, tags or collections.

**Curation and AI**
- [ ] Bookmarks, collections, notes and tags persist across devices for the same user.
- [ ] AI extraction returns schema-valid JSON for 100% of a 50-ad sample. Missing information is `null`, not invented.
- [ ] Re-analysing an unchanged ad makes no model call.
- [ ] "Find similar" returns the ad's known duplicates or variants in the top 5 on the fixture set.

---

## 10. Decisions needed from you before Phase 0/1

1. **Primary provider:** approve SearchApi.io as primary and ScrapeCreators as secondary? Or run the one-week coverage spike first? A paid key is needed either way.
2. **Legal:** confirm someone will review the provider's terms and Meta's terms for your use case (internal research vs a product sold to clients).
3. **Tenancy:** single team workspace, or multiple client workspaces (agency model)?
4. **AI:** OK to default to `claude-opus-5-5`? Should we evaluate a cheaper model for bulk classification? Approve an embeddings provider (e.g. Voyage AI) for "similar ads"?
5. **Media storage:** store creative thumbnails in Supabase Storage (only if the licence allows), or always link out?
6. **Hosting:** Vercel + Supabase cloud?
