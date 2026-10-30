import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { canManage, requireSession } from "@/lib/session";
import { CALL_OUTCOMES, formatMoney } from "@/lib/leads";

type SP = Promise<Record<string, string | undefined>>;
const RANGES = [{ id: "today", label: "Today", days: 1 }, { id: "7d", label: "7 days", days: 7 }, { id: "30d", label: "30 days", days: 30 }, { id: "90d", label: "90 days", days: 90 }];
const REACHED = CALL_OUTCOMES.filter((o) => o.reached).map((o) => o.id);

export default async function ReportsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const s = await requireSession();
  if (!canManage(s)) redirect("/");
  const range = RANGES.find((r) => r.id === sp.range) ?? RANGES[1];
  const sql = await db();
  const start = sql`((date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') - ${range.days - 1}::int * interval '1 day') AT TIME ZONE 'Asia/Kolkata')`;
  const [members, outcomes, [speed], perDay] = await Promise.all([
    sql<{ id: number; name: string; role: string; calls: number; reached: number; interested: number; people: number; talk: number; tasks_done: number; tasks_open: number; won: number; won_amount: string; assigned: number; uncalled: number }[]>`
      SELECT u.id, u.name, u.role,
        count(a.id)::int AS calls,
        count(a.id) FILTER (WHERE a.outcome = ANY(${REACHED}))::int AS reached,
        count(a.id) FILTER (WHERE a.outcome = 'interested')::int AS interested,
        count(DISTINCT a.lead_id)::int AS people,
        coalesce(sum(a.duration_sec), 0)::int AS talk,
        (SELECT count(*)::int FROM tasks t WHERE t.user_id = u.id AND t.done_at >= ${start}) AS tasks_done,
        (SELECT count(*)::int FROM tasks t WHERE t.user_id = u.id AND t.done_at IS NULL AND t.due_at < now()) AS tasks_open,
        (SELECT count(*)::int FROM deals d WHERE d.owner_id = u.id AND d.stage = 'won' AND d.closed_at >= ${start}) AS won,
        (SELECT coalesce(sum(d.amount), 0) FROM deals d WHERE d.owner_id = u.id AND d.stage = 'won' AND d.closed_at >= ${start}) AS won_amount,
        (SELECT count(*)::int FROM leads l WHERE l.owner_id = u.id) AS assigned,
        (SELECT count(*)::int FROM leads l WHERE l.owner_id = u.id AND l.call_count = 0) AS uncalled
      FROM users u LEFT JOIN lead_activities a ON a.user_id = u.id AND a.type = 'call' AND a.created_at >= ${start}
      WHERE u.active GROUP BY u.id ORDER BY calls DESC, u.name`,
    sql<{ outcome: string; n: number }[]>`
      SELECT outcome, count(*)::int AS n FROM lead_activities WHERE type = 'call' AND created_at >= ${start} GROUP BY 1 ORDER BY 2 DESC`,
    sql<{ leads: number; called: number; within1h: number; within24h: number; avg_hours: number | null }[]>`
      WITH f AS (
        SELECT l.id, l.created_at, min(a.created_at) AS first_call
        FROM leads l LEFT JOIN lead_activities a ON a.lead_id = l.id AND a.type = 'call'
        WHERE l.created_at >= ${start} GROUP BY l.id
      )
      SELECT count(*)::int AS leads, count(first_call)::int AS called,
        count(*) FILTER (WHERE first_call - created_at <= interval '1 hour')::int AS within1h,
        count(*) FILTER (WHERE first_call - created_at <= interval '24 hours')::int AS within24h,
        round(avg(extract(epoch FROM first_call - created_at) / 3600)::numeric, 1)::float AS avg_hours
      FROM f`,
    sql<{ day: string; calls: number; reached: number }[]>`
      SELECT to_char((created_at AT TIME ZONE 'Asia/Kolkata')::date, 'DD Mon') AS day, count(*)::int AS calls,
             count(*) FILTER (WHERE outcome = ANY(${REACHED}))::int AS reached
      FROM lead_activities WHERE type = 'call' AND created_at >= ${start}
      GROUP BY (created_at AT TIME ZONE 'Asia/Kolkata')::date ORDER BY (created_at AT TIME ZONE 'Asia/Kolkata')::date DESC LIMIT 31`,
  ]);
  const total = outcomes.reduce((a, o) => a + o.n, 0);
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Team & calls</h1>
          <p className="text-sm muted">Who called whom, how many connected, and how fast new leads get their first call.</p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm dark:border-slate-800 dark:bg-slate-900">
          {RANGES.map((r) => (
            <Link key={r.id} href={`/reports?range=${r.id}`} className={`rounded-md px-3 py-1.5 ${range.id === r.id ? "bg-slate-900 font-medium text-white dark:bg-white dark:text-slate-900" : "text-slate-600 hover:bg-slate-100 dark:text-slate-400"}`}>{r.label}</Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Calls logged" value={total} sub={`${pct(outcomes.filter((o) => REACHED.includes(o.outcome as never)).reduce((a, o) => a + o.n, 0), total)} connected`} />
        <Stat label="New leads called" value={`${speed.called}/${speed.leads}`} sub={`${pct(speed.called, speed.leads)} of new leads`} />
        <Stat label="Called within 1 hour" value={pct(speed.within1h, speed.leads)} sub={`${pct(speed.within24h, speed.leads)} within 24 hours`} />
        <Stat label="Avg. time to first call" value={speed.avg_hours != null ? `${speed.avg_hours}h` : "—"} sub="faster = more sales" />
      </div>

      <section className="card overflow-hidden">
        <div className="px-5 pt-5 pb-3"><h2 className="font-semibold">By team member</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-slate-100 bg-slate-50/60 text-xs muted dark:border-slate-800 dark:bg-slate-800/30">
              <tr>{["Member", "Calls", "Connected", "Connect %", "Interested", "People called", "Talk time", "Tasks done", "Overdue tasks", "Won", "Assigned", "Not called yet"].map((h, i) => (
                <th key={h} className={`px-4 py-2 font-medium whitespace-nowrap ${i ? "text-right" : "text-left"}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2"><div className="font-medium">{m.name}</div><div className="text-xs capitalize muted">{m.role}</div></td>
                  {[m.calls, m.reached, pct(m.reached, m.calls), m.interested, m.people, `${Math.round(m.talk / 60)} min`, m.tasks_done, m.tasks_open,
                    m.won ? `${m.won} · ₹${formatMoney(m.won_amount)}` : 0, m.assigned].map((v, i) => (
                    <td key={i} className="px-4 py-2 text-right tabular-nums">{v}</td>
                  ))}
                  <td className="px-4 py-2 text-right tabular-nums">
                    {m.uncalled ? <Link href={`/leads?owner=${m.id}&called=no`} className="text-indigo-600 hover:underline">{m.uncalled}</Link> : 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Call outcomes</h2>
          {total === 0 ? <p className="text-sm muted">No calls logged in this range.</p> : (
            <ul className="space-y-2 text-sm">
              {outcomes.map((o) => {
                const meta = CALL_OUTCOMES.find((x) => x.id === o.outcome);
                return (
                  <li key={o.outcome}>
                    <div className="mb-1 flex justify-between"><Link href={`/leads?outcome=${o.outcome}`} className="hover:text-indigo-600">{meta?.label ?? o.outcome}</Link><span className="tabular-nums muted">{o.n} · {pct(o.n, total)}</span></div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full" style={{ width: `${(o.n / total) * 100}%`, background: "var(--series-1)" }} /></div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Calls per day</h2>
          {perDay.length === 0 ? <p className="text-sm muted">No calls logged in this range.</p> : (
            <table className="w-full text-sm">
              <thead className="text-xs muted"><tr><th className="py-1 text-left font-medium">Day</th><th className="text-right font-medium">Calls</th><th className="text-right font-medium">Connected</th></tr></thead>
              <tbody>{perDay.map((d) => <tr key={d.day} className="border-t border-slate-100 dark:border-slate-800"><td className="py-1.5">{d.day}</td><td className="text-right tabular-nums">{d.calls}</td><td className="text-right tabular-nums">{d.reached}</td></tr>)}</tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs muted">{sub}</div>
    </div>
  );
}
