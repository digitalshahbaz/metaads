import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { addActivity } from "@/app/actions";
import { businessMeta, formatDate, formatMoney, sourceLabel, type Activity, type Lead, type Touchpoint } from "@/lib/leads";
import { BusinessBadge, ScoreBadge } from "@/components/status-badge";
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
  const journey = await sql<Touchpoint[]>`
    SELECT * FROM lead_touchpoints WHERE lead_id = ${id} ORDER BY captured_at ASC NULLS FIRST, id`;
  const details = Object.entries(lead.details ?? {}).filter(([, v]) => v);
  const waPhone = lead.phone?.replace(/\D/g, "");

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link href="/leads" className="text-sm text-zinc-500 hover:underline">← All leads</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{lead.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <BusinessBadge business={lead.business} long />
            <ScoreBadge score={lead.score} temperature={lead.temperature} />
            {lead.is_customer && <span className="badge bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">Customer{Number(lead.total_spent) > 0 ? ` · ₹${formatMoney(lead.total_spent)}` : ""}</span>}
            {[lead.profession, lead.company, lead.city].filter(Boolean).length > 0 && (
              <span className="text-sm text-zinc-500">{[lead.profession, lead.company, lead.city].filter(Boolean).join(" · ")}</span>
            )}
          </div>
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
            <Row label="Business" value={businessMeta(lead.business).label} />
            <Row label="First source" value={sourceLabel(lead.source)} />
            <Row label="Deal value" value={Number(lead.value) ? formatMoney(lead.value) : null} />
            <Row label="Follow-up" value={lead.follow_up ? formatDate(lead.follow_up) : null} />
            <Row label="First seen" value={formatDate(lead.created_at)} />
            <Row label="Last active" value={lead.last_seen ? formatDate(lead.last_seen) : null} />
            <Row label="Updated" value={formatDate(lead.updated_at)} />
            {lead.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 p-3">
                {lead.tags.map((t) => <Link key={t} href={`/leads?q=${encodeURIComponent(t)}`} className="badge bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400">{t}</Link>)}
              </div>
            )}
          </div>
          {lead.purchases.length > 0 && (
            <div className="card p-4">
              <div className="label">Purchases</div>
              <ul className="space-y-1 text-sm">
                {lead.purchases.map((p, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>{p.product}{p.date ? <span className="text-zinc-500"> · {formatDate(p.date)}</span> : null}</span>
                    <span className="tabular-nums">{p.amount ? `₹${formatMoney(p.amount)}` : <span className="text-zinc-500">price n/a</span>}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {details.length > 0 && (
            <div className="card p-4">
              <div className="label">What they told us</div>
              <dl className="space-y-2 text-sm">
                {details.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-zinc-500">{k}</dt>
                    <dd className="break-words whitespace-pre-wrap">{/^https?:\/\//.test(v) ? <a href={v} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{v}</a> : v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {lead.notes && (
            <div className="card p-4">
              <div className="label">Notes</div>
              <p className="whitespace-pre-wrap text-sm">{lead.notes}</p>
            </div>
          )}
          <DeleteLeadButton id={id} />
        </div>

        <div className="space-y-4 lg:col-span-2">
        {journey.length > 0 && (
          <div className="card p-4">
            <h2 className="mb-3 font-medium">Journey <span className="text-sm font-normal text-zinc-500">({lead.funnels.length} funnel{lead.funnels.length === 1 ? "" : "s"})</span></h2>
            <ol className="relative space-y-3 border-l border-zinc-200 pl-4 dark:border-zinc-700">
              {journey.map((t) => (
                <li key={t.id} className="text-sm">
                  <span className={`absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-white dark:border-zinc-900 ${t.purchase ? "bg-emerald-500" : t.business === "ds" ? "bg-teal-500" : "bg-indigo-500"}`} />
                  <div className="flex flex-wrap items-center gap-x-2">
                    <span className="font-medium">{t.funnel}</span>
                    <BusinessBadge business={t.business} />
                    {t.purchase && <span className="text-emerald-700 dark:text-emerald-400">Bought {t.purchase.product}{t.purchase.amount ? ` · ₹${formatMoney(t.purchase.amount)}` : ""}</span>}
                  </div>
                  <div className="text-xs text-zinc-500">{t.captured_at ? formatDate(t.captured_at) : "Date unknown"}{t.sheet ? ` · from "${t.sheet}"` : ""}</div>
                </li>
              ))}
            </ol>
          </div>
        )}
        <div className="card p-4">
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
