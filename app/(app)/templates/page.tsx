import { db } from "@/lib/db";
import { canManage, requireSession } from "@/lib/session";
import type { Template } from "@/lib/leads";
import { TemplateCard, TemplateEditor } from "@/components/admin-forms";

export default async function TemplatesPage() {
  const s = await requireSession();
  const sql = await db();
  const templates = await sql<Template[]>`SELECT * FROM templates ORDER BY channel DESC, name`;
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="page-title">Message templates</h1>
        <p className="text-sm muted">One-click WhatsApp & email messages. Use them on a lead&apos;s page, or select many leads and click <b>Message</b> to work through a list.</p>
      </div>
      {canManage(s) && <section className="card p-5"><h2 className="mb-3 font-semibold">New template</h2><TemplateEditor /></section>}
      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((t) => <TemplateCard key={t.id} t={{ ...t }} canEdit={canManage(s)} />)}
      </div>
    </div>
  );
}
