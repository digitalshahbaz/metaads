"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertLeadAccess, canManage, hashPassword, isAdmin, requireRole, requireSession } from "@/lib/session";
import { DEAL_STAGES, isBusiness, renderTemplate, type Lead, type Template } from "@/lib/leads";

function refresh() {
  revalidatePath("/", "layout");
}

// ---------- tasks ----------

export async function addTask(form: FormData) {
  const s = await requireSession();
  const title = String(form.get("title") ?? "").trim();
  const due = String(form.get("due_at") ?? "");
  const leadId = Number(form.get("lead_id")) || null;
  const assignee = canManage(s) ? Number(form.get("user_id")) || s.uid : s.uid;
  if (!title || !due) return;
  if (leadId) await assertLeadAccess(s, leadId);
  const sql = await db();
  await sql`INSERT INTO tasks (lead_id, user_id, title, due_at, created_by)
            VALUES (${leadId}, ${assignee}, ${title}, (${due}::timestamp AT TIME ZONE 'Asia/Kolkata'), ${s.uid})`;
  refresh();
}

export async function toggleTask(id: number, done: boolean) {
  const s = await requireSession();
  const sql = await db();
  await sql`UPDATE tasks SET done_at = ${done ? sql`now()` : null}
            WHERE id = ${id} ${canManage(s) ? sql`` : sql`AND user_id = ${s.uid}`}`;
  refresh();
}

export async function deleteTask(id: number) {
  const s = await requireSession();
  const sql = await db();
  await sql`DELETE FROM tasks WHERE id = ${id} ${canManage(s) ? sql`` : sql`AND user_id = ${s.uid}`}`;
  refresh();
}

// ---------- deals ----------

export async function addDeal(form: FormData) {
  const s = await requireSession();
  const leadId = Number(form.get("lead_id"));
  await assertLeadAccess(s, leadId);
  const title = String(form.get("title") ?? "").trim();
  if (!title) return;
  const business = String(form.get("business") ?? "");
  const sql = await db();
  await sql`INSERT INTO deals (lead_id, title, business, amount, owner_id, expected_close)
            VALUES (${leadId}, ${title}, ${isBusiness(business) && business !== "both" ? business : "dmm"},
                    ${Number(form.get("amount")) || 0}, ${s.uid}, ${String(form.get("expected_close") || "") || null})`;
  await sql`INSERT INTO lead_activities (lead_id, type, content, user_id)
            VALUES (${leadId}, 'deal', ${`Deal created: ${title}`}, ${s.uid})`;
  await sql`UPDATE leads SET status = CASE WHEN status IN ('new','contacted','qualified') THEN 'proposal' ELSE status END WHERE id = ${leadId}`;
  refresh();
}

export async function updateDeal(id: number, patch: { stage?: string; amount?: number }) {
  const s = await requireSession();
  const sql = await db();
  const [d] = await sql<{ lead_id: number; title: string; amount: string }[]>`SELECT lead_id, title, amount FROM deals WHERE id = ${id}`;
  if (!d) return;
  await assertLeadAccess(s, d.lead_id);
  if (patch.stage && DEAL_STAGES.some((x) => x.id === patch.stage)) {
    const closed = patch.stage === "won" || patch.stage === "lost";
    await sql`UPDATE deals SET stage = ${patch.stage}, updated_at = now(), closed_at = ${closed ? sql`now()` : null} WHERE id = ${id}`;
    await sql`INSERT INTO lead_activities (lead_id, type, content, user_id)
              VALUES (${d.lead_id}, 'deal', ${`Deal "${d.title}" → ${DEAL_STAGES.find((x) => x.id === patch.stage)!.label}`}, ${s.uid})`;
    if (patch.stage === "won") {
      // A won deal is a sale: record the purchase on the lead and mark them as a customer.
      const purchase = { product: d.title, amount: Number(d.amount) || 0, date: new Date().toISOString().slice(0, 10) };
      await sql`UPDATE leads SET status = 'won', is_customer = true,
                  purchases = purchases || ${sql.json([purchase])}::jsonb,
                  total_spent = total_spent + ${purchase.amount}, updated_at = now()
                WHERE id = ${d.lead_id}`;
    }
  }
  if (patch.amount !== undefined && Number.isFinite(patch.amount)) {
    await sql`UPDATE deals SET amount = ${patch.amount}, updated_at = now() WHERE id = ${id}`;
  }
  refresh();
}

export async function deleteDeal(id: number) {
  const s = await requireSession();
  if (!canManage(s)) throw new Error("Only admins and managers can delete deals.");
  const sql = await db();
  await sql`DELETE FROM deals WHERE id = ${id}`;
  refresh();
}

// ---------- saved views ----------

export async function saveView(name: string, query: string, shared: boolean) {
  const s = await requireSession();
  const n = name.trim();
  if (!n) return;
  const sql = await db();
  await sql`INSERT INTO saved_views (name, query, user_id, shared) VALUES (${n}, ${query}, ${s.uid}, ${shared && canManage(s)})`;
  refresh();
}

export async function deleteView(id: number) {
  const s = await requireSession();
  const sql = await db();
  await sql`DELETE FROM saved_views WHERE id = ${id} ${isAdmin(s) ? sql`` : sql`AND user_id = ${s.uid}`}`;
  refresh();
}

// ---------- custom fields ----------

export async function saveField(form: FormData) {
  await requireRole("admin");
  const id = Number(form.get("id")) || null;
  const label = String(form.get("label") ?? "").trim();
  const type = String(form.get("type") ?? "text");
  if (!label || !["text", "number", "select", "date", "checkbox"].includes(type)) return;
  const options = String(form.get("options") ?? "").split(/[\n,]/).map((o) => o.trim()).filter(Boolean);
  const showInTable = form.get("show_in_table") === "on";
  const sql = await db();
  if (id) {
    await sql`UPDATE custom_fields SET label = ${label}, type = ${type}, options = ${options}, show_in_table = ${showInTable} WHERE id = ${id}`;
  } else {
    const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "field";
    const [{ n }] = await sql`SELECT count(*)::int AS n FROM custom_fields WHERE key LIKE ${base + "%"}`;
    await sql`INSERT INTO custom_fields (key, label, type, options, show_in_table, position)
              VALUES (${n ? `${base}_${n + 1}` : base}, ${label}, ${type}, ${options}, ${showInTable},
                      (SELECT coalesce(max(position), 0) + 1 FROM custom_fields))`;
  }
  refresh();
}

export async function deleteField(id: number) {
  await requireRole("admin");
  const sql = await db();
  const [f] = await sql<{ key: string }[]>`DELETE FROM custom_fields WHERE id = ${id} RETURNING key`;
  if (f) await sql`UPDATE leads SET custom = custom - ${f.key} WHERE custom ? ${f.key}`;
  refresh();
}

// ---------- templates ----------

export async function saveTemplate(form: FormData) {
  await requireRole("admin", "manager");
  const id = Number(form.get("id")) || null;
  const name = String(form.get("name") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  const channel = form.get("channel") === "email" ? "email" : "whatsapp";
  const business = ["dmm", "ds"].includes(String(form.get("business"))) ? String(form.get("business")) : "any";
  const subject = String(form.get("subject") ?? "").trim() || null;
  if (!name || !body) return;
  const sql = await db();
  if (id) await sql`UPDATE templates SET name = ${name}, body = ${body}, channel = ${channel}, business = ${business}, subject = ${subject} WHERE id = ${id}`;
  else await sql`INSERT INTO templates (name, body, channel, business, subject) VALUES (${name}, ${body}, ${channel}, ${business}, ${subject})`;
  refresh();
}

export async function deleteTemplate(id: number) {
  await requireRole("admin", "manager");
  const sql = await db();
  await sql`DELETE FROM templates WHERE id = ${id}`;
  refresh();
}

/** Called when someone clicks "Send on WhatsApp"/"Send email": logs it and returns the link to open. */
export async function sendTemplate(leadId: number, templateId: number) {
  const s = await requireSession();
  await assertLeadAccess(s, leadId);
  const sql = await db();
  const [[l], [t]] = await Promise.all([
    sql<Lead[]>`SELECT * FROM leads WHERE id = ${leadId}`,
    sql<Template[]>`SELECT * FROM templates WHERE id = ${templateId}`,
  ]);
  if (!l || !t) return null;
  const text = renderTemplate(t.body, l, s.name);
  let url: string | null = null;
  if (t.channel === "whatsapp") {
    const digits = (l.phone ?? "").replace(/\D/g, "");
    url = digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null;
  } else if (l.email) {
    const subject = renderTemplate(t.subject ?? t.name, l, s.name);
    url = `mailto:${l.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  }
  if (!url) return null;
  await sql`INSERT INTO lead_activities (lead_id, type, content, user_id)
            VALUES (${leadId}, ${t.channel === "whatsapp" ? "whatsapp" : "email"}, ${`Sent "${t.name}"`}, ${s.uid})`;
  await sql`UPDATE leads SET updated_at = now() WHERE id = ${leadId}`;
  return url;
}

// ---------- team ----------

export async function saveUser(form: FormData) {
  await requireRole("admin");
  const id = Number(form.get("id")) || null;
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const role = ["admin", "manager", "caller"].includes(String(form.get("role"))) ? String(form.get("role")) : "caller";
  const password = String(form.get("password") ?? "");
  if (!name || !email) return { error: "Name and email are required." };
  if (!id && password.length < 6) return { error: "Password must be at least 6 characters." };
  const sql = await db();
  try {
    if (id) {
      await sql`UPDATE users SET name = ${name}, email = ${email}, role = ${role} WHERE id = ${id} AND email <> 'owner'`;
      if (password) {
        if (password.length < 6) return { error: "Password must be at least 6 characters." };
        await sql`UPDATE users SET password_hash = ${await hashPassword(password)} WHERE id = ${id}`;
      }
    } else {
      await sql`INSERT INTO users (name, email, role, password_hash) VALUES (${name}, ${email}, ${role}, ${await hashPassword(password)})`;
    }
  } catch (e) {
    if (String(e).includes("unique")) return { error: "A team member with that email already exists." };
    throw e;
  }
  refresh();
  return { ok: true };
}

export async function setUserActive(id: number, active: boolean) {
  const s = await requireRole("admin");
  if (id === s.uid) return;
  const sql = await db();
  await sql`UPDATE users SET active = ${active} WHERE id = ${id} AND email <> 'owner'`;
  refresh();
}
