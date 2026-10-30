import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MessageCircle, Pencil, Phone } from "lucide-react";
import { db } from "@/lib/db";
import { canManage, requireSession } from "@/lib/session";
import { addActivity } from "@/app/actions";
import {
  businessMeta, formatDate, formatDateTime, formatMoney, outcomeMeta, sourceLabel,
  type Activity, type CustomField, type Deal, type Lead, type Task, type TeamMember, type Template, type Touchpoint,
} from "@/lib/leads";
import { StatusPicker } from "@/components/status-picker";
import { DeleteLeadButton, DeleteActivityButton } from "@/components/delete-buttons";
import { BusinessBadge, ScoreBadge } from "@/components/status-badge";
import { CallLogger, CustomFieldsPanel, DealsPanel, OwnerSelect, TasksPanel, TemplateSender } from "@/components/lead-panels";

const ICON: Record<string, string> = { note: "📝", call: "📞", whatsapp: "💬", email: "✉️", meeting: "🤝", deal: "💼", field: "✏️" };

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const s = await requireSession();
  const sql = await db();
  const [[lead], activities, journey, fields, team, tasks, deals, templates] = await Promise.all([
    sql<Lead[]>`SELECT * FROM leads WHERE id = ${id}`,
    sql<(Activity & { user_name: string | null; outcome: string | null; duration_sec: number | null })[]>`
      SELECT a.*, u.name AS user_name FROM lead_activities a LEFT JOIN users u ON u.id = a.user_id
      WHERE a.lead_id = ${id} ORDER BY a.created_at DESC LIMIT 200`,
    sql<(Touchpoint & { utm_source: string | null; utm_campaign: string | null; utm_content: string | null; page_url: string | null })[]>`
      SELECT * FROM lead_touchpoints WHERE lead_id = ${id} ORDER BY captured_at ASC NULLS FIRST, id`,
    sql<CustomField[]>`SELECT * FROM custom_fields ORDER BY position, id`,
    sql<TeamMember[]>`SELECT id, name, email, role, active FROM users ORDER BY name`,
    sql<(Task & { user_name: string | null })[]>`
      SELECT t.*, u.name AS user_name FROM tasks t LEFT JOIN users u ON u.id = t.user_id
      WHERE t.lead_id = ${id} ORDER BY t.done_at IS NOT NULL, t.due_at`,
    sql<Deal[]>`SELECT * FROM deals WHERE lead_id = ${id} ORDER BY created_at DESC`,
    sql<Template[]>`SELECT * FROM templates ORDER BY channel DESC, name`,
  ]);
  if (!lead || (s.role === "caller" && lead.owner_id !== s.uid)) notFound();
  const details = Object.entries(lead.details ?? {}).filter(([, v]) => v);
  const wa = lead.phone?.replace(/\D/g, "");
  const myTemplates = templates.filter((t) => t.business === "any" || t.business === lead.business || lead.business === "both");
  const oc = outcomeMeta(lead.last_call_outcome);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Link href="/leads" className="inline-flex items-center gap-1 text-sm muted hover:underline"><ArrowLeft className="size-4" /> All leads</Link>

      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="page-title">{lead.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <BusinessBadge business={lead.business} long />
              <ScoreBadge score={lead.score} temperature={lead.temperature} />
              {lead.entries > 1
                ? <span className="badge bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200">Came in {lead.entries}×</span>
                : <span className="badge bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">New lead</span>}
              {lead.is_customer && <span className="badge bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">Customer{Number(lead.total_spent) > 0 ? ` · ₹${formatMoney(lead.total_spent)}` : ""}</span>}
              {oc && <span className={`badge ${oc.color}`}>Last call: {oc.label}</span>}
            </div>
            <div className="mt-2 text-sm muted">{[lead.profession, lead.company, lead.city].filter(Boolean).join(" · ")}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {lead.phone && <a href={`tel:${lead.phone}`} className="btn-ghost"><Phone className="size-4" /> Call</a>}
            {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="btn-ghost"><MessageCircle className="size-4" /> WhatsApp</a>}
            {lead.email && <a href={`mailto:${lead.email}`} className="btn-ghost"><Mail className="size-4" /> Email</a>}
            <Link href={`/leads/${id}/edit`} className="btn-ghost"><Pencil className="size-4" /> Edit</Link>
          </div>
        </div>
        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="label">Status</div>
          <StatusPicker id={id} status={lead.status} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <section className="card divide-y divide-slate-100 text-sm dark:divide-slate-800">
            <Row label="Phone" value={lead.phone} />
            <Row label="Email" value={lead.email} />
            <Row label="Business" value={businessMeta(lead.business).label} />
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="muted">Assigned to</span>
              {canManage(s) ? <OwnerSelect leadId={id} ownerId={lead.owner_id} team={team.map((m) => ({ ...m }))} /> : <span>{team.find((m) => m.id === lead.owner_id)?.name ?? "—"}</span>}
            </div>
            <Row label="First came in" value={formatDateTime(lead.created_at)} />
            <Row label="Latest entry" value={lead.last_seen ? formatDateTime(lead.last_seen) : null} />
            <Row label="Calls" value={lead.call_count ? `${lead.call_count} · last ${formatDateTime(lead.last_call_at)}` : "Not called yet"} />
            <Row label="First source" value={sourceLabel(lead.source)} />
            {lead.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 px-4 py-2.5">
                {lead.tags.map((t) => <Link key={t} href={`/leads?q=${encodeURIComponent(t)}`} className="badge bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400">{t}</Link>)}
              </div>
            )}
          </section>

          {fields.length > 0 && (
            <section className="card p-4">
              <h2 className="mb-3 text-sm font-semibold">Fields</h2>
              <CustomFieldsPanel leadId={id} fields={fields.map((f) => ({ ...f }))} values={lead.custom ?? {}} />
            </section>
          )}

          {(lead.utm_source || lead.utm_campaign) && (
            <section className="card p-4 text-sm">
              <h2 className="mb-2 font-semibold">Ad / UTM (latest)</h2>
              <dl className="space-y-1.5">
                {([["Source", lead.utm_source], ["Medium", lead.utm_medium], ["Campaign", lead.utm_campaign], ["Ad (content)", lead.utm_content], ["Ad set / term", lead.utm_term]] as const)
                  .filter(([, v]) => v).map(([k, v]) => (
                    <div key={k}><dt className="text-xs muted">{k}</dt><dd className="break-words">{v}</dd></div>
                  ))}
              </dl>
            </section>
          )}

          {lead.purchases.length > 0 && (
            <section className="card p-4">
              <h2 className="mb-2 text-sm font-semibold">Purchases</h2>
              <ul className="space-y-1 text-sm">
                {lead.purchases.map((p, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>{p.product}{p.date ? <span className="muted"> · {formatDate(p.date)}</span> : null}</span>
                    <span className="tabular-nums">{p.amount ? `₹${formatMoney(p.amount)}` : <span className="muted">free</span>}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {details.length > 0 && (
            <section className="card p-4">
              <h2 className="mb-2 text-sm font-semibold">What they told us</h2>
              <dl className="space-y-2 text-sm">
                {details.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs muted">{k}</dt>
                    <dd className="break-words whitespace-pre-wrap">{/^https?:\/\//.test(v) ? <a href={v} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{v}</a> : v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          {lead.notes && (
            <section className="card p-4">
              <h2 className="mb-2 text-sm font-semibold">Notes</h2>
              <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
            </section>
          )}
          {s.role === "admin" && <DeleteLeadButton id={id} />}
        </div>

        <div className="space-y-4 lg:col-span-2">
          <section className="card p-5">
            <h2 className="mb-3 font-semibold">Log a call</h2>
            <CallLogger leadId={id} phone={lead.phone} />
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-semibold">Send a message</h2>
            <TemplateSender leadId={id} templates={myTemplates.map((t) => ({ ...t }))} hasPhone={Boolean(wa)} hasEmail={Boolean(lead.email)} />
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="card p-5">
              <h2 className="mb-3 font-semibold">Tasks & reminders</h2>
              <TasksPanel leadId={id} tasks={tasks.map((t) => ({ ...t }))} team={team.map((m) => ({ ...m }))} canAssign={canManage(s)} />
            </section>
            <section className="card p-5">
              <h2 className="mb-3 font-semibold">Deals</h2>
              <DealsPanel leadId={id} business={lead.business} deals={deals.map((d) => ({ ...d }))} />
            </section>
          </div>

          {journey.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-3 font-semibold">Journey <span className="text-sm font-normal muted">({journey.length} entries · {lead.funnels.length} funnels)</span></h2>
              <ol className="relative space-y-3 border-l border-slate-200 pl-4 dark:border-slate-700">
                {journey.map((t, i) => (
                  <li key={t.id} className="text-sm">
                    <span className={`absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-white dark:border-slate-900 ${t.purchase ? "bg-emerald-500" : t.business === "ds" ? "bg-teal-500" : "bg-indigo-500"}`} />
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium">{t.funnel}</span>
                      <BusinessBadge business={t.business} />
                      {i > 0 && <span className="badge bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200">Repeat</span>}
                      {t.purchase && <span className="text-emerald-700 dark:text-emerald-400">Bought {t.purchase.product}{t.purchase.amount ? ` · ₹${formatMoney(t.purchase.amount)}` : ""}</span>}
                    </div>
                    <div className="text-xs muted">
                      {t.captured_at ? formatDateTime(t.captured_at) : "Date unknown"}{t.sheet ? ` · ${t.sheet}` : ""}
                      {t.utm_source ? ` · ${t.utm_source}` : ""}{t.utm_campaign ? ` / ${t.utm_campaign}` : ""}{t.utm_content ? ` / ad: ${t.utm_content}` : ""}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="card p-5">
            <h2 className="mb-3 font-semibold">Activity</h2>
            <form action={addActivity.bind(null, id)} className="mb-4 flex flex-wrap gap-2">
              <input name="content" required placeholder="Add a note…" className="input min-w-0 flex-1 basis-64" />
              <select name="type" className="input w-auto">
                <option value="note">📝 Note</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="email">✉️ Email</option>
                <option value="meeting">🤝 Meeting</option>
              </select>
              <button className="btn-primary">Add</button>
            </form>
            {activities.length === 0 ? <p className="text-sm muted">No activity yet.</p> : (
              <ul className="space-y-3">
                {activities.map((a) => {
                  const o = outcomeMeta(a.outcome);
                  return (
                    <li key={a.id} className="group flex gap-3 text-sm">
                      <span className="mt-0.5 w-5 shrink-0 text-center">{ICON[a.type] ?? "⚙️"}</span>
                      <div className="min-w-0 flex-1">
                        <p className={`whitespace-pre-wrap ${a.type === "system" || a.type === "status" || a.type === "field" ? "muted" : ""}`}>
                          {o && <span className={`badge mr-1.5 ${o.color}`}>{o.label}</span>}
                          {o ? a.content.replace(o.label, "").replace(/^ — /, "") : a.content}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatDateTime(a.created_at)}{a.user_name ? ` · ${a.user_name}` : ""}{a.duration_sec ? ` · ${Math.round(a.duration_sec / 60)} min` : ""}
                        </p>
                      </div>
                      <DeleteActivityButton leadId={id} activityId={a.id} />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-3 px-4 py-2.5">
      <span className="muted">{label}</span>
      <span className="truncate text-right">{value || "—"}</span>
    </div>
  );
}
