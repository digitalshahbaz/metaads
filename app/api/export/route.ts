import { db } from "@/lib/db";

function cell(v: unknown) {
  if (v === null || v === undefined) return "";
  const s = v instanceof Date ? v.toISOString() : Array.isArray(v) ? v.join(", ") : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const sql = await db();
  const rows = await sql`
    SELECT id, name, email, phone, company, source, status, value, tags, notes, follow_up, created_at, updated_at
    FROM leads ORDER BY created_at DESC`;
  const cols = ["id", "name", "email", "phone", "company", "source", "status", "value", "tags", "notes", "follow_up", "created_at", "updated_at"];
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
