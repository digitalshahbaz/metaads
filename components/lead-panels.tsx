"use client";

import { useRefreshTransition } from "./use-refresh-transition";
import { useRef, useState } from "react";
import { Check, Mail, MessageCircle, Phone, Trash2 } from "lucide-react";
import { assignLead, logCall, setCustomField } from "@/app/actions";
import { addDeal, addTask, deleteTask, sendTemplate, toggleTask, updateDeal } from "@/app/crm-actions";
import {
  CALL_OUTCOMES, DEAL_STAGES, formatDateTime, formatMoney,
  type CustomField, type Deal, type Task, type TeamMember, type Template,
} from "@/lib/leads";
import { FieldCell } from "./leads-grid";

function istLocal(offsetHours: number) {
  const d = new Date(Date.now() + offsetHours * 3600e3 + 5.5 * 3600e3);
  return d.toISOString().slice(0, 16);
}

export function CallLogger({ leadId, phone }: { leadId: number; phone: string | null }) {
  const [pending, start] = useRefreshTransition();
  const [outcome, setOutcome] = useState("");
  const [followUp, setFollowUp] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={form}
      className="space-y-3"
      action={(fd) => start(async () => { await logCall(leadId, fd); form.current?.reset(); setOutcome(""); setFollowUp(false); })}
    >
      <div className="flex flex-wrap items-center gap-2">
        {phone && <a href={`tel:${phone}`} className="btn-primary"><Phone className="size-4" /> Call {phone}</a>}
        <span className="text-xs muted">then log what happened:</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {CALL_OUTCOMES.map((o) => (
          <label key={o.id} className={`badge cursor-pointer border px-2.5 py-1 ${outcome === o.id ? "border-indigo-500 ring-2 ring-indigo-500/30 " + o.color : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}>
            <input type="radio" name="outcome" value={o.id} className="sr-only" required checked={outcome === o.id} onChange={() => setOutcome(o.id)} />
            {o.label}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <input name="note" placeholder="Call notes (what they said, objections…)" className="input min-w-0 flex-1 basis-64" />
        <input name="minutes" type="number" min="0" step="0.5" placeholder="Mins" className="input w-20" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} /> Remind me to follow up
      </label>
      {followUp && <input type="datetime-local" name="follow_up_at" defaultValue={istLocal(24)} className="input w-auto" required />}
      <button className="btn-primary" disabled={pending || !outcome}>{pending ? "Saving…" : "Log call"}</button>
    </form>
  );
}

export function CustomFieldsPanel({ leadId, fields, values }: { leadId: number; fields: CustomField[]; values: Record<string, string> }) {
  const [pending, start] = useRefreshTransition();
  if (!fields.length) return null;
  return (
    <dl className={`grid gap-3 ${pending ? "opacity-70" : ""}`}>
      {fields.map((f) => (
        <div key={f.key} className="flex items-center justify-between gap-3 text-sm">
          <dt className="muted">{f.label}</dt>
          <dd><FieldCell field={f} value={values?.[f.key] ?? ""} onSave={(v) => start(() => setCustomField(leadId, f.key, v))} /></dd>
        </div>
      ))}
    </dl>
  );
}

export function OwnerSelect({ leadId, ownerId, team }: { leadId: number; ownerId: number | null; team: TeamMember[] }) {
  const [pending, start] = useRefreshTransition();
  return (
    <select key={ownerId ?? "none"} className="input-sm" disabled={pending} defaultValue={ownerId ?? ""} onChange={(e) => { const v = Number(e.target.value) || null; start(() => assignLead(leadId, v)); }}>
      <option value="">Unassigned</option>
      {team.filter((m) => m.active || m.id === ownerId).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
    </select>
  );
}

export function TemplateSender({ leadId, templates, hasPhone, hasEmail }: { leadId: number; templates: Template[]; hasPhone: boolean; hasEmail: boolean }) {
  const [pending, start] = useRefreshTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const usable = templates.filter((t) => (t.channel === "whatsapp" ? hasPhone : hasEmail));
  if (!usable.length) return <p className="text-sm muted">No templates for this lead&apos;s contact details. Add some on the Templates page.</p>;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {usable.map((t) => (
          <button
            key={t.id}
            disabled={pending}
            className={t.channel === "whatsapp" ? "btn-wa px-2.5 py-1.5 text-xs" : "btn-ghost px-2.5 py-1.5 text-xs"}
            onClick={() => start(async () => {
              const win = window.open("about:blank", "_blank");
              const url = await sendTemplate(leadId, t.id);
              if (url && win) win.location.href = url;
              else { win?.close(); setMsg("Couldn't build the message (missing phone/email)."); }
            })}
          >
            {t.channel === "whatsapp" ? <MessageCircle className="size-3.5" /> : <Mail className="size-3.5" />} {t.name}
          </button>
        ))}
      </div>
      <p className="text-xs muted">Opens WhatsApp / your email app with the message filled in, and logs it in the activity.</p>
      {msg && <p className="text-xs text-red-600">{msg}</p>}
    </div>
  );
}

export function TasksPanel({ leadId, tasks, team, canAssign }: { leadId: number; tasks: (Task & { user_name: string | null })[]; team: TeamMember[]; canAssign: boolean }) {
  const [pending, start] = useRefreshTransition();
  const form = useRef<HTMLFormElement>(null);
  return (
    <div className="space-y-3">
      {tasks.length > 0 && (
        <ul className="space-y-1.5">
          {tasks.map((t) => {
            const overdue = !t.done_at && new Date(t.due_at) < new Date();
            return (
              <li key={t.id} className="group flex items-start gap-2 text-sm">
                <button
                  className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded border ${t.done_at ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 dark:border-slate-600"}`}
                  onClick={() => start(() => toggleTask(t.id, !t.done_at))}
                  aria-label={t.done_at ? "Mark not done" : "Mark done"}
                >
                  {t.done_at && <Check className="size-3" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className={t.done_at ? "line-through muted" : ""}>{t.title}</div>
                  <div className={`text-xs ${overdue ? "text-red-600" : "muted"}`}>{overdue ? "Overdue · " : ""}{formatDateTime(t.due_at)}{t.user_name ? ` · ${t.user_name}` : ""}</div>
                </div>
                <button className="text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-600" onClick={() => start(() => deleteTask(t.id))} aria-label="Delete task"><Trash2 className="size-3.5" /></button>
              </li>
            );
          })}
        </ul>
      )}
      <form ref={form} className="flex flex-wrap gap-2" action={(fd) => start(async () => { await addTask(fd); form.current?.reset(); })}>
        <input type="hidden" name="lead_id" value={leadId} />
        <input name="title" placeholder="Add a task, e.g. Send VSW payment link" className="input-sm min-w-0 flex-1 basis-48 py-1.5" required />
        <input type="datetime-local" name="due_at" defaultValue={istLocal(2)} className="input-sm py-1.5" required />
        {canAssign && (
          <select name="user_id" className="input-sm py-1.5" defaultValue="">
            <option value="">Me</option>
            {team.filter((m) => m.active).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        )}
        <button className="btn-ghost px-2.5 py-1.5 text-xs" disabled={pending}>Add task</button>
      </form>
    </div>
  );
}

export function DealsPanel({ leadId, business, deals }: { leadId: number; business: string; deals: Deal[] }) {
  const [pending, start] = useRefreshTransition();
  const [adding, setAdding] = useState(false);
  return (
    <div className={`space-y-3 ${pending ? "opacity-70" : ""}`}>
      {deals.map((d) => (
        <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 p-2.5 text-sm dark:border-slate-800">
          <div>
            <div className="font-medium">{d.title}</div>
            <div className="text-xs muted">₹{formatMoney(d.amount)}{d.expected_close ? ` · close by ${formatDateTime(d.expected_close).slice(0, 11)}` : ""}</div>
          </div>
          <select key={d.stage} className="input-sm" defaultValue={d.stage} onChange={(e) => { const v = e.target.value; start(() => updateDeal(d.id, { stage: v })); }}>
            {DEAL_STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      ))}
      {adding ? (
        <form className="grid gap-2 sm:grid-cols-2" action={(fd) => start(async () => { await addDeal(fd); setAdding(false); })}>
          <input type="hidden" name="lead_id" value={leadId} />
          <input name="title" placeholder="What are they buying? e.g. VSW Program" className="input sm:col-span-2" required />
          <input name="amount" type="number" min="0" placeholder="Amount ₹" className="input" />
          <input name="expected_close" type="date" className="input" />
          <select name="business" defaultValue={business === "both" ? "dmm" : business} className="input">
            <option value="dmm">Digimark Media</option>
            <option value="ds">Digital Shahbaz</option>
          </select>
          <div className="flex gap-2">
            <button className="btn-primary" disabled={pending}>Create deal</button>
            <button type="button" className="btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => setAdding(true)}>+ New deal</button>
      )}
      <p className="text-xs muted">Marking a deal <b>Won</b> records the sale on this lead and makes them a customer.</p>
    </div>
  );
}
