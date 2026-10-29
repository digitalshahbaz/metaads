"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { bulkSetStatus, deleteLeads } from "@/app/actions";
import { STATUSES, formatDate, formatMoney, sourceLabel, type Lead } from "@/lib/leads";
import { StatusBadge } from "./status-badge";

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [pending, start] = useTransition();
  const allSelected = leads.length > 0 && selected.length === leads.length;
  const toggle = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  if (leads.length === 0) {
    return <div className="card p-10 text-center text-sm text-zinc-500">No leads found.</div>;
  }

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="card flex flex-wrap items-center gap-2 p-2 text-sm">
          <span className="px-2 font-medium">{selected.length} selected</span>
          <select
            className="input w-auto"
            defaultValue=""
            disabled={pending}
            onChange={(e) => {
              const v = e.target.value;
              e.target.value = "";
              if (v) start(async () => { await bulkSetStatus(selected, v); setSelected([]); });
            }}
          >
            <option value="" disabled>Move to status…</option>
            {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <button
            className="btn-danger"
            disabled={pending}
            onClick={() => {
              if (confirm(`Delete ${selected.length} lead(s)? This cannot be undone.`)) {
                start(async () => { await deleteLeads(selected); setSelected([]); });
              }
            }}
          >
            Delete
          </button>
          <button className="btn text-zinc-500" onClick={() => setSelected([])}>Cancel</button>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800">
            <tr>
              <th className="w-8 p-3">
                <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : leads.map((l) => l.id))} aria-label="Select all" />
              </th>
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Contact</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Source</th>
              <th className="p-3 text-right font-medium">Value</th>
              <th className="p-3 font-medium">Follow-up</th>
              <th className="p-3 font-medium">Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {leads.map((l) => (
              <tr key={l.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="p-3">
                  <input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggle(l.id)} aria-label={`Select ${l.name}`} />
                </td>
                <td className="p-3">
                  <Link href={`/leads/${l.id}`} className="font-medium hover:text-indigo-600 hover:underline">{l.name}</Link>
                  {l.company && <div className="text-xs text-zinc-500">{l.company}</div>}
                  {l.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {l.tags.map((t) => <span key={t} className="badge bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">{t}</span>)}
                    </div>
                  )}
                </td>
                <td className="p-3 text-xs">
                  {l.email && <a href={`mailto:${l.email}`} className="block hover:underline">{l.email}</a>}
                  {l.phone && <a href={`tel:${l.phone}`} className="block text-zinc-500 hover:underline">{l.phone}</a>}
                </td>
                <td className="p-3"><StatusBadge status={l.status} /></td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">{sourceLabel(l.source)}</td>
                <td className="p-3 text-right tabular-nums">{Number(l.value) ? formatMoney(l.value) : "—"}</td>
                <td className="p-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">{formatDate(l.follow_up)}</td>
                <td className="p-3 whitespace-nowrap text-zinc-500">{formatDate(l.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
