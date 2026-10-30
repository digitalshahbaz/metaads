import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import type { CustomField } from "@/lib/leads";
import { FieldForm, FieldRow } from "@/components/admin-forms";

export default async function FieldsPage() {
  const s = await requireSession();
  if (s.role !== "admin") redirect("/");
  const sql = await db();
  const [fields, usage] = await Promise.all([
    sql<CustomField[]>`SELECT * FROM custom_fields ORDER BY position, id`,
    sql<{ key: string; value: string; n: number }[]>`
      SELECT k.key, k.value, count(*)::int AS n FROM leads, jsonb_each_text(custom) k GROUP BY 1, 2`,
  ]);
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="page-title">Custom fields</h1>
        <p className="text-sm muted">Your own columns, just like in Google Sheets. Dropdowns can be edited right in the leads table and used as filters.</p>
      </div>
      <section className="card p-5"><h2 className="mb-3 font-semibold">Add a column</h2><FieldForm /></section>
      <section className="card px-5 py-2">
        {fields.length === 0 ? <p className="py-4 text-sm muted">No custom fields yet.</p> : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {fields.map((f) => <FieldRow key={f.id} f={{ ...f }} usage={usage.filter((u) => u.key === f.key).map((u) => ({ value: u.value, n: u.n }))} />)}
          </ul>
        )}
      </section>
    </div>
  );
}
