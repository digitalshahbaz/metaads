import Link from "next/link";
import { db } from "@/lib/db";
import { SEGMENTS, buildWhere } from "@/lib/filters";
import { BizTabs } from "@/components/biz-tabs";
import { requireSession } from "@/lib/session";

type SP = Promise<Record<string, string | undefined>>;

export default async function SegmentsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const biz = sp.biz === "dmm" || sp.biz === "ds" ? sp.biz : "";
  const session = await requireSession();
  const sql = await db();
  const list = SEGMENTS.filter((s) => !biz || s.business === biz || s.business === "any");
  const counts = await Promise.all(
    list.map(async (s) => {
      const [r] = await sql`
        SELECT count(*)::int AS n,
               count(*) FILTER (WHERE temperature = 'hot')::int AS hot,
               count(*) FILTER (WHERE phone IS NOT NULL)::int AS phones
        FROM leads ${buildWhere(sql, { biz, segment: s.id }, session)}`;
      return r as { n: number; hot: number; phones: number };
    }),
  );
  const q = (id: string) => `segment=${id}${biz ? `&biz=${biz}` : ""}`;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Segments</h1>
          <p className="text-sm muted">Ready-made audiences to nurture and sell to. Open one to work it, or export it for a WhatsApp or email campaign.</p>
        </div>
        <BizTabs path="/segments" params={sp} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((s, i) => (
          <div key={s.id} className="card flex flex-col p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-medium tracking-wide muted uppercase">
                  {s.business === "dmm" ? "Digimark Media" : s.business === "ds" ? "Digital Shahbaz" : "Both businesses"}
                </span>
                <h2 className="font-medium">{s.title}</h2>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold tabular-nums">{counts[i].n.toLocaleString("en-IN")}</div>
                <div className="text-xs muted">{counts[i].hot} hot · {counts[i].phones} with phone</div>
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{s.why}</p>
            <p className="mt-1 text-sm"><b>Next step:</b> {s.action}</p>
            <div className="mt-auto flex gap-2 pt-3">
              <Link href={`/leads?${q(s.id)}`} className="btn-primary">Open list</Link>
              <Link href={`/outreach?${q(s.id)}`} className="btn-wa">Message</Link>
              {session.role !== "caller" && <a href={`/api/export?${q(s.id)}`} className="btn-ghost">Export CSV</a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
