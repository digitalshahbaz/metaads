import { statusMeta } from "@/lib/leads";

export function StatusBadge({ status }: { status: string }) {
  const s = statusMeta(status);
  return <span className={`badge ${s.color}`}>{s.label}</span>;
}
