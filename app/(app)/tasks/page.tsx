import Link from "next/link";
import { db } from "@/lib/db";
import { canManage, requireSession } from "@/lib/session";
import type { TeamMember } from "@/lib/leads";
import { NewTaskForm, TaskList, type TaskRow } from "@/components/task-list";

type SP = Promise<Record<string, string | undefined>>;

export default async function TasksPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const s = await requireSession();
  const sql = await db();
  const who = canManage(s) && sp.user ? (sp.user === "all" ? "all" : Number(sp.user)) : s.uid;
  const scope = who === "all" ? sql`` : sql`AND t.user_id = ${who}`;
  const endOfToday = sql`(date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') + interval '1 day') AT TIME ZONE 'Asia/Kolkata'`;
  const base = sql`SELECT t.id, t.title, t.due_at, t.done_at, t.lead_id, l.name AS lead_name, l.phone AS lead_phone, u.name AS user_name
                   FROM tasks t LEFT JOIN leads l ON l.id = t.lead_id LEFT JOIN users u ON u.id = t.user_id`;
  const [overdue, today, upcoming, done, team] = await Promise.all([
    sql<TaskRow[]>`${base} WHERE t.done_at IS NULL AND t.due_at < now() ${scope} ORDER BY t.due_at`,
    sql<TaskRow[]>`${base} WHERE t.done_at IS NULL AND t.due_at >= now() AND t.due_at < ${endOfToday} ${scope} ORDER BY t.due_at`,
    sql<TaskRow[]>`${base} WHERE t.done_at IS NULL AND t.due_at >= ${endOfToday} ${scope} ORDER BY t.due_at LIMIT 100`,
    sql<TaskRow[]>`${base} WHERE t.done_at IS NOT NULL ${scope} ORDER BY t.done_at DESC LIMIT 20`,
    sql<TeamMember[]>`SELECT id, name, email, role, active FROM users ORDER BY name`,
  ]);
  const showUser = who === "all";
  const sections: [string, TaskRow[], string][] = [
    ["Overdue", overdue, "text-red-600"], ["Today", today, ""], ["Upcoming", upcoming, ""], ["Recently done", done, "muted"],
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Tasks & reminders</h1>
          <p className="text-sm muted">{overdue.length} overdue · {today.length} due today · {upcoming.length} upcoming</p>
        </div>
        {canManage(s) && (
          <div className="flex flex-wrap gap-1.5 text-xs">
            {[{ id: "", name: "Mine" }, { id: "all", name: "Everyone" }, ...team.filter((m) => m.active && m.id !== s.uid).map((m) => ({ id: String(m.id), name: m.name }))].map((m) => (
              <Link key={m.id} href={m.id ? `/tasks?user=${m.id}` : "/tasks"}
                className={`badge border px-2.5 py-1 ${(sp.user ?? "") === m.id ? "border-indigo-500 bg-indigo-600 text-white" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"}`}>{m.name}</Link>
            ))}
          </div>
        )}
      </div>
      <div className="card p-4"><NewTaskForm team={team.map((m) => ({ ...m }))} canAssign={canManage(s)} /></div>
      {sections.map(([title, rows, cls]) => rows.length > 0 && (
        <section key={title} className="card px-5 py-3">
          <h2 className={`py-1 text-sm font-semibold ${cls}`}>{title} <span className="font-normal muted">({rows.length})</span></h2>
          <TaskList tasks={rows.map((r) => ({ ...r }))} showUser={showUser} />
        </section>
      ))}
      {overdue.length + today.length + upcoming.length === 0 && (
        <div className="card p-10 text-center text-sm muted">No open tasks. Log a call with “Remind me to follow up” to create one automatically.</div>
      )}
    </div>
  );
}
