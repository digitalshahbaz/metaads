import Link from "next/link";
import { db } from "@/lib/db";
import { STATUSES, isStatus, sourceLabel, type Lead } from "@/lib/leads";
import { LeadsTable } from "@/components/leads-table";

const PAGE_SIZE = 50;
const SORTS: Record<string, string> = {
  newest: "created_at DESC",
  oldest: "created_at ASC",
  updated: "updated_at DESC",
  name: "lower(name) ASC",
  value: "value DESC",
  follow_up: "follow_up ASC NULLS LAST",
};

type SP = Promise<Record<string, string | undefined>>;

export default async function LeadsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = isStatus(sp.status) ? sp.status : "";
  const source = sp.source ?? "";
  const sort = sp.sort && SORTS[sp.sort] ? sp.sort : "newest";
  const page = Math.max(1, Number(sp.page) || 1);

  const sql = await db();
  const like = `%${q}%`;
  const where = sql`
    WHERE TRUE
    ${q ? sql`AND (name ILIKE ${like} OR email ILIKE ${like} OR phone ILIKE ${like} OR company ILIKE ${like} OR notes ILIKE ${like} OR array_to_string(tags, ' ') ILIKE ${like})` : sql``}
    ${status ? sql`AND status = ${status}` : sql``}
    ${source ? sql`AND source = ${source}` : sql``}`;

  const [{ n }] = await sql`SELECT count(*)::int AS n FROM leads ${where}`;
  const leads = await sql<Lead[]>`
    SELECT * FROM leads ${where} ORDER BY ${sql.unsafe(SORTS[sort])}, id DESC
    LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`;
  const sources = await sql<{ source: string }[]>`SELECT DISTINCT source FROM leads ORDER BY source`;
  const pages = Math.max(1, Math.ceil(n / PAGE_SIZE));

  const qs = (over: Record<string, string | number>) => {
    const p = new URLSearchParams();
    const merged = { q, status, source, sort, page, ...over };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "page" && v === 1) && !(k === "sort" && v === "newest")) p.set(k, String(v));
    const s = p.toString();
    return s ? `/leads?${s}` : "/leads";
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Leads <span className="text-base font-normal text-zinc-500">({n})</span></h1>
        <div className="flex gap-2">
          <a href="/api/export" className="btn-ghost">Export CSV</a>
          <Link href="/leads/new" className="btn-primary">+ Add lead</Link>
        </div>
      </div>

      <form className="card flex flex-wrap gap-2 p-3" action="/leads">
        <input name="q" defaultValue={q} placeholder="Search name, email, phone, company, tags…" className="input min-w-0 flex-1 basis-60" />
        <select name="status" defaultValue={status} className="input w-auto">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select name="source" defaultValue={source} className="input w-auto">
          <option value="">All sources</option>
          {sources.map((s) => <option key={s.source} value={s.source}>{sourceLabel(s.source)}</option>)}
        </select>
        <select name="sort" defaultValue={sort} className="input w-auto">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="updated">Recently updated</option>
          <option value="name">Name A–Z</option>
          <option value="value">Highest value</option>
          <option value="follow_up">Follow-up date</option>
        </select>
        <button className="btn-primary">Filter</button>
        {(q || status || source) && <Link href="/leads" className="btn-ghost">Clear</Link>}
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
