import Link from "next/link";
import { BUSINESSES, SOURCES, STATUSES, sourceLabel, type Lead, type TeamMember } from "@/lib/leads";

export function LeadForm({ lead, action, cancelHref, team }: { lead?: Lead; action: (f: FormData) => void; cancelHref: string; team?: TeamMember[] }) {
  const sources = lead && !SOURCES.includes(lead.source) ? [lead.source, ...SOURCES] : SOURCES;
  const followUp = lead?.follow_up ? new Date(lead.follow_up).toISOString().slice(0, 10) : "";
  return (
    <form action={action} className="card grid gap-4 p-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <span className="label">Business *</span>
        <div className="grid gap-2 sm:grid-cols-3">
          {BUSINESSES.map((b) => (
            <label key={b.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-300 p-2 text-sm has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 dark:border-slate-700 dark:has-[:checked]:bg-indigo-950">
              <input type="radio" name="business" value={b.id} defaultChecked={(lead?.business ?? "dmm") === b.id} className="mt-1" />
              <span><span className="font-medium">{b.label}</span><span className="block text-xs muted">{b.hint}</span></span>
            </label>
          ))}
        </div>
      </div>
      <Field label="Name *" name="name" defaultValue={lead?.name} required />
      <Field label="Company" name="company" defaultValue={lead?.company} />
      <Field label="Email" name="email" type="email" defaultValue={lead?.email} />
      <Field label="Phone" name="phone" type="tel" defaultValue={lead?.phone} />
      <div>
        <label className="label" htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={lead?.status ?? "new"} className="input">
          {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="source">Source</label>
        <select id="source" name="source" defaultValue={lead?.source ?? "manual"} className="input">
          {sources.map((s) => <option key={s} value={s}>{sourceLabel(s)}</option>)}
        </select>
      </div>
      <Field label="Niche / profession" name="profession" defaultValue={lead?.profession} placeholder="Life coach, student, agency owner…" />
      <Field label="City" name="city" defaultValue={lead?.city} />
      {!lead && <Field label="Funnel / campaign" name="funnel" placeholder="e.g. Referral, Instagram DM" />}
      {!lead && team && team.length > 0 && (
        <div>
          <label className="label" htmlFor="owner_id">Assigned to</label>
          <select id="owner_id" name="owner_id" className="input" defaultValue="">
            <option value="">Unassigned</option>
            {team.filter((m) => m.active).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      )}
      <Field label="Deal value" name="value" type="number" step="any" min="0" defaultValue={lead ? Number(lead.value) || "" : ""} />
      <Field label="Follow-up date" name="follow_up" type="date" defaultValue={followUp} />
      <div className="sm:col-span-2">
        <Field label="Tags (comma separated)" name="tags" defaultValue={lead?.tags.join(", ")} placeholder="hot, real-estate, mumbai" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={4} defaultValue={lead?.notes ?? ""} className="input" />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn-primary">{lead ? "Save changes" : "Create lead"}</button>
        <Link href={cancelHref} className="btn-ghost">Cancel</Link>
      </div>
    </form>
  );
}

function Field({ label, name, defaultValue, ...rest }: { label: string; name: string; defaultValue?: string | number | null } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "defaultValue">) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} defaultValue={defaultValue ?? ""} className="input" {...rest} />
    </div>
  );
}
