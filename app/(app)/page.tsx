import Link from "next/link";
import { db } from "@/lib/db";
import { buildWhere } from "@/lib/filters";
import { STATUSES, TEMPERATURES, formatDate, formatMoney, type Lead } from "@/lib/leads";
import { BusinessBadge, ScoreBadge, StatusBadge } from "@/components/status-badge";
import { BizTabs } from "@/components/biz-tabs";

type SP = Promise<Record<string, string | undefined>>;

export default async function Dashboard({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const biz = sp.biz === "dmm" || sp.biz === "ds" ? sp.biz : "";
  const sql = await db();
  const where = buildWhere(sql, { biz });
  const bizQs = biz ? `biz=${biz}&` : "";

  const [totals] = await sql`
    SELECT count(*)::int AS total,
      count(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS month,
      count(*) FILTER (WHERE is_customer)::int AS customers,
      coalesce(sum(total_spent), 0) AS revenue,
      count(*) FILTER (WHERE temperature = 'hot')::int AS hot,
      count(*) FILTER (WHERE temperature = 'warm')::int AS warm,
      count(*) FILTER (WHERE temperature = 'cold')::int AS cold,
      count(*) FILTER (WHERE business = 'dmm')::int AS dmm,
      count(*) FILTER (WHERE business = 'ds')::int AS ds,
      count(*) FILTER (WHERE business = 'both')::int AS both,
      count(*) FILTER (WHERE status = 'won')::int AS won,
      count(*) FILTER (WHERE status = 'lost')::int AS lost
    FROM leads ${where}`;
  const byStatus = await sql<{ status: string; n: number }[]>`SELECT status, count(*)::int AS n FROM leads ${where} GROUP BY status`;
  const byFunnel = await sql<{ funnel: string; n: number; buyers: number }[]>`
    SELECT f AS funnel, count(*)::int AS n, count(*) FILTER (WHERE is_customer)::int AS buyers
    FROM leads, unnest(funnels) f ${where} GROUP BY f ORDER BY n DESC LIMIT 16`;
  const hot = await sql<Lead[]>`
    SELECT * FROM leads ${where} AND status NOT IN ('won','lost') ORDER BY score DESC, last_seen DESC NULLS LAST LIMIT 8`;
  const followUps = await sql<Lead[]>`
    SELECT * FROM leads ${where} AND follow_up IS NOT NULL AND follow_up <= current_date + 7
      AND status NOT IN ('won','lost') ORDER BY follow_up LIMIT 8`;

  const statusCount = (id: string) => byStatus.find((s) => s.status === id)?.n ?? 0;
  const maxFunnel = Math.max(1, ...byFunnel.map((s) => s.n));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <BizTabs path="/" params={sp} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total leads" value={totals.total.toLocaleString("en-IN")} sub={`+${totals.month} in last 30 days`} href={`/leads?${bizQs}`} />
        <Stat label="Hot leads" value={totals.hot} sub={`${totals.warm} warm · ${totals.cold} cold`} href={`/leads?${bizQs}temp=hot&sort=score`} />
        <Stat label="Customers" value={totals.customers.toLocaleString("en-IN")} sub="bought at least once" href={`/leads?${bizQs}customer=yes`} />
        <Stat label="Revenue tracked" value={`₹${formatMoney(totals.revenue)}`} sub="from imported purchases" href={`/leads?${bizQs}customer=yes&sort=spent`} />
      </div>

      {!biz && (
        <div className="grid gap-3 sm:grid-cols-3">
          <BizCard href="/?biz=dmm" title="Digimark Media" sub="Service · coaches & business owners" n={totals.dmm + totals.both} />
          <BizCard href="/?biz=ds" title="Digital Shahbaz" sub="Education · courses & masterclasses" n={totals.ds + totals.both} />
          <BizCard href="/leads?biz=both" title="In both businesses" sub="Cross-sell opportunities" n={totals.both} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Call these next</h2>
            <Link href={`/leads?${bizQs}sort=score`} className="text-sm text-indigo-600 hover:underline">All by score →</Link>
          </div>
          {hot.length === 0 ? (
            <p className="text-sm text-zinc-500">No open leads yet. <Link href="/import" className="text-indigo-600 hover:underline">Import leads</Link>.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {hot.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <Link href={`/leads/${l.id}`} className="min-w-0 truncate">
                    <span className="font-medium">{l.name}</span>
                    <span className="text-zinc-500"> · {l.funnels.length} funnel{l.funnels.length === 1 ? "" : "s"}{l.is_customer ? (Number(l.total_spent) > 0 ? ` · spent ₹${formatMoney(l.total_spent)}` : " · customer") : ""}</span>
                  </Link>
                  <span className="flex shrink-0 gap-1"><BusinessBadge business={l.business} /><ScoreBadge score={l.score} temperature={l.temperature} /></span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-4">
          <h2 className="mb-3 font-medium">Leads by funnel</h2>
          {byFunnel.length === 0 ? (
            <p className="text-sm text-zinc-500">No leads yet.</p>
          ) : (
            <ul className="space-y-2">
              {byFunnel.map((s) => (
                <li key={s.funnel} className="text-sm">
                  <Link href={`/leads?${bizQs}funnel=${encodeURIComponent(s.funnel)}`} className="mb-1 flex justify-between gap-2 hover:text-indigo-600">
                    <span className="truncate">{s.funnel}</span>
                    <span className="shrink-0 tabular-nums text-zinc-500">{s.n}{s.buyers ? ` · ${s.buyers} bought` : ""}</span>
                  </Link>
                  <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${(s.n / maxFunnel) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-4">
        <h2 className="mb-3 font-medium">Pipeline</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {STATUSES.map((s) => (
            <Link key={s.id} href={`/leads?${bizQs}status=${s.id}`} className="rounded-lg border border-zinc-200 p-3 hover:border-indigo-400 dark:border-zinc-800">
              <div className="text-2xl font-semibold tabular-nums">{statusCount(s.id).toLocaleString("en-IN")}</div>
              <span className={`badge mt-1 ${s.color}`}>{s.label}</span>
            </Link>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {TEMPERATURES.map((t) => (
            <Link key={t.id} href={`/leads?${bizQs}temp=${t.id}`} className={`badge ${t.color}`}>
              {t.label}: {(totals as Record<string, number>)[t.id]}
            </Link>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <h2 className="mb-3 font-medium">Follow-ups due (next 7 days)</h2>
        {followUps.length === 0 ? (
          <p className="text-sm text-zinc-500">Nothing due. Set a follow-up date on a lead to see it here.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {followUps.map((l) => {
              const d = new Date(l.follow_up!).toISOString().slice(0, 10);
              return (
                <li key={l.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <Link href={`/leads/${l.id}`} className="truncate font-medium hover:underline">{l.name}</Link>
                  <span className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={l.status} />
                    <span className={d < today ? "font-medium text-red-600" : d === today ? "font-medium text-amber-600" : "text-zinc-500"}>
                      {d < today ? "Overdue · " : d === today ? "Today · " : ""}{formatDate(l.follow_up)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, href }: { label: string; value: string | number; sub: string; href: string }) {
  return (
    <Link href={href} className="card p-4 hover:border-indigo-400">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{sub}</div>
    </Link>
  );
}

function BizCard({ href, title, sub, n }: { href: string; title: string; sub: string; n: number }) {
  return (
    <Link href={href} className="card flex items-center justify-between gap-3 p-4 hover:border-indigo-400">
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-xs text-zinc-500">{sub}</div>
      </div>
      <div className="text-2xl font-semibold tabular-nums">{n.toLocaleString("en-IN")}</div>
    </Link>
  );
}
