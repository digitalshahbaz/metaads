"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { checkPassword, COOKIE, cookieMaxAge, createToken } from "@/lib/auth";
import { isStatus, normalizeLeadInput, scoreLead, statusMeta, type Lead, type Purchase } from "@/lib/leads";
import { upsertLead, type LeadInput } from "@/lib/upsert";

export async function login(_: unknown, form: FormData) {
  if (!process.env.APP_PASSWORD) return { error: "APP_PASSWORD is not set on the server." };
  if (!checkPassword(String(form.get("password") ?? ""))) return { error: "Wrong password." };
  (await cookies()).set(COOKIE, await createToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: cookieMaxAge,
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(COOKIE);
  redirect("/login");
}

function formToObject(form: FormData) {
  const o: Record<string, string> = {};
  form.forEach((v, k) => {
    if (typeof v === "string") o[k] = v;
  });
  return o;
}

function refresh() {
  revalidatePath("/", "layout");
}

export async function createLead(form: FormData) {
  const l = normalizeLeadInput(formToObject(form));
  const sql = await db();
  const { id, created } = await upsertLead(
    sql,
    { ...l, funnels: l.funnel ? [l.funnel] : [], last_seen: new Date().toISOString() },
    "Lead added manually",
  );
  if (!created) await rescore(sql, id);
  refresh();
  redirect(`/leads/${id}`);
}

/** Recompute score/temperature after a manual change. */
async function rescore(sql: Awaited<ReturnType<typeof db>>, id: number) {
  const [l] = await sql<Lead[]>`SELECT * FROM leads WHERE id = ${id}`;
  if (!l) return;
  const { score, temperature } = scoreLead({ ...l, total_spent: Number(l.total_spent) });
  await sql`UPDATE leads SET score = ${score}, temperature = ${temperature} WHERE id = ${id}`;
}

export async function updateLead(id: number, form: FormData) {
  const l = normalizeLeadInput(formToObject(form));
  const sql = await db();
  const [before] = await sql`SELECT status FROM leads WHERE id = ${id}`;
  await sql`
    UPDATE leads SET name = ${l.name}, email = ${l.email}, phone = ${l.phone}, company = ${l.company},
      source = ${l.source}, status = ${l.status}, value = ${l.value}, tags = ${l.tags},
      notes = ${l.notes}, follow_up = ${l.follow_up}, business = ${l.business},
      profession = ${l.profession}, city = ${l.city}, updated_at = now()
    WHERE id = ${id}`;
  await rescore(sql, id);
  if (before && before.status !== l.status) {
    await sql`INSERT INTO lead_activities (lead_id, type, content)
      VALUES (${id}, 'status', ${`Status: ${statusMeta(before.status).label} → ${statusMeta(l.status).label}`})`;
  }
  refresh();
  redirect(`/leads/${id}`);
}

export async function setStatus(id: number, status: string) {
  if (!isStatus(status)) return;
  const sql = await db();
  const [before] = await sql`SELECT status FROM leads WHERE id = ${id}`;
  if (!before || before.status === status) return;
  await sql`UPDATE leads SET status = ${status}, updated_at = now() WHERE id = ${id}`;
  await sql`INSERT INTO lead_activities (lead_id, type, content)
    VALUES (${id}, 'status', ${`Status: ${statusMeta(before.status).label} → ${statusMeta(status).label}`})`;
  await rescore(sql, id);
  refresh();
}

export async function deleteLead(id: number) {
  const sql = await db();
  await sql`DELETE FROM leads WHERE id = ${id}`;
  refresh();
  redirect("/leads");
}

export async function deleteLeads(ids: number[]) {
  if (!ids.length) return;
  const sql = await db();
  await sql`DELETE FROM leads WHERE id = ANY(${ids})`;
  refresh();
}

export async function bulkSetStatus(ids: number[], status: string) {
  if (!ids.length || !isStatus(status)) return;
  const sql = await db();
  await sql`UPDATE leads SET status = ${status}, updated_at = now() WHERE id = ANY(${ids})`;
  refresh();
}

export async function addActivity(id: number, form: FormData) {
  const content = String(form.get("content") ?? "").trim();
  const type = String(form.get("type") ?? "note");
  if (!content) return;
  const sql = await db();
  await sql`INSERT INTO lead_activities (lead_id, type, content) VALUES (${id}, ${type}, ${content})`;
  await sql`UPDATE leads SET updated_at = now() WHERE id = ${id}`;
  refresh();
}

export async function deleteActivity(leadId: number, activityId: number) {
  const sql = await db();
  await sql`DELETE FROM lead_activities WHERE id = ${activityId} AND lead_id = ${leadId}`;
  refresh();
}

export async function importLeads(rows: Record<string, string>[], defaultSource: string, business: string, funnel: string) {
  const sql = await db();
  let created = 0, merged = 0, skipped = 0;
  for (const r of rows) {
    const l = normalizeLeadInput({ source: defaultSource || "import", business, ...lowerKeys(r) });
    if (l.name === "Unnamed lead" && !l.email && !l.phone) { skipped++; continue; }
    const name = funnel || l.funnel || "CSV import";
    const res = await upsertLead(sql, {
      ...l,
      funnels: [name],
      touchpoints: [{ business: l.business, funnel: name, sheet: "CSV import", date: new Date().toISOString() }],
      last_seen: new Date().toISOString(),
    }, `Imported from CSV (${name})`);
    if (res.created) created++; else merged++;
  }
  refresh();
  return { created, merged, skipped };
}

/** Bulk import of pre-cleaned leads (the JSON bundle produced by the data clean-up). */
export async function importBundle(leads: (LeadInput & { purchases?: Purchase[] })[]) {
  const sql = await db();
  let created = 0, merged = 0;
  for (const l of leads) {
    if (!l || typeof l.name !== "string") continue;
    const res = await upsertLead(sql, l);
    if (res.created) {
      created++;
      await sql`INSERT INTO lead_activities (lead_id, type, content)
        VALUES (${res.id}, 'system', ${`Imported from lead sheets: ${(l.funnels ?? []).join(", ")}`})`;
    } else merged++;
  }
  refresh();
  return { created, merged };
}

function lowerKeys(r: Record<string, string>) {
  const o: Record<string, string> = {};
  for (const [k, v] of Object.entries(r)) o[k.trim().toLowerCase()] = v;
  return o;
}
