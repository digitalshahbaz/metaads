"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { bulkSetStatus, deleteLeads } from "@/app/actions";
import { STATUSES, formatDate, formatMoney, type Lead } from "@/lib/leads";
import { BusinessBadge, ScoreBadge, StatusBadge } from "./status-badge";

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
              <th className="p-3 font-medium">Score</th>
              <th className="p-3 font-medium">Funnels</th>
              <th className="p-3 text-right font-medium">Spent</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Last active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {leads.map((l) => (
              <tr key={l.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="p-3">
                  <input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggle(l.id)} aria-label={`Select ${l.name}`} />
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1.5">
                    <BusinessBadge business={l.business} />
                    <Link href={`/leads/${l.id}`} className="font-medium hover:text-indigo-600 hover:underline">{l.name}</Link>
                  </div>
                  {(l.profession || l.company || l.city) && (
                    <div className="mt-0.5 max-w-64 truncate text-xs text-zinc-500">{[l.profession, l.company, l.city].filter(Boolean).join(" · ")}</div>
                  )}
                </td>
                <td className="p-3 text-xs">
                  {l.email && <a href={`mailto:${l.email}`} className="block max-w-56 truncate hover:underline">{l.email}</a>}
                  {l.phone && <a href={`tel:${l.phone}`} className="block text-zinc-500 hover:underline">{l.phone}</a>}
                </td>
                <td className="p-3"><ScoreBadge score={l.score} temperature={l.temperature} /></td>
                <td className="p-3 text-xs text-zinc-600 dark:text-zinc-400">
                  <div className="max-w-56 truncate" title={l.funnels.join("\n")}>{l.funnels[l.funnels.length - 1] ?? "—"}</div>
                  {l.funnels.length > 1 && <div className="text-zinc-400">+{l.funnels.length - 1} more</div>}
                </td>
                <td className="p-3 text-right tabular-nums">{l.is_customer ? (Number(l.total_spent) > 0 ? `₹${formatMoney(l.total_spent)}` : "Bought") : "—"}</td>
                <td className="p-3"><StatusBadge status={l.status} /></td>
                <td className="p-3 whitespace-nowrap text-zinc-500">{formatDate(l.last_seen ?? l.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
