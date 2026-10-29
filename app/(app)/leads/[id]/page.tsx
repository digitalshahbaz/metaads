import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { addActivity } from "@/app/actions";
import { formatDate, formatMoney, sourceLabel, type Activity, type Lead } from "@/lib/leads";
import { StatusPicker } from "@/components/status-picker";
import { DeleteLeadButton, DeleteActivityButton } from "@/components/delete-buttons";

const ACTIVITY_TYPES = [
  { id: "note", label: "📝 Note" },
  { id: "call", label: "📞 Call" },
  { id: "whatsapp", label: "💬 WhatsApp" },
  { id: "email", label: "✉️ Email" },
  { id: "meeting", label: "🤝 Meeting" },
];
const icon = (t: string) => ACTIVITY_TYPES.find((a) => a.id === t)?.label.split(" ")[0] ?? "•";

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const sql = await db();
  const [lead] = await sql<Lead[]>`SELECT * FROM leads WHERE id = ${id}`;
  if (!lead) notFound();
  const activities = await sql<Activity[]>`SELECT * FROM lead_activities WHERE lead_id = ${id} ORDER BY created_at DESC`;
  const waPhone = lead.phone?.replace(/\D/g, "");

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link href="/leads" className="text-sm text-zinc-500 hover:underline">← All leads</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{lead.name}</h1>
          {lead.company && <p className="text-zinc-500">{lead.company}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {lead.phone && <a href={`tel:${lead.phone}`} className="btn-ghost">Call</a>}
          {waPhone && <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noreferrer" className="btn-ghost">WhatsApp</a>}
          {lead.email && <a href={`mailto:${lead.email}`} className="btn-ghost">Email</a>}
          <Link href={`/leads/${id}/edit`} className="btn-primary">Edit</Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <div className="card p-4">
            <div className="label">Status</div>
            <StatusPicker id={id} status={lead.status} />
          </div>
          <div className="card divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
            <Row label="Email" value={lead.email} />
            <Row label="Phone" value={lead.phone} />
            <Row label="Source" value={sourceLabel(lead.source)} />
            <Row label="Deal value" value={Number(lead.value) ? formatMoney(lead.value) : null} />
            <Row label="Follow-up" value={lead.follow_up ? formatDate(lead.follow_up) : null} />
            <Row label="Added" value={formatDate(lead.created_at)} />
            <Row label="Updated" value={formatDate(lead.updated_at)} />
            {lead.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 p-3">
                {lead.tags.map((t) => <Link key={t} href={`/leads?q=${encodeURIComponent(t)}`} className="badge bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400">{t}</Link>)}
              </div>
            )}
          </div>
          {lead.notes && (
            <div className="card p-4">
              <div className="label">Notes</div>
              <p className="whitespace-pre-wrap text-sm">{lead.notes}</p>
            </div>
          )}
          <DeleteLeadButton id={id} />
        </div>

        <div className="card p-4 lg:col-span-2">
          <h2 className="mb-3 font-medium">Activity</h2>
          <form action={addActivity.bind(null, id)} className="mb-4 space-y-2">
            <textarea name="content" rows={3} required placeholder="Log a call, note, WhatsApp chat…" className="input" />
            <div className="flex gap-2">
              <select name="type" className="input w-auto">
                {ACTIVITY_TYPES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
              <button className="btn-primary">Add</button>
            </div>
          </form>
          {activities.length === 0 ? (
            <p className="text-sm text-zinc-500">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {activities.map((a) => (
                <li key={a.id} className="group flex gap-3 text-sm">
                  <span className="mt-0.5 w-5 shrink-0 text-center">{a.type === "system" || a.type === "status" ? "⚙️" : icon(a.type)}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`whitespace-pre-wrap ${a.type === "system" || a.type === "status" ? "text-zinc-500" : ""}`}>{a.content}</p>
                    <p className="text-xs text-zinc-400">{new Date(a.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p>
                  </div>
                  <DeleteActivityButton leadId={id} activityId={a.id} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-3 p-3">
      <span className="text-zinc-500">{label}</span>
      <span className="truncate text-right">{value || "—"}</span>
    </div>
  );
}
