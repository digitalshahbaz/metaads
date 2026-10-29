import Link from "next/link";
import { db } from "@/lib/db";
import { SEGMENTS, buildWhere, filtersFrom } from "@/lib/filters";
import { STATUSES, TEMPERATURES, type Lead } from "@/lib/leads";
import { LeadsTable } from "@/components/leads-table";
import { BizTabs } from "@/components/biz-tabs";

const PAGE_SIZE = 50;
const SORTS: Record<string, string> = {
  score: "score DESC, last_seen DESC NULLS LAST",
  newest: "created_at DESC",
  oldest: "created_at ASC",
  recent: "last_seen DESC NULLS LAST",
  updated: "updated_at DESC",
  name: "lower(name) ASC",
  spent: "total_spent DESC",
  value: "value DESC",
  follow_up: "follow_up ASC NULLS LAST",
};

type SP = Promise<Record<string, string | undefined>>;

export default async function LeadsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const f = filtersFrom(sp);
  const sort = sp.sort && SORTS[sp.sort] ? sp.sort : "score";
  const page = Math.max(1, Number(sp.page) || 1);
  const segment = SEGMENTS.find((s) => s.id === f.segment);

  const sql = await db();
  const where = buildWhere(sql, f);
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM leads ${where}`;
  const leads = await sql<Lead[]>`
    SELECT * FROM leads ${where} ORDER BY ${sql.unsafe(SORTS[sort])}, id DESC
    LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`;
  const funnels = await sql<{ f: string }[]>`SELECT DISTINCT unnest(funnels) AS f FROM leads ORDER BY 1`;
  const pages = Math.max(1, Math.ceil(n / PAGE_SIZE));

  const current: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...f, sort })) if (v) current[k] = v;
  const qs = (over: Record<string, string | number>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...current, ...over })) if (v && !(k === "page" && v === 1)) p.set(k, String(v));
    return `/leads?${p.toString()}`;
  };
  const exportQs = new URLSearchParams(Object.entries(current).filter(([k]) => k !== "sort")).toString();
  const filtered = Boolean(f.q || f.status || f.source || f.biz || f.funnel || f.temp || f.customer || f.segment);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Leads <span className="text-base font-normal text-zinc-500">({n.toLocaleString("en-IN")})</span></h1>
        <div className="flex flex-wrap gap-2">
          <BizTabs path="/leads" params={sp} />
          <a href={`/api/export${exportQs ? `?${exportQs}` : ""}`} className="btn-ghost">Export {filtered ? "these" : "all"} (CSV)</a>
          <Link href="/leads/new" className="btn-primary">+ Add lead</Link>
        </div>
      </div>

      {segment && (
        <div className="card border-indigo-300 p-4 text-sm dark:border-indigo-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium">Segment: {segment.title}</div>
            <Link href={qs({ segment: "", page: 1 })} className="text-zinc-500 hover:underline">Remove segment ✕</Link>
          </div>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">{segment.why}</p>
          <p className="mt-1"><b>Next step:</b> {segment.action}</p>
        </div>
      )}

      <form className="card flex flex-wrap gap-2 p-3" action="/leads">
        {f.biz && <input type="hidden" name="biz" value={f.biz} />}
        {f.segment && <input type="hidden" name="segment" value={f.segment} />}
        <input name="q" defaultValue={f.q} placeholder="Search name, email, phone, city, niche, tags…" className="input min-w-0 flex-1 basis-60" />
        <select name="funnel" defaultValue={f.funnel ?? ""} className="input w-auto max-w-56">
          <option value="">All funnels</option>
          {funnels.map((x) => <option key={x.f} value={x.f}>{x.f}</option>)}
        </select>
        <select name="temp" defaultValue={f.temp ?? ""} className="input w-auto">
          <option value="">Any temperature</option>
          {TEMPERATURES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select name="customer" defaultValue={f.customer ?? ""} className="input w-auto">
          <option value="">Buyers + non-buyers</option>
          <option value="yes">Customers only</option>
          <option value="no">Never bought</option>
        </select>
        <select name="status" defaultValue={f.status ?? ""} className="input w-auto">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select name="sort" defaultValue={sort} className="input w-auto">
          <option value="score">Best leads first</option>
          <option value="recent">Recently active</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="spent">Highest spend</option>
          <option value="updated">Recently updated</option>
          <option value="name">Name A–Z</option>
          <option value="follow_up">Follow-up date</option>
        </select>
        <button className="btn-primary">Filter</button>
        {filtered && <Link href="/leads" className="btn-ghost">Clear</Link>}
      </form>

      <LeadsTable leads={leads.map((l) => ({ ...l }))} />

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          {page > 1 && <Link href={qs({ page: page - 1 })} className="btn-ghost">← Prev</Link>}
          <span className="text-zinc-500">Page {page} of {pages}</span>
          {page < pages && <Link href={qs({ page: page + 1 })} className="btn-ghost">Next →</Link>}
        </div>
      )}
    </div>
  );
}
