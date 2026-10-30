import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { timeAgo } from "@/lib/leads";
import { UserForm, UserRow } from "@/components/admin-forms";

export default async function TeamPage() {
  const s = await requireSession();
  if (s.role !== "admin") redirect("/");
  const sql = await db();
  const users = await sql<{ id: number; name: string; email: string; role: string; active: boolean; last_login: Date | null; leads: number; calls7: number }[]>`
    SELECT u.id, u.name, u.email, u.role, u.active, u.last_login,
      (SELECT count(*)::int FROM leads l WHERE l.owner_id = u.id) AS leads,
      (SELECT count(*)::int FROM lead_activities a WHERE a.user_id = u.id AND a.type = 'call' AND a.created_at > now() - interval '7 days') AS calls7
    FROM users u ORDER BY u.active DESC, u.name`;
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="page-title">Team members</h1>
        <p className="text-sm muted">
          <b>Callers</b> see only the leads assigned to them and log calls, notes, tasks and dropdowns.
          <b> Managers</b> see everything, assign leads, import & export. <b>Admins</b> also manage the team, fields and can delete.
        </p>
      </div>
      <section className="card p-5"><h2 className="mb-3 font-semibold">Add a team member</h2><UserForm /></section>
      <section className="card px-5 py-2">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {users.map((u) => (
            <UserRow key={u.id} u={{ ...u }} self={u.id === s.uid}
              stats={`${u.leads} leads assigned · ${u.calls7} calls in 7 days · last login ${timeAgo(u.last_login)}`} />
          ))}
        </ul>
      </section>
      <p className="text-sm muted">Team members log in at the same address with their email and password. To give a caller leads, select leads on the Leads page → <b>Assign to…</b> (or “Split evenly between callers”).</p>
    </div>
  );
}
