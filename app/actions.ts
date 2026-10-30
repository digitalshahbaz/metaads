"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { checkMasterPassword, COOKIE, cookieMaxAge, createToken, type Role } from "@/lib/auth";
import { assertLeadAccess, canManage, getSession, isAdmin, requireRole, requireSession, verifyPassword } from "@/lib/session";
import { isStatus, normalizeLeadInput, outcomeMeta, scoreLead, statusMeta, type Lead, type Purchase } from "@/lib/leads";
import { upsertLead, type LeadInput } from "@/lib/upsert";

export async function login(_: unknown, form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const sql = await db();
  let user: { id: number; name: string; role: Role } | undefined;

  // Owner: the APP_PASSWORD with an empty email (or "owner") always works, and owns a real user row.
  if ((!email || email === "owner") && checkMasterPassword(password)) {
    [user] = await sql<{ id: number; name: string; role: Role }[]>`
      INSERT INTO users (name, email, role) VALUES ('Owner', 'owner', 'admin')
      ON CONFLICT (email) DO UPDATE SET active = true, role = 'admin'
      RETURNING id, name, role`;
  } else if (email) {
    const [u] = await sql<{ id: number; name: string; role: Role; active: boolean; password_hash: string | null }[]>`
      SELECT id, name, role, active, password_hash FROM users WHERE lower(email) = ${email}`;
    if (u && u.active && (await verifyPassword(password, u.password_hash))) user = u;
  }
  if (!user) return { error: email ? "Wrong email or password." : "Wrong password. Team members: enter your email too." };

  await sql`UPDATE users SET last_login = now() WHERE id = ${user.id}`;
  (await cookies()).set(COOKIE, await createToken({ uid: user.id, role: user.role, name: user.name }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: cookieMaxAge,
  });
  redirect(user.role === "caller" ? "/tasks" : "/");
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

async function log(leadId: number, type: string, content: string, userId: number | null) {
  const sql = await db();
  await sql`INSERT INTO lead_activities (lead_id, type, content, user_id) VALUES (${leadId}, ${type}, ${content}, ${userId})`;
}

export async function createLead(form: FormData) {
  const s = await requireSession();
  const l = normalizeLeadInput(formToObject(form));
  const sql = await db();
  const ownerId = s.role === "caller" ? s.uid : Number(form.get("owner_id")) || null;
  const funnel = l.funnel || "Manual entry";
  const now = new Date().toISOString();
  const { id, created } = await upsertLead(
    sql,
    {
      ...l, funnels: [funnel], last_seen: now, owner_id: ownerId,
      touchpoints: [{ business: l.business, funnel, sheet: `Added by ${s.name}`, date: now, utm: l.utm }],
    },
  );
  await log(id, "system", created ? `Lead added by ${s.name}` : `${s.name} added this person again (matched existing lead)`, s.uid);
  if (!created) await rescore(id);
  refresh();
  redirect(`/leads/${id}`);
}

/** Recompute score/temperature after a manual change. */
async function rescore(id: number) {
  const sql = await db();
  const [l] = await sql<Lead[]>`SELECT * FROM leads WHERE id = ${id}`;
  if (!l) return;
  const { score, temperature } = scoreLead({ ...l, total_spent: Number(l.total_spent) });
  await sql`UPDATE leads SET score = ${score}, temperature = ${temperature} WHERE id = ${id}`;
}

export async function updateLead(id: number, form: FormData) {
  const s = await requireSession();
  await assertLeadAccess(s, id);
  const l = normalizeLeadInput(formToObject(form));
  const sql = await db();
  const [before] = await sql`SELECT status FROM leads WHERE id = ${id}`;
  await sql`
    UPDATE leads SET name = ${l.name}, email = ${l.email}, phone = ${l.phone}, company = ${l.company},
      source = ${l.source}, status = ${l.status}, value = ${l.value}, tags = ${l.tags},
      notes = ${l.notes}, follow_up = ${l.follow_up}, business = ${l.business},
      profession = ${l.profession}, city = ${l.city}, updated_at = now()
    WHERE id = ${id}`;
  await rescore(id);
  if (before && before.status !== l.status) {
    await log(id, "status", `Status: ${statusMeta(before.status).label} → ${statusMeta(l.status).label}`, s.uid);
  }
  refresh();
  redirect(`/leads/${id}`);
}

export async function setStatus(id: number, status: string) {
  if (!isStatus(status)) return;
  const s = await requireSession();
  await assertLeadAccess(s, id);
  const sql = await db();
  const [before] = await sql`SELECT status FROM leads WHERE id = ${id}`;
  if (!before || before.status === status) return;
  await sql`UPDATE leads SET status = ${status}, updated_at = now() WHERE id = ${id}`;
  await log(id, "status", `Status: ${statusMeta(before.status).label} → ${statusMeta(status).label}`, s.uid);
  await rescore(id);
  refresh();
}

/** Inline edit of one custom field (the "dropdown in the sheet" use case). */
export async function setCustomField(id: number, key: string, value: string) {
  const s = await requireSession();
  await assertLeadAccess(s, id);
  if (!/^\w+$/.test(key)) return;
  const sql = await db();
  const [f] = await sql<{ label: string }[]>`SELECT label FROM custom_fields WHERE key = ${key}`;
  if (!f) return;
  const v = value.trim();
  await sql`UPDATE leads SET custom = ${v ? sql`custom || ${sql.json({ [key]: v })}` : sql`custom - ${key}`}, updated_at = now()
            WHERE id = ${id}`;
  await log(id, "field", `${f.label}: ${v || "(cleared)"}`, s.uid);
  refresh();
}

export async function assignLead(id: number, ownerId: number | null) {
  const s = await requireSession();
  if (!canManage(s)) throw new Error("Only admins and managers can assign leads.");
  const sql = await db();
  const [u] = ownerId ? await sql<{ name: string }[]>`SELECT name FROM users WHERE id = ${ownerId}` : [{ name: "nobody" }];
  await sql`UPDATE leads SET owner_id = ${ownerId}, updated_at = now() WHERE id = ${id}`;
  await log(id, "system", `Assigned to ${u?.name ?? "nobody"} by ${s.name}`, s.uid);
  refresh();
}

export async function bulkAssign(ids: number[], ownerIds: number[]) {
  const s = await requireSession();
  if (!canManage(s)) throw new Error("Only admins and managers can assign leads.");
  if (!ids.length) return;
  const sql = await db();
  if (ownerIds.length <= 1) {
    await sql`UPDATE leads SET owner_id = ${ownerIds[0] ?? null}, updated_at = now() WHERE id = ANY(${ids})`;
  } else {
    // Round-robin distribution, best-scored leads spread evenly.
    const ordered = await sql<{ id: number }[]>`SELECT id FROM leads WHERE id = ANY(${ids}) ORDER BY score DESC`;
    for (let i = 0; i < ownerIds.length; i++) {
      const chunk = ordered.filter((_, j) => j % ownerIds.length === i).map((r) => r.id);
      if (chunk.length) await sql`UPDATE leads SET owner_id = ${ownerIds[i]}, updated_at = now() WHERE id = ANY(${chunk})`;
    }
  }
  refresh();
}

export async function deleteLead(id: number) {
  const s = await requireSession();
  if (!isAdmin(s)) throw new Error("Only admins can delete leads.");
  const sql = await db();
  await sql`DELETE FROM leads WHERE id = ${id}`;
  refresh();
  redirect("/leads");
}

export async function deleteLeads(ids: number[]) {
  const s = await requireSession();
  if (!isAdmin(s)) throw new Error("Only admins can delete leads.");
  if (!ids.length) return;
  const sql = await db();
  await sql`DELETE FROM leads WHERE id = ANY(${ids})`;
  refresh();
}

export async function bulkSetStatus(ids: number[], status: string) {
  const s = await requireSession();
  if (!ids.length || !isStatus(status)) return;
  const sql = await db();
  await sql`UPDATE leads SET status = ${status}, updated_at = now()
            WHERE id = ANY(${ids}) ${s.role === "caller" ? sql`AND owner_id = ${s.uid}` : sql``}`;
  refresh();
}

export async function bulkSetCustom(ids: number[], key: string, value: string) {
  const s = await requireSession();
  if (!ids.length || !/^\w+$/.test(key)) return;
  const sql = await db();
  await sql`UPDATE leads SET custom = ${value ? sql`custom || ${sql.json({ [key]: value })}` : sql`custom - ${key}`}, updated_at = now()
            WHERE id = ANY(${ids}) ${s.role === "caller" ? sql`AND owner_id = ${s.uid}` : sql``}`;
  refresh();
}

export async function addActivity(id: number, form: FormData) {
  const s = await requireSession();
  await assertLeadAccess(s, id);
  const content = String(form.get("content") ?? "").trim();
  const type = String(form.get("type") ?? "note");
  if (!content) return;
  const sql = await db();
  await log(id, type, content, s.uid);
  await sql`UPDATE leads SET updated_at = now() WHERE id = ${id}`;
  refresh();
}

/** Log a call with its outcome; optionally schedule the next follow-up as a task. */
export async function logCall(id: number, form: FormData) {
  const s = await requireSession();
  await assertLeadAccess(s, id);
  const outcome = String(form.get("outcome") ?? "");
  const meta = outcomeMeta(outcome);
  if (!meta) return;
  const note = String(form.get("note") ?? "").trim();
  const minutes = Number(form.get("minutes")) || 0;
  const followUp = String(form.get("follow_up_at") ?? "");
  const sql = await db();
  await sql`INSERT INTO lead_activities (lead_id, type, content, user_id, outcome, duration_sec)
    VALUES (${id}, 'call', ${`${meta.label}${note ? ` — ${note}` : ""}`}, ${s.uid}, ${outcome}, ${minutes ? Math.round(minutes * 60) : null})`;
  await sql`UPDATE leads SET call_count = call_count + 1, last_call_at = now(), last_call_outcome = ${outcome},
              status = CASE WHEN status = 'new' AND ${meta.reached} THEN 'contacted'
                            WHEN ${outcome} = 'interested' AND status IN ('new','contacted') THEN 'qualified'
                            ELSE status END,
              updated_at = now()
            WHERE id = ${id}`;
  if (followUp) {
    // datetime-local is IST wall-clock time.
    await sql`INSERT INTO tasks (lead_id, user_id, title, due_at, created_by)
      VALUES (${id}, ${s.uid}, ${`Follow up: ${meta.label.toLowerCase()}${note ? ` — ${note.slice(0, 80)}` : ""}`},
              (${followUp}::timestamp AT TIME ZONE 'Asia/Kolkata'), ${s.uid})`;
  }
  await rescore(id);
  refresh();
}

export async function deleteActivity(leadId: number, activityId: number) {
  const s = await requireSession();
  const sql = await db();
  await sql`DELETE FROM lead_activities WHERE id = ${activityId} AND lead_id = ${leadId}
            ${isAdmin(s) ? sql`` : sql`AND user_id = ${s.uid}`}`;
  refresh();
}

export async function importLeads(rows: Record<string, string>[], defaultSource: string, business: string, funnel: string) {
  const s = await requireRole("admin", "manager");
  const sql = await db();
  let created = 0, merged = 0, skipped = 0;
  for (const r of rows) {
    const l = normalizeLeadInput({ source: defaultSource || "import", business, ...lowerKeys(r) });
    if (l.name === "Unnamed lead" && !l.email && !l.phone) { skipped++; continue; }
    const name = funnel || l.funnel || "CSV import";
    const res = await upsertLead(sql, {
      ...l,
      funnels: [name],
      touchpoints: [{ business: l.business, funnel: name, sheet: `CSV import by ${s.name}`, date: new Date().toISOString(), utm: l.utm }],
      last_seen: new Date().toISOString(),
    });
    if (res.created) created++; else merged++;
  }
  refresh();
  return { created, merged, skipped };
}

/** Bulk import of pre-cleaned leads (the JSON bundle produced by the data clean-up). */
export async function importBundle(leads: (LeadInput & { purchases?: Purchase[] })[]) {
  await requireRole("admin", "manager");
  const sql = await db();
  let created = 0, merged = 0;
  for (const l of leads) {
    if (!l || typeof l.name !== "string") continue;
    const res = await upsertLead(sql, l);
    if (res.created) {
      created++;
      await log(res.id, "system", `Imported from lead sheets: ${(l.funnels ?? []).join(", ")}`, null);
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

export async function whoAmI() {
  return getSession();
}
