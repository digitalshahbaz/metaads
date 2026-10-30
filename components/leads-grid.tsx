"use client";

import { useRefreshTransition } from "./use-refresh-transition";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Columns3, MessageCircle, Phone } from "lucide-react";
import { assignLead, bulkAssign, bulkSetCustom, bulkSetStatus, deleteLeads, setCustomField, setStatus } from "@/app/actions";
import {
  STATUSES, formatDateTime, formatMoney, outcomeMeta, timeAgo,
  type CustomField, type Lead, type TeamMember,
} from "@/lib/leads";
import { BusinessBadge, ScoreBadge } from "./status-badge";

type Col = { id: string; label: string; always?: boolean };

const BASE_COLS: Col[] = [
  { id: "name", label: "Name", always: true },
  { id: "contact", label: "Phone / email" },
  { id: "came_in", label: "Came in (IST)" },
  { id: "entries", label: "Entries" },
  { id: "source", label: "Source / UTM" },
  { id: "funnel", label: "Funnel" },
  { id: "score", label: "Score" },
  { id: "status", label: "Status" },
  { id: "owner", label: "Assigned to" },
  { id: "last_call", label: "Last call" },
  { id: "spent", label: "Spent" },
  { id: "first_seen", label: "First seen" },
  { id: "city", label: "City / niche" },
];
const DEFAULT_HIDDEN = ["first_seen", "city"];
const STORE = "dscrm.hiddenCols";

export function LeadsGrid({ leads, fields, team, role, outreachHref }: {
  leads: Lead[]; fields: CustomField[]; team: TeamMember[]; role: string; outreachHref: string;
}) {
  const manage = role === "admin" || role === "manager";
  const cols = useMemo<Col[]>(() => [...BASE_COLS, ...fields.map((f) => ({ id: `cf_${f.key}`, label: f.label }))], [fields]);
  const [hidden, setHidden] = useState<string[]>([...DEFAULT_HIDDEN, ...fields.filter((f) => !f.show_in_table).map((f) => `cf_${f.key}`)]);
  const [picker, setPicker] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [pending, start] = useRefreshTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE);
      if (saved) setHidden(JSON.parse(saved));
    } catch { /* storage unavailable */ }
  }, []);
  const toggleCol = (id: string) => {
    const next = hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id];
    setHidden(next);
    try { localStorage.setItem(STORE, JSON.stringify(next)); } catch { /* ignore */ }
  };
  const show = (id: string) => !hidden.includes(id);
  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    start(async () => {
      try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    });
  };
  const allSelected = leads.length > 0 && selected.length === leads.length;
  const memberName = (id: number | null) => team.find((m) => m.id === id)?.name ?? "—";
  const callers = team.filter((m) => m.active && m.role !== "admin");
  const selectFields = fields.filter((f) => f.type === "select");

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {selected.length > 0 ? (
          <div className="card flex flex-1 flex-wrap items-center gap-2 p-2 text-sm">
            <span className="px-2 font-medium">{selected.length} selected</span>
            <BulkSelect label="Set status…" disabled={pending}
              options={STATUSES.map((s) => [s.id, s.label])}
              onPick={(v) => run(async () => { await bulkSetStatus(selected, v); setSelected([]); })} />
            {manage && (
              <BulkSelect label="Assign to…" disabled={pending}
                options={[["__spread", `Split evenly between ${callers.length} callers`], ...team.filter((m) => m.active).map((m) => [String(m.id), m.name] as [string, string]), ["__none", "Unassign"]]}
                onPick={(v) => run(async () => {
                  const ids = v === "__spread" ? callers.map((c) => c.id) : v === "__none" ? [] : [Number(v)];
                  await bulkAssign(selected, ids); setSelected([]);
                })} />
            )}
            {selectFields.map((f) => (
              <BulkSelect key={f.key} label={`${f.label}…`} disabled={pending}
                options={[...f.options.map((o) => [o, o] as [string, string]), ["", "(clear)"]]}
                onPick={(v) => run(async () => { await bulkSetCustom(selected, f.key, v); setSelected([]); })} />
            ))}
            <Link href={`${outreachHref}${outreachHref.includes("?") ? "&" : "?"}ids=${selected.join(",")}`} className="btn-wa px-2.5 py-1.5 text-xs">
              <MessageCircle className="size-3.5" /> Message
            </Link>
            {role === "admin" && (
              <button className="btn-danger px-2.5 py-1.5 text-xs" disabled={pending}
                onClick={() => confirm(`Delete ${selected.length} lead(s)? This cannot be undone.`) && run(async () => { await deleteLeads(selected); setSelected([]); })}>
                Delete
              </button>
            )}
            <button className="btn px-2 py-1 text-xs muted" onClick={() => setSelected([])}>Cancel</button>
          </div>
        ) : <div className="flex-1" />}
        <div className="relative">
          <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => setPicker((p) => !p)}><Columns3 className="size-3.5" /> Columns</button>
          {picker && (
            <div className="card absolute right-0 z-20 mt-1 max-h-80 w-56 overflow-y-auto p-2 text-sm shadow-lg">
              {cols.filter((c) => !c.always).map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <input type="checkbox" checked={show(c.id)} onChange={() => toggleCol(c.id)} /> {c.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

      {leads.length === 0 ? (
        <div className="card p-10 text-center text-sm muted">No leads match these filters.</div>
      ) : (
        <div className={`card overflow-x-auto ${pending ? "opacity-70" : ""}`}>
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="w-8 px-3 py-2.5">
                  <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : leads.map((l) => l.id))} aria-label="Select all" />
                </th>
                {cols.filter((c) => show(c.id)).map((c) => <th key={c.id} className="px-3 py-2.5 font-medium whitespace-nowrap">{c.label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {leads.map((l) => {
                const oc = outcomeMeta(l.last_call_outcome);
                const wa = l.phone?.replace(/\D/g, "");
                return (
                  <tr key={l.id} className={`align-top hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${selected.includes(l.id) ? "bg-indigo-50/60 dark:bg-indigo-950/30" : ""}`}>
                    <td className="px-3 py-2.5">
                      <input type="checkbox" checked={selected.includes(l.id)} aria-label={`Select ${l.name}`}
                        onChange={() => setSelected((s) => (s.includes(l.id) ? s.filter((x) => x !== l.id) : [...s, l.id]))} />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <BusinessBadge business={l.business} />
                        <Link href={`/leads/${l.id}`} className="font-medium whitespace-nowrap hover:text-indigo-600 hover:underline">{l.name}</Link>
                      </div>
                      {l.is_customer && <span className="mt-1 inline-block text-[11px] font-medium text-emerald-700 dark:text-emerald-400">● Customer</span>}
                    </td>
                    {show("contact") && (
                      <td className="px-3 py-2.5 text-xs">
                        {l.phone && (
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <a href={`tel:${l.phone}`} className="hover:underline">{l.phone}</a>
                            <a href={`tel:${l.phone}`} title="Call" className="text-slate-400 hover:text-indigo-600"><Phone className="size-3" /></a>
                            {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" title="WhatsApp" className="text-slate-400 hover:text-emerald-600"><MessageCircle className="size-3" /></a>}
                          </div>
                        )}
                        {l.email && <div className="max-w-52 truncate muted">{l.email}</div>}
                      </td>
                    )}
                    {show("came_in") && <td className="px-3 py-2.5 text-xs whitespace-nowrap">{formatDateTime(l.last_seen ?? l.created_at)}</td>}
                    {show("entries") && (
                      <td className="px-3 py-2.5 text-xs">
                        {l.entries > 1
                          ? <span className="badge bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200">Repeat ×{l.entries}</span>
                          : <span className="badge bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">New</span>}
                      </td>
                    )}
                    {show("source") && (
                      <td className="px-3 py-2.5 text-xs">
                        {l.utm_source ? (
                          <>
                            <div className="font-medium">{l.utm_source}{l.utm_medium ? <span className="muted"> / {l.utm_medium}</span> : null}</div>
                            {l.utm_campaign && <div className="max-w-48 truncate muted" title={l.utm_campaign}>{l.utm_campaign}</div>}
                            {l.utm_content && <div className="max-w-48 truncate muted" title={l.utm_content}>Ad: {l.utm_content}</div>}
                          </>
                        ) : <span className="muted">—</span>}
                      </td>
                    )}
                    {show("funnel") && (
                      <td className="px-3 py-2.5 text-xs">
                        <div className="max-w-48 truncate" title={l.funnels.join("\n")}>{l.funnels[l.funnels.length - 1] ?? "—"}</div>
                        {l.funnels.length > 1 && <div className="muted">+{l.funnels.length - 1} more</div>}
                      </td>
                    )}
                    {show("score") && <td className="px-3 py-2.5"><ScoreBadge score={l.score} temperature={l.temperature} /></td>}
                    {show("status") && (
                      <td className="px-3 py-2.5">
                        <select key={l.status} className="input-sm" defaultValue={l.status} onChange={(e) => { const v = e.target.value; run(() => setStatus(l.id, v)); }}>
                          {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      </td>
                    )}
                    {show("owner") && (
                      <td className="px-3 py-2.5 text-xs">
                        {manage ? (
                          <select key={l.owner_id ?? "none"} className="input-sm max-w-32" defaultValue={l.owner_id ?? ""} onChange={(e) => { const v = Number(e.target.value) || null; run(() => assignLead(l.id, v)); }}>
                            <option value="">Unassigned</option>
                            {team.filter((m) => m.active || m.id === l.owner_id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                        ) : memberName(l.owner_id)}
                      </td>
                    )}
                    {show("last_call") && (
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                        {oc ? <><span className={`badge ${oc.color}`}>{oc.label}</span><div className="mt-0.5 muted">{timeAgo(l.last_call_at)} · {l.call_count} call{l.call_count === 1 ? "" : "s"}</div></> : <span className="muted">Not called</span>}
                      </td>
                    )}
                    {show("spent") && <td className="px-3 py-2.5 text-right text-xs tabular-nums">{l.is_customer ? (Number(l.total_spent) > 0 ? `₹${formatMoney(l.total_spent)}` : "Bought") : "—"}</td>}
                    {show("first_seen") && <td className="px-3 py-2.5 text-xs whitespace-nowrap">{formatDateTime(l.created_at)}</td>}
                    {show("city") && <td className="px-3 py-2.5 text-xs"><div className="max-w-40 truncate">{[l.city, l.profession].filter(Boolean).join(" · ") || "—"}</div></td>}
                    {fields.filter((f) => show(`cf_${f.key}`)).map((f) => (
                      <td key={f.key} className="px-3 py-2.5">
                        <FieldCell field={f} value={l.custom?.[f.key] ?? ""} onSave={(v) => run(() => setCustomField(l.id, f.key, v))} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BulkSelect({ label, options, onPick, disabled }: { label: string; options: [string, string][]; onPick: (v: string) => void; disabled?: boolean }) {
  return (
    <select className="input-sm w-auto" value="__label" disabled={disabled} onChange={(e) => { if (e.target.value !== "__label") onPick(e.target.value); }}>
      <option value="__label" disabled>{label}</option>
      {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
    </select>
  );
}

export function FieldCell({ field, value, onSave }: { field: CustomField; value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  if (field.type === "select") {
    return (
      <select className="input-sm max-w-40" value={v} onChange={(e) => { setV(e.target.value); onSave(e.target.value); }}>
        <option value="">—</option>
        {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
        {v && !field.options.includes(v) && <option value={v}>{v}</option>}
      </select>
    );
  }
  if (field.type === "checkbox") {
    return <input type="checkbox" checked={v === "yes"} onChange={(e) => { const n = e.target.checked ? "yes" : ""; setV(n); onSave(n); }} />;
  }
  return (
    <input
      className="input-sm w-36"
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onSave(v)}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
}
