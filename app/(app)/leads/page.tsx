import Link from "next/link";
import { Download, Plus, Search, X } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession, canManage } from "@/lib/session";
import { SEGMENTS, buildWhere, filterQuery, filtersFrom } from "@/lib/filters";
import { CALL_OUTCOMES, STATUSES, TEMPERATURES, type CustomField, type Lead, type TeamMember } from "@/lib/leads";
import { LeadsGrid } from "@/components/leads-grid";
import { BizTabs } from "@/components/biz-tabs";
import { DeleteViewButton, SaveViewButton } from "@/components/save-view";

const PAGE_SIZE = 50;
const SORTS: Record<string, string> = {
  recent: "last_seen DESC NULLS LAST",
  score: "score DESC, last_seen DESC NULLS LAST",
  newest: "created_at DESC",
  oldest: "created_at ASC",
  entries: "entries DESC, last_seen DESC NULLS LAST",
  last_call: "last_call_at DESC NULLS LAST",
  updated: "updated_at DESC",
  name: "lower(name) ASC",
  spent: "total_spent DESC",
};

type SP = Promise<Record<string, string | undefined>>;

export default async function LeadsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const s = await requireSession();
  const f = filtersFrom(sp);
  const sort = sp.sort && SORTS[sp.sort] ? sp.sort : "recent";
  const page = Math.max(1, Number(sp.page) || 1);
  const segment = SEGMENTS.find((x) => x.id === f.segment);

  const sql = await db();
  const where = buildWhere(sql, f, s);
  const [[{ n }], leads, funnels, sources, fields, team, views] = await Promise.all([
    sql`SELECT count(*)::int AS n FROM leads ${where}`,
    sql<Lead[]>`SELECT * FROM leads ${where} ORDER BY ${sql.unsafe(SORTS[sort])}, id DESC
                LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
    sql<{ f: string }[]>`SELECT DISTINCT unnest(funnels) AS f FROM leads ORDER BY 1`,
    sql<{ s: string; n: number }[]>`SELECT utm_source AS s, count(*)::int AS n FROM leads WHERE utm_source IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 30`,
    sql<CustomField[]>`SELECT * FROM custom_fields ORDER BY position, id`,
    sql<TeamMember[]>`SELECT id, name, email, role, active FROM users ORDER BY name`,
    sql<{ id: number; name: string; query: string; user_id: number | null }[]>`
      SELECT id, name, query, user_id FROM saved_views WHERE shared OR user_id = ${s.uid} ORDER BY name`,
  ]);
  const pages = Math.max(1, Math.ceil(n / PAGE_SIZE));
  const fq = filterQuery(sp);
  const currentView = views.find((v) => v.query === filterQuery(sp, { sort: sp.sort ?? "" }) || v.query === fq);
  const qs = (over: Record<string, string>) => `/leads?${filterQuery(sp, { sort: sp.sort ?? "", ...over })}`;
  const filtered = fq.length > 0;
  const chip = (label: string, over: Record<string, string>) => {
    const on = Object.entries(over).every(([k, v]) => sp[k] === v);
    const href = on ? qs(Object.fromEntries(Object.keys(over).map((k) => [k, ""]))) : qs(over);
    return (
      <Link key={label} href={href} className={`badge border px-2.5 py-1 ${on ? "border-indigo-500 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}>
        {label}
      </Link>
    );
  };
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const weekAgo = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(Date.now() - 6 * 864e5));

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="page-title">{currentView?.name ?? segment?.title ?? "Leads"}</h1>
          <p className="text-sm muted">{n.toLocaleString("en-IN")} {filtered ? "matching" : "total"}{s.role === "caller" ? " · assigned to you" : ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BizTabs path="/leads" params={sp} />
          <SaveViewButton query={filterQuery(sp, { sort: sp.sort ?? "" })} canShare={canManage(s)} />
          {currentView && (currentView.user_id === s.uid || s.role === "admin") && <DeleteViewButton id={currentView.id} />}
          {canManage(s) && <a href={`/api/export?${fq}`} className="btn-ghost"><Download className="size-4" /> Export</a>}
          <Link href="/leads/new" className="btn-primary"><Plus className="size-4" /> Add lead</Link>
        </div>
      </div>

      {segment && (
        <div className="card border-indigo-200 bg-indigo-50/50 p-4 text-sm dark:border-indigo-900 dark:bg-indigo-950/30">
          <p>{segment.why}</p>
          <p className="mt-1"><b>Next step:</b> {segment.action}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 text-xs">
        {chip("Came in today", { from: today, to: today })}
        {chip("Last 7 days", { from: weekAgo, to: today })}
        {chip("🔥 Hot", { temp: "hot" })}
        {chip("Not called yet", { called: "no" })}
        {chip("Repeat leads", { repeat: "yes" })}
        {chip("Customers", { customer: "yes" })}
        {chip("Never bought", { customer: "no" })}
        {chip("My leads", { owner: "me" })}
        {canManage(s) && chip("Unassigned", { owner: "none" })}
      </div>

      <form className="card space-y-3 p-3" action="/leads">
        {Object.entries(sp).filter(([k]) => ["biz", "segment", "sort"].includes(k)).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-0 flex-1 basis-64">
            <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-slate-400" />
            <input name="q" defaultValue={f.q} placeholder="Search name, email, phone, city, niche, tags…" className="input pl-9" />
          </div>
          <select name="funnel" defaultValue={f.funnel ?? ""} className="input w-auto max-w-56">
            <option value="">All funnels</option>
            {funnels.map((x) => <option key={x.f} value={x.f}>{x.f}</option>)}
          </select>
          <select name="status" defaultValue={f.status ?? ""} className="input w-auto">
            <option value="">All statuses</option>
            {STATUSES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
          <select name="temp" defaultValue={f.temp ?? ""} className="input w-auto">
            <option value="">Any score</option>
            {TEMPERATURES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <button className="btn-primary">Apply</button>
          {filtered && <Link href="/leads" className="btn-ghost"><X className="size-4" /> Clear</Link>}
        </div>
        <details className="group" open={Boolean(f.from || f.to || f.owner || f.utm_source || f.repeat || f.called || f.outcome || f.customer || f.cf)}>
          <summary className="cursor-pointer text-xs font-medium text-indigo-600 select-none">More filters (date, team, UTM, calls, custom fields)</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <Field label="Came in from"><input type="date" name="from" defaultValue={f.from} className="input" /></Field>
            <Field label="Came in to"><input type="date" name="to" defaultValue={f.to} className="input" /></Field>
            {canManage(s) && (
              <Field label="Assigned to">
                <select name="owner" defaultValue={f.owner ?? ""} className="input">
                  <option value="">Anyone</option>
                  <option value="me">Me</option>
                  <option value="none">Unassigned</option>
                  {team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </Field>
            )}
            <Field label="UTM source">
              <select name="utm_source" defaultValue={f.utm_source ?? ""} className="input">
                <option value="">Any</option>
                <option value="(none)">No UTM</option>
                {sources.map((x) => <option key={x.s} value={x.s}>{x.s} ({x.n})</option>)}
              </select>
            </Field>
            <Field label="New or repeat">
              <select name="repeat" defaultValue={f.repeat ?? ""} className="input">
                <option value="">Both</option><option value="no">New only (1 entry)</option><option value="yes">Repeat (2+ entries)</option>
              </select>
            </Field>
            <Field label="Customer">
              <select name="customer" defaultValue={f.customer ?? ""} className="input">
                <option value="">Both</option><option value="yes">Customers</option><option value="no">Never bought</option>
              </select>
            </Field>
            <Field label="Called?">
              <select name="called" defaultValue={f.called ?? ""} className="input">
                <option value="">Either</option><option value="no">Not called yet</option><option value="yes">Called</option>
              </select>
            </Field>
            <Field label="Last call outcome">
              <select name="outcome" defaultValue={f.outcome ?? ""} className="input">
                <option value="">Any</option>
                {CALL_OUTCOMES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </Field>
            {fields.filter((x) => x.type === "select" || x.type === "checkbox").map((x) => (
              <Field key={x.key} label={x.label}>
                <select name={`cf_${x.key}`} defaultValue={f.cf?.[x.key] ?? ""} className="input">
                  <option value="">Any</option>
                  <option value="(empty)">Not filled</option>
                  {(x.type === "checkbox" ? ["yes"] : x.options).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
            ))}
            <Field label="Sort by">
              <select name="sort" defaultValue={sort} className="input">
                <option value="recent">Latest entry first</option>
                <option value="score">Best score first</option>
                <option value="newest">Newest people first</option>
                <option value="oldest">Oldest first</option>
                <option value="entries">Most entries (repeat)</option>
                <option value="last_call">Recently called</option>
                <option value="spent">Highest spend</option>
                <option value="name">Name A–Z</option>
              </select>
            </Field>
          </div>
        </details>
      </form>

      <LeadsGrid
        leads={leads.map((l) => ({ ...l }))}
        fields={fields.map((x) => ({ ...x }))}
        team={team.map((m) => ({ ...m }))}
        role={s.role}
        outreachHref={`/outreach?${fq}`}
      />

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          {page > 1 && <Link href={qs({ page: String(page - 1) })} className="btn-ghost">← Prev</Link>}
          <span className="muted">Page {page} of {pages}</span>
          {page < pages && <Link href={qs({ page: String(page + 1) })} className="btn-ghost">Next →</Link>}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="label">{label}</span>{children}</label>;
}
