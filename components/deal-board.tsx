"use client";

import { useRefreshTransition } from "./use-refresh-transition";
import Link from "next/link";

import { updateDeal } from "@/app/crm-actions";
import { DEAL_STAGES, formatMoney } from "@/lib/leads";
import { BusinessBadge } from "./status-badge";

export type DealRow = { id: number; title: string; amount: string; stage: string; business: string; lead_id: number; lead_name: string; owner_name: string | null };

export function DealBoard({ deals }: { deals: DealRow[] }) {
  const [pending, start] = useRefreshTransition();
  return (
    <div className={`flex gap-3 overflow-x-auto pb-4 ${pending ? "opacity-70" : ""}`}>
      {DEAL_STAGES.map((st) => {
        const col = deals.filter((d) => d.stage === st.id);
        const total = col.reduce((s, d) => s + Number(d.amount), 0);
        return (
          <div key={st.id} className="flex w-72 shrink-0 flex-col rounded-2xl border border-slate-200 bg-slate-100/60 p-2 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between px-1 pb-2">
              <span className={`badge ${st.color}`}>{st.label} · {col.length}</span>
              <span className="text-xs font-medium tabular-nums">₹{formatMoney(total)}</span>
            </div>
            <div className="flex min-h-24 flex-col gap-2">
              {col.map((d) => (
                <div key={d.id} className="card p-3 text-sm">
                  <div className="font-medium">{d.title}</div>
                  <Link href={`/leads/${d.lead_id}`} className="text-xs text-indigo-600 hover:underline">{d.lead_name}</Link>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1"><BusinessBadge business={d.business} />{d.owner_name && <span className="muted">{d.owner_name}</span>}</span>
                    <span className="font-semibold tabular-nums">₹{formatMoney(d.amount)}</span>
                  </div>
                  <select key={d.stage} className="input-sm mt-2 w-full" defaultValue={d.stage} onChange={(e) => { const v = e.target.value; start(() => updateDeal(d.id, { stage: v })); }}>
                    {DEAL_STAGES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
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
