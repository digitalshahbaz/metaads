import Link from "next/link";
import { db } from "@/lib/db";
import { STATUSES, formatDate, formatMoney, sourceLabel, type Lead } from "@/lib/leads";
import { StatusBadge } from "@/components/status-badge";

export default async function Dashboard() {
  const sql = await db();
  const [totals] = await sql`
    SELECT count(*)::int AS total,
      count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS week,
      count(*) FILTER (WHERE status = 'won')::int AS won,
      count(*) FILTER (WHERE status = 'lost')::int AS lost,
      coalesce(sum(value) FILTER (WHERE status NOT IN ('won','lost')), 0) AS open_value,
      coalesce(sum(value) FILTER (WHERE status = 'won'), 0) AS won_value
    FROM leads`;
  const byStatus = await sql<{ status: string; n: number }[]>`SELECT status, count(*)::int AS n FROM leads GROUP BY status`;
  const bySource = await sql<{ source: string; n: number }[]>`
    SELECT source, count(*)::int AS n FROM leads GROUP BY source ORDER BY n DESC LIMIT 8`;
  const followUps = await sql<Lead[]>`
    SELECT * FROM leads WHERE follow_up IS NOT NULL AND follow_up <= current_date + 7
      AND status NOT IN ('won','lost') ORDER BY follow_up LIMIT 10`;
  const recent = await sql<Lead[]>`SELECT * FROM leads ORDER BY created_at DESC LIMIT 6`;

  const closed = totals.won + totals.lost;
  const winRate = closed ? Math.round((totals.won / closed) * 100) : 0;
  const statusCount = (id: string) => byStatus.find((s) => s.status === id)?.n ?? 0;
  const maxSource = Math.max(1, ...bySource.map((s) => s.n));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total leads" value={totals.total} sub={`+${totals.week} this week`} />
        <Stat label="Open pipeline" value={formatMoney(totals.open_value)} sub="value of active leads" />
        <Stat label="Won" value={totals.won} sub={`${formatMoney(totals.won_value)} closed`} />
        <Stat label="Win rate" value={`${winRate}%`} sub={`${closed} closed leads`} />
      </div>

      <div className="card p-4">
        <h2 className="mb-3 font-medium">Pipeline</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {STATUSES.map((s) => (
            <Link key={s.id} href={`/leads?status=${s.id}`} className="rounded-lg border border-zinc-200 p-3 hover:border-indigo-400 dark:border-zinc-800">
              <div className="text-2xl font-semibold tabular-nums">{statusCount(s.id)}</div>
              <span className={`badge mt-1 ${s.color}`}>{s.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 font-medium">Follow-ups due (next 7 days)</h2>
          {followUps.length === 0 ? (
            <p className="text-sm text-zinc-500">Nothing due. 🎉</p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {followUps.map((l) => {
                const d = new Date(l.follow_up!).toISOString().slice(0, 10);
                return (
                  <li key={l.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <Link href={`/leads/${l.id}`} className="truncate font-medium hover:underline">{l.name}</Link>
                    <span className={d < today ? "font-medium text-red-600" : d === today ? "font-medium text-amber-600" : "text-zinc-500"}>
                      {d < today ? "Overdue · " : d === today ? "Today · " : ""}{formatDate(l.follow_up)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card p-4">
          <h2 className="mb-3 font-medium">Leads by source</h2>
          {bySource.length === 0 ? (
            <p className="text-sm text-zinc-500">No leads yet.</p>
          ) : (
            <ul className="space-y-2">
              {bySource.map((s) => (
                <li key={s.source} className="text-sm">
                  <div className="mb-1 flex justify-between"><span>{sourceLabel(s.source)}</span><span className="tabular-nums text-zinc-500">{s.n}</span></div>
                  <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${(s.n / maxSource) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Newest leads</h2>
          <Link href="/leads" className="text-sm text-indigo-600 hover:underline">View all →</Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-zinc-500">No leads yet. <Link href="/leads/new" className="text-indigo-600 hover:underline">Add your first lead</Link> or <Link href="/import" className="text-indigo-600 hover:underline">import a CSV</Link>.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {recent.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <Link href={`/leads/${l.id}`} className="min-w-0 truncate"><span className="font-medium">{l.name}</span> <span className="text-zinc-500">· {sourceLabel(l.source)}</span></Link>
                <StatusBadge status={l.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{sub}</div>
    </div>
  );
}
