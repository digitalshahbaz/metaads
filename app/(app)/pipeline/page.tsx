import { db } from "@/lib/db";
import type { Lead } from "@/lib/leads";
import { Kanban } from "@/components/kanban";

export default async function PipelinePage() {
  const sql = await db();
  const leads = await sql<Lead[]>`
    SELECT * FROM leads
    WHERE status NOT IN ('won','lost') OR updated_at > now() - interval '30 days'
    ORDER BY updated_at DESC LIMIT 1000`;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Pipeline</h1>
        <p className="text-sm text-zinc-500">Drag cards between columns to change status. Won/Lost show the last 30 days.</p>
      </div>
      <Kanban leads={leads.map((l) => ({ ...l }))} />
    </div>
  );
}
