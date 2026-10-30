import Link from "next/link";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { buildWhere, filterQuery, filtersFrom } from "@/lib/filters";
import { renderTemplate, type Lead, type Template } from "@/lib/leads";
import { OutreachList } from "@/components/outreach-list";

type SP = Promise<Record<string, string | undefined>>;
const LIMIT = 100;

export default async function OutreachPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const s = await requireSession();
  const sql = await db();
  const ids = (sp.ids ?? "").split(",").map(Number).filter(Boolean);
  const where = buildWhere(sql, filtersFrom(sp), s);
  const [templates, leads, [{ n }]] = await Promise.all([
    sql<Template[]>`SELECT * FROM templates ORDER BY channel DESC, name`,
    sql<Lead[]>`SELECT * FROM leads ${where} ${ids.length ? sql`AND id = ANY(${ids})` : sql``}
                ORDER BY score DESC LIMIT ${LIMIT}`,
    sql`SELECT count(*)::int AS n FROM leads ${where} ${ids.length ? sql`AND id = ANY(${ids})` : sql``}`,
  ]);
  const t = templates.find((x) => x.id === Number(sp.template));
  const base = filterQuery(sp, ids.length ? { ids: ids.join(",") } : {});

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <Link href={`/leads?${filterQuery(sp)}`} className="text-sm muted hover:underline">← Back to leads</Link>
        <h1 className="page-title mt-1">Send messages</h1>
        <p className="text-sm muted">{n.toLocaleString("en-IN")} lead(s) selected{n > LIMIT ? ` — showing the best ${LIMIT} by score` : ""}. Pick a template:</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {templates.map((x) => (
          <Link key={x.id} href={`/outreach?${base}&template=${x.id}`}
            className={`badge border px-3 py-1.5 text-sm ${t?.id === x.id ? "border-indigo-500 bg-indigo-600 text-white" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"}`}>
            {x.channel === "whatsapp" ? "💬" : "✉️"} {x.name}
          </Link>
        ))}
        <Link href="/templates" className="badge border border-dashed border-slate-300 px-3 py-1.5 text-sm muted">+ New template</Link>
      </div>
      {t ? (
        <OutreachList
          templateId={t.id}
          channel={t.channel}
          rows={leads.map((l) => ({ id: l.id, name: l.name, phone: l.phone, email: l.email, preview: renderTemplate(t.body, l, s.name) }))}
        />
      ) : <div className="card p-8 text-center text-sm muted">Choose a template above to start.</div>}
    </div>
  );
}
