"use client";

import { useState } from "react";

export type DayPoint = { day: string; fresh: number; repeat: number };

/** Stacked daily bars: new leads (series-1) + repeat entries (series-2), with hover tooltip and a table view. */
export function DailyChart({ data }: { data: DayPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = Math.max(1, ...data.map((d) => d.fresh + d.repeat));
  const H = 180;
  const n = data.length;
  const step = n > 45 ? Math.ceil(n / 8) : n > 14 ? 7 : 1;
  const label = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const ticks = [0, Math.round(max / 2), max];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: "var(--series-1)" }} /> New leads</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: "var(--series-2)" }} /> Repeat entries</span>
        </div>
        <button className="text-indigo-600 hover:underline" onClick={() => setTable((t) => !t)}>{table ? "Show chart" : "Show table"}</button>
      </div>
      {table ? (
        <div className="max-h-64 overflow-y-auto text-sm">
          <table className="w-full">
            <thead className="text-xs muted"><tr><th className="py-1 text-left font-medium">Day</th><th className="text-right font-medium">New</th><th className="text-right font-medium">Repeat</th></tr></thead>
            <tbody>{[...data].reverse().map((d) => (
              <tr key={d.day} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-1">{label(d.day)}</td><td className="text-right tabular-nums">{d.fresh}</td><td className="text-right tabular-nums">{d.repeat}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : (
        <div className="relative flex gap-2">
          <div className="flex h-[180px] flex-col justify-between text-right text-[11px] tabular-nums muted" aria-hidden>
            {[...ticks].reverse().map((t) => <span key={t}>{t}</span>)}
          </div>
          <div className="relative min-w-0 flex-1">
            <div className="absolute inset-x-0 top-0 h-[180px]" aria-hidden>
              {ticks.map((t) => (
                <div key={t} className="absolute inset-x-0 border-t border-slate-100 dark:border-slate-800" style={{ bottom: `${(t / max) * H}px` }} />
              ))}
            </div>
            <div className="relative flex h-[180px] items-end" role="img" aria-label="Leads per day">
              {data.map((d, i) => {
                const fh = (d.fresh / max) * H;
                const rh = (d.repeat / max) * H;
                return (
                  <div
                    key={d.day}
                    className="flex h-full flex-1 cursor-default flex-col justify-end px-[1px]"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <div className={`mx-auto flex w-full max-w-6 flex-col justify-end gap-[2px] ${hover === i ? "opacity-100" : hover === null ? "opacity-100" : "opacity-60"}`}>
                      {d.repeat > 0 && <div className="rounded-t-[4px]" style={{ height: Math.max(rh, 2), background: "var(--series-2)" }} />}
                      {d.fresh > 0 && <div className={d.repeat > 0 ? "" : "rounded-t-[4px]"} style={{ height: Math.max(fh, 2), background: "var(--series-1)" }} />}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-1 flex text-[11px] muted" aria-hidden>
              {data.map((d, i) => (
                <div key={d.day} className="flex-1 text-center whitespace-nowrap">{i % step === 0 ? label(d.day) : ""}</div>
              ))}
            </div>
            {hover !== null && (
              <div
                className="pointer-events-none absolute top-0 z-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800"
                style={{ left: `clamp(0px, calc(${((hover + 0.5) / n) * 100}% - 70px), calc(100% - 140px))` }}
              >
                <div className="font-medium">{label(data[hover].day)}</div>
                <div className="mt-1 flex items-center gap-1.5"><span className="size-2 rounded-sm" style={{ background: "var(--series-1)" }} /> New: <b className="tabular-nums">{data[hover].fresh}</b></div>
                <div className="flex items-center gap-1.5"><span className="size-2 rounded-sm" style={{ background: "var(--series-2)" }} /> Repeat: <b className="tabular-nums">{data[hover].repeat}</b></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
