"use client";

import { FormEvent, useMemo, useState } from "react";
import { AdCard } from "@/components/AdCard";
import { AdvertiserTable } from "@/components/AdvertiserTable";
import { hookOf, summariseAdvertisers, toCsv } from "@/lib/analysis";
import { downloadText } from "@/lib/download";
import { useSwipeFile } from "@/lib/swipeFile";
import type { Ad, SearchResponse } from "@/lib/types";

type Tab = "ads" | "advertisers" | "hooks";
type Sort = "longest" | "newest";

const COUNTRIES = ["IN", "US", "GB", "AE", "CA", "AU", "DE", "FR", "SG"];

export default function ResearchPage() {
  const [q, setQ] = useState("");
  const [pageIds, setPageIds] = useState("");
  const [country, setCountry] = useState("IN");
  const [status, setStatus] = useState("ACTIVE");
  const [media, setMedia] = useState("ALL");
  const [exact, setExact] = useState(false);

  const [ads, setAds] = useState<Ad[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const [tab, setTab] = useState<Tab>("ads");
  const [sort, setSort] = useState<Sort>("longest");
  const [minDays, setMinDays] = useState(0);
  const [pageFilter, setPageFilter] = useState<string | null>(null);

  const { isSaved, toggle } = useSwipeFile();

  async function run(after?: string) {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      q,
      pageIds: pageIds.replace(/\s+/g, ""),
      countries: country,
      status,
      media,
      searchType: exact ? "KEYWORD_EXACT_PHRASE" : "KEYWORD_UNORDERED",
      limit: "50",
    });
    if (after) params.set("after", after);
    try {
      const res = await fetch(`/api/ads?${params}`);
      const data = (await res.json()) as SearchResponse & { error?: string };
      if (data.error) throw new Error(data.error);
      setAds((prev) => (after ? [...prev, ...data.ads] : data.ads));
      setCursor(data.nextCursor);
      setDemo(data.demo);
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPageFilter(null);
    run();
  }

  const visible = useMemo(() => {
    const list = ads.filter((a) => a.daysRunning >= minDays && (!pageFilter || a.pageId === pageFilter));
    return list.sort((a, b) =>
      sort === "longest" ? b.daysRunning - a.daysRunning : (b.startTime ?? "").localeCompare(a.startTime ?? ""),
    );
  }, [ads, minDays, pageFilter, sort]);

  const advertisers = useMemo(() => summariseAdvertisers(visible), [visible]);
  const winners = visible.filter((a) => a.daysRunning >= 21).length;

  return (
    <>
      <form className="search" onSubmit={onSubmit}>
        <div className="row">
          <input
            className="grow"
            placeholder="Keyword, e.g. free workshop, skincare, real estate…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn btn-primary" disabled={loading}>
            {loading ? "Searching…" : "Search ads"}
          </button>
        </div>
        <div className="row filters">
          <label>
            Country
            <select value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ALL">All</option>
            </select>
          </label>
          <label>
            Media
            <select value={media} onChange={(e) => setMedia(e.target.value)}>
              <option value="ALL">All</option>
              <option value="VIDEO">Video</option>
              <option value="IMAGE">Image</option>
              <option value="MEME">Meme</option>
            </select>
          </label>
          <label className="grow">
            Page IDs (optional, comma-separated)
            <input value={pageIds} onChange={(e) => setPageIds(e.target.value)} placeholder="123456789, 987654321" />
          </label>
          <label className="check">
            <input type="checkbox" checked={exact} onChange={(e) => setExact(e.target.checked)} />
            Exact phrase
          </label>
        </div>
      </form>

      {demo && (
        <div className="notice">
          Demo mode — showing sample ads. Add <code>META_ACCESS_TOKEN</code> to <code>.env.local</code> to search the
          live Meta Ad Library.
        </div>
      )}
      {error && <div className="notice notice-error">{error}</div>}

      {searched && (
        <>
          <section className="stats">
            <Stat label="Ads found" value={ads.length} />
            <Stat label="Advertisers" value={summariseAdvertisers(ads).length} />
            <Stat label="Running 21+ days" value={winners} />
            <Stat label="Longest run" value={`${Math.max(0, ...visible.map((a) => a.daysRunning))}d`} />
          </section>

          <div className="toolbar">
            <div className="tabs">
              {(["ads", "advertisers", "hooks"] as Tab[]).map((t) => (
                <button key={t} className={tab === t ? "tab active" : "tab"} onClick={() => setTab(t)}>
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <div className="row">
              <label>
                Min days running
                <select value={minDays} onChange={(e) => setMinDays(Number(e.target.value))}>
                  {[0, 7, 21, 30, 60, 90].map((d) => (
                    <option key={d} value={d}>
                      {d === 0 ? "Any" : `${d}+`}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sort
                <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                  <option value="longest">Longest running</option>
                  <option value="newest">Newest</option>
                </select>
              </label>
              <button className="btn" onClick={() => downloadText("meta-ads.csv", toCsv(visible))} disabled={!visible.length}>
                Export CSV
              </button>
            </div>
          </div>

          {pageFilter && (
            <div className="notice">
              Showing one advertiser only.{" "}
              <button className="link" onClick={() => setPageFilter(null)}>
                Clear
              </button>
            </div>
          )}

          {!visible.length && <p className="muted">No ads match. Try a broader keyword or lower the minimum days.</p>}

          {tab === "ads" && (
            <div className="grid">
              {visible.map((ad) => (
                <AdCard key={ad.id} ad={ad} saved={isSaved(ad.id)} onToggleSave={toggle} />
              ))}
            </div>
          )}

          {tab === "advertisers" && (
            <AdvertiserTable
              rows={advertisers}
              onPick={(id) => {
                setPageFilter(id);
                setTab("ads");
              }}
            />
          )}

          {tab === "hooks" && (
            <ol className="hooks">
              {visible
                .filter((a) => hookOf(a))
                .map((a) => (
                  <li key={a.id}>
                    <span className="hook">“{hookOf(a)}”</span>
                    <span className="muted small">
                      {a.pageName} · {a.daysRunning}d
                    </span>
                    <button className="link small" onClick={() => navigator.clipboard?.writeText(hookOf(a))}>
                      Copy
                    </button>
                  </li>
                ))}
            </ol>
          )}

          {cursor && (
            <div className="center">
              <button className="btn" onClick={() => run(cursor)} disabled={loading}>
                {loading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}

      {!searched && !error && (
        <section className="empty">
          <h2>Research what&apos;s working on Facebook &amp; Instagram</h2>
          <ul>
            <li>Search the Meta Ad Library by keyword or competitor Page ID.</li>
            <li>Sort by days running — ads that run 21+ days are usually profitable.</li>
            <li>See which advertisers run the most ads and steal-worthy hooks.</li>
            <li>Save ads to your swipe file and export to CSV.</li>
          </ul>
        </section>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="muted small">{label}</div>
    </div>
  );
}
