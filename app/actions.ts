"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { checkPassword, COOKIE, cookieMaxAge, createToken } from "@/lib/auth";
import { isStatus, normalizeLeadInput, statusMeta } from "@/lib/leads";

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
  const [row] = await sql`
    INSERT INTO leads (name, email, phone, company, source, status, value, tags, notes, follow_up)
    VALUES (${l.name}, ${l.email}, ${l.phone}, ${l.company}, ${l.source}, ${l.status},
            ${l.value}, ${l.tags}, ${l.notes}, ${l.follow_up})
    RETURNING id`;
  await sql`INSERT INTO lead_activities (lead_id, type, content) VALUES (${row.id}, 'system', 'Lead created')`;
  refresh();
  redirect(`/leads/${row.id}`);
}

export async function updateLead(id: number, form: FormData) {
  const l = normalizeLeadInput(formToObject(form));
  const sql = await db();
  const [before] = await sql`SELECT status FROM leads WHERE id = ${id}`;
  await sql`
    UPDATE leads SET name = ${l.name}, email = ${l.email}, phone = ${l.phone}, company = ${l.company},
      source = ${l.source}, status = ${l.status}, value = ${l.value}, tags = ${l.tags},
      notes = ${l.notes}, follow_up = ${l.follow_up}, updated_at = now()
    WHERE id = ${id}`;
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

export async function importLeads(rows: Record<string, string>[], defaultSource: string) {
  const sql = await db();
  const clean = rows
    .map((r) => normalizeLeadInput({ source: defaultSource || "import", ...lowerKeys(r) }))
    .filter((l) => l.name !== "Unnamed lead" || l.email || l.phone);
  if (!clean.length) return { inserted: 0, skipped: rows.length };

  // Skip rows whose email or phone already exists.
  const existing = await sql<{ email: string | null; phone: string | null }[]>`SELECT email, phone FROM leads`;
  const emails = new Set(existing.map((e) => e.email?.toLowerCase()).filter(Boolean));
  const phones = new Set(existing.map((e) => normPhone(e.phone)).filter(Boolean));
  const fresh = clean.filter((l) => {
    const dup = (l.email && emails.has(l.email.toLowerCase())) || (l.phone && phones.has(normPhone(l.phone)));
    if (l.email) emails.add(l.email.toLowerCase());
    if (l.phone) phones.add(normPhone(l.phone));
    return !dup;
  });

  for (let i = 0; i < fresh.length; i += 500) {
    const chunk = fresh.slice(i, i + 500).map((l) => ({ ...l, tags: `{${l.tags.map((t) => JSON.stringify(t)).join(",")}}` }));
    await sql`INSERT INTO leads ${sql(chunk, "name", "email", "phone", "company", "source", "status", "value", "tags", "notes", "follow_up")}`;
  }
  refresh();
  return { inserted: fresh.length, skipped: rows.length - fresh.length };
}

function lowerKeys(r: Record<string, string>) {
  const o: Record<string, string> = {};
  for (const [k, v] of Object.entries(r)) o[k.trim().toLowerCase()] = v;
  return o;
}

function normPhone(p: string | null) {
  return p ? p.replace(/\D/g, "").slice(-10) : "";
}
