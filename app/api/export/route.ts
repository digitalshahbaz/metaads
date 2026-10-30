import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { buildWhere, filtersFrom } from "@/lib/filters";
import { canManage, getSession } from "@/lib/session";

function cell(v: unknown) {
  if (v === null || v === undefined) return "";
  const s = v instanceof Date ? v.toISOString() : Array.isArray(v) ? v.join(", ")
    : typeof v === "object" ? Object.entries(v as Record<string, string>).map(([k, x]) => `${k}: ${x}`).join("; ") : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s || !canManage(s)) return new Response("Only admins and managers can export.", { status: 403 });
  const sql = await db();
  const f = filtersFrom(Object.fromEntries(req.nextUrl.searchParams));
  const rows = await sql`
    SELECT id, name, email, phone, business, score, temperature, is_customer, total_spent,
           funnels, entries, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
           call_count, last_call_outcome, last_call_at, custom,
           profession, city, company, source, status, value, tags, notes, follow_up,
           created_at AS first_seen, last_seen, updated_at
    FROM leads ${buildWhere(sql, f, s)} ORDER BY score DESC, created_at DESC`;
  const cols = ["id", "name", "email", "phone", "business", "score", "temperature", "is_customer", "total_spent",
    "funnels", "entries", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
    "call_count", "last_call_outcome", "last_call_at", "custom", "profession", "city", "company", "source", "status", "value", "tags", "notes", "follow_up",
    "first_seen", "last_seen", "updated_at"];
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${[f.biz, f.segment, f.funnel, f.temp].filter(Boolean).join("-").replace(/[^\w-]+/g, "_") || "all"}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
