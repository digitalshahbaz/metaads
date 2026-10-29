"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { setStatus } from "@/app/actions";
import { STATUSES, formatDate, formatMoney, sourceLabel, type Lead } from "@/lib/leads";

export function Kanban({ leads }: { leads: Lead[] }) {
  const [optimistic, move] = useOptimistic(leads, (state, { id, status }: { id: number; status: Lead["status"] }) =>
    state.map((l) => (l.id === id ? { ...l, status } : l)),
  );
  const [, start] = useTransition();
  const [over, setOver] = useState<string | null>(null);

  const change = (id: number, status: Lead["status"]) =>
    start(async () => {
      move({ id, status });
      await setStatus(id, status);
    });

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {STATUSES.map((s) => {
        const col = optimistic.filter((l) => l.status === s.id);
        const total = col.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
        return (
          <div
            key={s.id}
            onDragOver={(e) => { e.preventDefault(); setOver(s.id); }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const id = Number(e.dataTransfer.getData("text/plain"));
              const lead = optimistic.find((l) => l.id === id);
              if (lead && lead.status !== s.id) change(id, s.id);
            }}
            className={`flex w-64 shrink-0 flex-col rounded-xl border p-2 transition-colors ${
              over === s.id ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40" : "border-zinc-200 bg-zinc-100/60 dark:border-zinc-800 dark:bg-zinc-900/60"
            }`}
          >
            <div className="flex items-center justify-between px-1 pb-2">
              <span className={`badge ${s.color}`}>{s.label} · {col.length}</span>
              {total > 0 && <span className="text-xs tabular-nums text-zinc-500">{formatMoney(total)}</span>}
            </div>
            <div className="flex min-h-24 flex-col gap-2">
              {col.map((l) => (
                <div
                  key={l.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", String(l.id))}
                  className="card cursor-grab p-3 text-sm shadow-sm active:cursor-grabbing"
                >
                  <Link href={`/leads/${l.id}`} className="font-medium hover:underline">{l.name}</Link>
                  {l.company && <div className="text-xs text-zinc-500">{l.company}</div>}
                  <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                    <span>{sourceLabel(l.source)}</span>
                    {Number(l.value) > 0 && <span className="tabular-nums">{formatMoney(l.value)}</span>}
                  </div>
                  {l.follow_up && <div className="mt-1 text-xs text-zinc-500">Follow-up: {formatDate(l.follow_up)}</div>}
                  <select
                    aria-label="Move to"
                    value={l.status}
                    onChange={(e) => change(l.id, e.target.value as Lead["status"])}
                    className="mt-2 w-full rounded border border-zinc-200 bg-transparent px-1 py-0.5 text-xs md:hidden dark:border-zinc-700"
                  >
                    {STATUSES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
