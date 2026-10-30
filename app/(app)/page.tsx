import Link from "next/link";
import { ArrowUpRight, Flame, IndianRupee, PhoneCall, Repeat, UserPlus } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { CALL_OUTCOMES, formatDateTime, formatMoney, type Lead } from "@/lib/leads";
import { BusinessBadge, ScoreBadge } from "@/components/status-badge";
import { BizTabs } from "@/components/biz-tabs";
import { DailyChart, type DayPoint } from "@/components/daily-chart";

type SP = Promise<Record<string, string | undefined>>;

const RANGES = [
  { id: "today", label: "Today", days: 1 },
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "90d", label: "90 days", days: 90 },
  { id: "all", label: "All time", days: 3650 },
];
const REACHED = CALL_OUTCOMES.filter((o) => o.reached).map((o) => o.id);

export default async function Dashboard({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const s = await requireSession();
  const range = RANGES.find((r) => r.id === sp.range) ?? RANGES[2];
  const biz = sp.biz === "dmm" || sp.biz === "ds" ? sp.biz : "";
  const chartDays = Math.min(90, Math.max(7, range.days));
  const sql = await db();

  // Range start = IST midnight, N-1 days ago.
  const start = sql`((date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') - ${range.days - 1}::int * interval '1 day') AT TIME ZONE 'Asia/Kolkata')`;
  const leadScope = sql`
    ${biz ? sql`AND l.business IN (${biz}, 'both')` : sql``}
    ${s.role === "caller" ? sql`AND l.owner_id = ${s.uid}` : sql``}`;
  const tpScope = sql`${biz ? sql`AND t.business = ${biz}` : sql``} ${s.role === "caller" ? sql`AND l.owner_id = ${s.uid}` : sql``}`;
  const isRepeat = sql`t.captured_at > l.created_at + interval '10 minutes'`;

  const [[k], [calls], daily, sources, ads, funnels, team, hotUncalled, tasks, latest] = await Promise.all([
    sql`
      SELECT
        (SELECT count(*)::int FROM leads l WHERE l.created_at >= ${start} ${leadScope}) AS new_leads,
        (SELECT count(*)::int FROM leads l WHERE TRUE ${leadScope}) AS total,
        count(*)::int AS entries,
        count(*) FILTER (WHERE ${isRepeat})::int AS repeat_entries,
        count(DISTINCT t.lead_id) FILTER (WHERE ${isRepeat})::int AS repeat_people,
        count(DISTINCT t.lead_id) FILTER (WHERE (t.purchase->>'amount')::numeric > 0)::int AS buyers,
        coalesce(sum((t.purchase->>'amount')::numeric), 0) AS revenue
      FROM lead_touchpoints t JOIN leads l ON l.id = t.lead_id
      WHERE t.captured_at >= ${start} ${tpScope}`,
    sql`
      SELECT count(*)::int AS calls, count(*) FILTER (WHERE a.outcome = ANY(${REACHED}))::int AS connected,
             count(DISTINCT a.lead_id)::int AS people
      FROM lead_activities a JOIN leads l ON l.id = a.lead_id
      WHERE a.type = 'call' AND a.created_at >= ${start} ${leadScope}`,
    sql<DayPoint[]>`
      WITH days AS (
        SELECT generate_series(
          (now() AT TIME ZONE 'Asia/Kolkata')::date - ${chartDays - 1}::int,
          (now() AT TIME ZONE 'Asia/Kolkata')::date, interval '1 day')::date AS day
      )
      SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
        (SELECT count(*)::int FROM leads l WHERE (l.created_at AT TIME ZONE 'Asia/Kolkata')::date = d.day ${leadScope}) AS fresh,
        (SELECT count(*)::int FROM lead_touchpoints t JOIN leads l ON l.id = t.lead_id
          WHERE (t.captured_at AT TIME ZONE 'Asia/Kolkata')::date = d.day AND ${isRepeat} ${tpScope}) AS repeat
      FROM days d ORDER BY d.day`,
    sql<{ source: string; campaign: string | null; entries: number; people: number; fresh: number; buyers: number }[]>`
      SELECT coalesce(t.utm_source, '(no UTM)') AS source, t.utm_campaign AS campaign,
             count(*)::int AS entries, count(DISTINCT t.lead_id)::int AS people,
             count(*) FILTER (WHERE NOT ${isRepeat})::int AS fresh,
             count(DISTINCT t.lead_id) FILTER (WHERE l.is_customer)::int AS buyers
      FROM lead_touchpoints t JOIN leads l ON l.id = t.lead_id
      WHERE t.captured_at >= ${start} ${tpScope}
      GROUP BY 1, 2 ORDER BY entries DESC LIMIT 12`,
    sql<{ ad: string; campaign: string | null; entries: number; buyers: number }[]>`
      SELECT t.utm_content AS ad, max(t.utm_campaign) AS campaign, count(*)::int AS entries,
             count(DISTINCT t.lead_id) FILTER (WHERE l.is_customer)::int AS buyers
      FROM lead_touchpoints t JOIN leads l ON l.id = t.lead_id
      WHERE t.captured_at >= ${start} AND t.utm_content IS NOT NULL ${tpScope}
      GROUP BY 1 ORDER BY entries DESC LIMIT 8`,
    sql<{ funnel: string; business: string; entries: number; fresh: number; repeat: number; sales: number }[]>`
      SELECT t.funnel, max(t.business) AS business, count(*)::int AS entries,
             count(*) FILTER (WHERE NOT ${isRepeat})::int AS fresh, count(*) FILTER (WHERE ${isRepeat})::int AS repeat,
             count(*) FILTER (WHERE (t.purchase->>'amount')::numeric > 0)::int AS sales
      FROM lead_touchpoints t JOIN leads l ON l.id = t.lead_id
      WHERE t.captured_at >= ${start} ${tpScope}
      GROUP BY 1 ORDER BY entries DESC LIMIT 12`,
    s.role === "caller" ? Promise.resolve([]) : sql<{ name: string; calls: number; connected: number; interested: number; assigned: number }[]>`
      SELECT u.name,
        (SELECT count(*)::int FROM lead_activities a WHERE a.user_id = u.id AND a.type = 'call' AND a.created_at >= ${start}) AS calls,
        (SELECT count(*)::int FROM lead_activities a WHERE a.user_id = u.id AND a.type = 'call' AND a.created_at >= ${start} AND a.outcome = ANY(${REACHED})) AS connected,
        (SELECT count(*)::int FROM lead_activities a WHERE a.user_id = u.id AND a.type = 'call' AND a.created_at >= ${start} AND a.outcome = 'interested') AS interested,
        (SELECT count(*)::int FROM leads l WHERE l.owner_id = u.id) AS assigned
      FROM users u WHERE u.active ORDER BY calls DESC, u.name LIMIT 10`,
    sql<Lead[]>`
      SELECT * FROM leads l WHERE l.temperature = 'hot' AND l.call_count = 0 AND l.status NOT IN ('won','lost') ${leadScope}
      ORDER BY l.score DESC, l.last_seen DESC NULLS LAST LIMIT 8`,
    sql<{ id: number; title: string; due_at: Date; lead_id: number | null; lead_name: string | null }[]>`
      SELECT t.id, t.title, t.due_at, t.lead_id, l.name AS lead_name FROM tasks t LEFT JOIN leads l ON l.id = t.lead_id
      WHERE t.user_id = ${s.uid} AND t.done_at IS NULL
        AND t.due_at < (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') + interval '1 day') AT TIME ZONE 'Asia/Kolkata'
      ORDER BY t.due_at LIMIT 6`,
    sql<{ id: number; lead_id: number; name: string; funnel: string; captured_at: Date; utm_source: string | null; utm_campaign: string | null; repeat: boolean; business: string }[]>`
      SELECT t.id, t.lead_id, l.name, t.funnel, t.captured_at, t.utm_source, t.utm_campaign, ${isRepeat} AS repeat, t.business
      FROM lead_touchpoints t JOIN leads l ON l.id = t.lead_id
      WHERE t.captured_at IS NOT NULL AND t.captured_at <= now() ${tpScope}
      ORDER BY t.captured_at DESC LIMIT 10`,
  ]);

  const q = (extra: string) => `?${[biz ? `biz=${biz}` : "", sp.range ? `range=${sp.range}` : "", extra].filter(Boolean).join("&")}`;
  const leadsQ = (extra: string) => `/leads?${[biz ? `biz=${biz}` : "", extra].filter(Boolean).join("&")}`;
  const connectRate = calls.calls ? Math.round((calls.connected / calls.calls) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm muted">{k.total.toLocaleString("en-IN")} people in the CRM{s.role === "caller" ? " assigned to you" : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm dark:border-slate-800 dark:bg-slate-900">
            {RANGES.map((r) => (
              <Link key={r.id} href={`/?${[biz ? `biz=${biz}` : "", `range=${r.id}`].filter(Boolean).join("&")}`}
                className={`rounded-md px-3 py-1.5 ${range.id === r.id ? "bg-slate-900 font-medium text-white dark:bg-white dark:text-slate-900" : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}>
                {r.label}
              </Link>
            ))}
          </div>
          <BizTabs path="/" params={sp} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi icon={UserPlus} label="New leads" value={k.new_leads} sub={`first time in ${range.label.toLowerCase()}`} href={leadsQ("sort=newest")} />
        <Kpi icon={Repeat} label="Repeat entries" value={k.repeat_entries} sub={`${k.repeat_people} people came back`} href={leadsQ("repeat=yes&sort=recent")} />
        <Kpi icon={IndianRupee} label="Revenue" value={`₹${formatMoney(k.revenue)}`} sub={`${k.buyers} buyers`} href={leadsQ("customer=yes&sort=spent")} />
        <Kpi icon={PhoneCall} label="Calls made" value={calls.calls} sub={`${connectRate}% connected · ${calls.people} people`} href="/reports" />
        <Kpi icon={Flame} label="Hot, not called" value={hotUncalled.length >= 8 ? "8+" : hotUncalled.length} sub="call these first" href={leadsQ("temp=hot&called=no")} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h2 className="font-semibold">Leads per day</h2>
          <p className="mb-3 text-xs muted">New people vs. people who came in again (another form, purchase or webinar), IST.</p>
          <DailyChart data={daily.map((d) => ({ ...d }))} />
        </section>
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Due today</h2>
            <Link href="/tasks" className="text-sm text-indigo-600 hover:underline">All tasks</Link>
          </div>
          {tasks.length === 0 ? <p className="text-sm muted">No tasks due. 🎉</p> : (
            <ul className="space-y-2 text-sm">
              {tasks.map((t) => (
                <li key={t.id} className="rounded-lg border border-slate-100 p-2.5 dark:border-slate-800">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs muted">
                    {new Date(t.due_at) < new Date() ? <span className="text-red-600">Overdue · </span> : null}
                    {formatDateTime(t.due_at)}
                    {t.lead_id && <> · <Link href={`/leads/${t.lead_id}`} className="text-indigo-600 hover:underline">{t.lead_name}</Link></>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <h2 className="font-semibold">Where leads came from</h2>
            <p className="text-xs muted">By UTM source & campaign (Meta ads, website forms…) in {range.label.toLowerCase()}.</p>
          </div>
          <DataTable
            head={["Source / campaign", "Entries", "New", "Buyers"]}
            rows={sources.map((r) => [
              <Link key="s" href={leadsQ(`utm_source=${encodeURIComponent(r.source)}${r.campaign ? `&utm_campaign=${encodeURIComponent(r.campaign)}` : ""}`)} className="hover:text-indigo-600">
                <div className="font-medium">{r.source}</div>
                {r.campaign && <div className="max-w-64 truncate text-xs muted">{r.campaign}</div>}
              </Link>,
              r.entries, r.fresh, r.buyers,
            ])}
            empty="No entries in this range."
          />
        </section>
        <section className="card overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <h2 className="font-semibold">Funnels</h2>
            <p className="text-xs muted">Every form fill / purchase, split into new vs. repeat people.</p>
          </div>
          <DataTable
            head={["Funnel", "Entries", "New", "Repeat", "Sales"]}
            rows={funnels.map((r) => [
              <Link key="f" href={leadsQ(`funnel=${encodeURIComponent(r.funnel)}`)} className="flex items-center gap-1.5 hover:text-indigo-600">
                <BusinessBadge business={r.business} /> <span className="max-w-52 truncate">{r.funnel}</span>
              </Link>,
              r.entries, r.fresh, r.repeat, r.sales,
            ])}
            empty="No entries in this range."
          />
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {ads.length > 0 && (
          <section className="card overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <h2 className="font-semibold">Top ads (utm_content)</h2>
              <p className="text-xs muted">Which ad creatives bring leads, and how many became buyers.</p>
            </div>
            <DataTable
              head={["Ad", "Entries", "Buyers"]}
              rows={ads.map((r) => [
                <Link key="a" href={leadsQ(`utm_content=${encodeURIComponent(r.ad)}`)} className="hover:text-indigo-600">
                  <div className="max-w-72 truncate font-medium">{r.ad}</div>
                  {r.campaign && <div className="max-w-72 truncate text-xs muted">{r.campaign}</div>}
                </Link>,
                r.entries, r.buyers,
              ])}
            />
          </section>
        )}
        {team.length > 0 && (
          <section className="card overflow-hidden">
            <div className="flex items-start justify-between px-5 pt-5 pb-3">
              <div>
                <h2 className="font-semibold">Team calling</h2>
                <p className="text-xs muted">Calls logged in {range.label.toLowerCase()}.</p>
              </div>
              <Link href={`/reports${q("")}`} className="text-sm text-indigo-600 hover:underline">Details</Link>
            </div>
            <DataTable
              head={["Member", "Calls", "Connected", "Interested", "Assigned"]}
              rows={team.map((r) => [<span key="n" className="font-medium">{r.name}</span>, r.calls, r.connected, r.interested, r.assigned])}
            />
          </section>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Hot leads not called yet</h2>
            <Link href={leadsQ("temp=hot&called=no")} className="text-sm text-indigo-600 hover:underline">See all</Link>
          </div>
          {hotUncalled.length === 0 ? <p className="text-sm muted">Every hot lead has been called. 💪</p> : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {hotUncalled.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <Link href={`/leads/${l.id}`} className="min-w-0 truncate">
                    <span className="font-medium">{l.name}</span>
                    <span className="muted"> · {l.funnels[l.funnels.length - 1]}</span>
                  </Link>
                  <span className="flex shrink-0 gap-1"><BusinessBadge business={l.business} /><ScoreBadge score={l.score} temperature={l.temperature} /></span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Latest entries</h2>
          {latest.length === 0 ? <p className="text-sm muted">Nothing yet.</p> : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {latest.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <Link href={`/leads/${t.lead_id}`} className="min-w-0">
                    <div className="truncate"><span className="font-medium">{t.name}</span> <span className="muted">· {t.funnel}</span></div>
                    <div className="text-xs muted">{formatDateTime(t.captured_at)}{t.utm_source ? ` · ${t.utm_source}${t.utm_campaign ? ` / ${t.utm_campaign}` : ""}` : ""}</div>
                  </Link>
                  {t.repeat
                    ? <span className="badge shrink-0 bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200">Repeat</span>
                    : <span className="badge shrink-0 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">New</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, href }: { icon: React.ElementType; label: string; value: string | number; sub: string; href: string }) {
  return (
    <Link href={href} className="card group p-4 transition hover:border-indigo-300 hover:shadow-md">
      <div className="flex items-center justify-between text-xs font-medium muted">
        <span className="flex items-center gap-1.5"><Icon className="size-3.5" /> {label}</span>
        <ArrowUpRight className="size-3.5 opacity-0 transition group-hover:opacity-100" />
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{typeof value === "number" ? value.toLocaleString("en-IN") : value}</div>
      <div className="mt-0.5 truncate text-xs muted">{sub}</div>
    </Link>
  );
}

function DataTable({ head, rows, empty }: { head: string[]; rows: React.ReactNode[][]; empty?: string }) {
  if (rows.length === 0) return <p className="px-5 pb-5 text-sm muted">{empty ?? "No data."}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-y border-slate-100 bg-slate-50/60 text-xs muted dark:border-slate-800 dark:bg-slate-800/30">
          <tr>{head.map((h, i) => <th key={h} className={`px-5 py-2 font-medium ${i ? "text-right" : "text-left"}`}>{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j} className={`px-5 py-2 ${j ? "text-right tabular-nums" : ""}`}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
