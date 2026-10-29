import { db } from "@/lib/db";
import type { Lead } from "@/lib/leads";
import { Kanban } from "@/components/kanban";
import { BizTabs } from "@/components/biz-tabs";
import { buildWhere } from "@/lib/filters";

type SP = Promise<Record<string, string | undefined>>;

export default async function PipelinePage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const sql = await db();
  // Untouched "new" leads are many; show only the best ones here — the full list lives on Leads.
  const leads = await sql<Lead[]>`
    (SELECT * FROM leads ${buildWhere(sql, { biz: sp.biz })} AND status NOT IN ('new','won','lost')
       ORDER BY score DESC LIMIT 600)
    UNION ALL
    (SELECT * FROM leads ${buildWhere(sql, { biz: sp.biz })} AND status = 'new' ORDER BY score DESC LIMIT 60)
    UNION ALL
    (SELECT * FROM leads ${buildWhere(sql, { biz: sp.biz })} AND status IN ('won','lost')
       AND updated_at > now() - interval '30 days' ORDER BY updated_at DESC LIMIT 200)`;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Pipeline</h1>
          <p className="text-sm text-zinc-500">Drag cards between columns to change status. "New" shows the 60 best-scored leads; Won/Lost show the last 30 days.</p>
        </div>
        <BizTabs path="/pipeline" params={sp} />
      </div>
      <Kanban leads={leads.map((l) => ({ ...l }))} />
    </div>
  );
}
