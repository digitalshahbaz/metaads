import { businessMeta, statusMeta, temperatureMeta } from "@/lib/leads";

export function StatusBadge({ status }: { status: string }) {
  const s = statusMeta(status);
  return <span className={`badge ${s.color}`}>{s.label}</span>;
}

export function BusinessBadge({ business, long }: { business: string; long?: boolean }) {
  const b = businessMeta(business);
  return <span className={`badge ${b.color}`} title={b.label}>{long ? b.label : b.short}</span>;
}

export function ScoreBadge({ score, temperature }: { score: number; temperature: string }) {
  const t = temperatureMeta(temperature);
  return <span className={`badge tabular-nums ${t.color}`} title={`Lead score ${score}/100`}>{t.label} · {score}</span>;
}
