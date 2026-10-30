import type postgres from "postgres";
import {
  isBusiness,
  isStatus,
  normalizeEmail,
  normalizePhone,
  scoreLead,
  type Business,
  type Lead,
  type Purchase,
  type Utm,
} from "@/lib/leads";

export type TouchpointInput = {
  business: string;
  funnel: string;
  sheet?: string | null;
  date?: string | null;
  purchase?: Purchase | null;
  utm?: Utm | null;
};

export type LeadInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  source?: string | null;
  status?: string | null;
  business?: string | null;
  funnels?: string[];
  tags?: string[];
  notes?: string | null;
  follow_up?: string | null;
  value?: number;
  profession?: string | null;
  city?: string | null;
  details?: Record<string, string>;
  purchases?: Purchase[];
  first_seen?: string | null;
  last_seen?: string | null;
  touchpoints?: TouchpointInput[];
  utm?: Utm | null;
  owner_id?: number | null;
  custom?: Record<string, string>;
};

const STATUS_RANK: Record<string, number> = { new: 0, contacted: 1, qualified: 2, proposal: 3, won: 4, lost: -1 };

const uniq = <T,>(xs: T[]) => Array.from(new Set(xs.filter(Boolean)));

function mergeBusiness(a: string | null | undefined, b: string | null | undefined): Business {
  const x = isBusiness(a) ? a : null;
  const y = isBusiness(b) ? b : null;
  if (!x) return y ?? "dmm";
  if (!y || x === y) return x;
  return "both";
}

function purchaseKey(p: Purchase) {
  return `${p.product}|${Number(p.amount) || 0}|${p.date ?? ""}`;
}

function isPlaceholderName(name: string, email: string | null) {
  return !name || name === "Unnamed lead" || (!!email && name === email.split("@")[0]) || name === email;
}

/**
 * Insert a lead, or merge it into an existing lead that has the same email or phone.
 * Every call records a touchpoint (funnel + date) so the lead's full journey is kept.
 */
export async function upsertLead(sql: postgres.Sql, input: LeadInput, activity?: string) {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const purchases = (input.purchases ?? []).map((p) => ({ ...p, amount: Number(p.amount) || 0 }));
  const touchpoints = input.touchpoints ?? [];
  // Lead-level UTM = the latest touchpoint that carried one (or the explicit input).
  const utm: Utm = input.utm && Object.values(input.utm).some(Boolean)
    ? input.utm
    : [...touchpoints].reverse().find((t) => t.utm && Object.values(t.utm).some(Boolean))?.utm ?? {};
  const hasUtm = Boolean(utm.utm_source || utm.utm_campaign || utm.utm_content);

  const [existing] = email || phone
    ? await sql<Lead[]>`
        SELECT * FROM leads
        WHERE ${email ? sql`lower(email) = ${email}` : sql`FALSE`}
           OR ${phone ? sql`phone = ${phone}` : sql`FALSE`}
        ORDER BY id LIMIT 1`
    : [];

  if (!existing) {
    const funnels = uniq(input.funnels ?? []);
    const business = isBusiness(input.business) ? input.business : "dmm";
    const status = isStatus(input.status) ? input.status : "new";
    const total = purchases.reduce((s, p) => s + p.amount, 0);
    const isCustomer = purchases.some((p) => p.amount > 0 || /course/i.test(p.product));
    const details = input.details ?? {};
    const { score, temperature } = scoreLead({
      business, funnels, details, is_customer: isCustomer, total_spent: total, status,
      last_seen: input.last_seen ?? input.first_seen ?? new Date(), phone,
    });
    const [row] = await sql<{ id: number }[]>`
      INSERT INTO leads (name, email, phone, company, source, status, value, tags, notes, follow_up,
                         business, funnels, is_customer, total_spent, purchases, score, temperature,
                         profession, city, details, last_seen, created_at, updated_at,
                         owner_id, custom, utm_source, utm_medium, utm_campaign, utm_content, utm_term)
      VALUES (${input.name}, ${email ?? input.email ?? null}, ${phone ?? input.phone ?? null}, ${input.company ?? null},
              ${input.source ?? "manual"}, ${status}, ${input.value ?? 0}, ${uniq(input.tags ?? [])},
              ${input.notes ?? null}, ${input.follow_up ?? null}, ${business}, ${funnels}, ${isCustomer},
              ${total}, ${sql.json(purchases)}, ${score}, ${temperature}, ${input.profession ?? null},
              ${input.city ?? null}, ${sql.json(details)}, ${input.last_seen ?? input.first_seen ?? null},
              ${input.first_seen ?? sql`now()`}, now(),
              ${input.owner_id ?? null}, ${sql.json(input.custom ?? {})}, ${utm.utm_source ?? null},
              ${utm.utm_medium ?? null}, ${utm.utm_campaign ?? null}, ${utm.utm_content ?? null}, ${utm.utm_term ?? null})
      RETURNING id`;
    await addTouchpoints(sql, row.id, touchpoints);
    if (activity) await sql`INSERT INTO lead_activities (lead_id, type, content) VALUES (${row.id}, 'system', ${activity})`;
    return { id: row.id, created: true };
  }

  // Merge into the existing lead; values the user already has win over incoming ones.
  const funnels = uniq([...existing.funnels, ...(input.funnels ?? [])]);
  const business = mergeBusiness(existing.business, input.business);
  const details: Record<string, string> = { ...(input.details ?? {}), ...(existing.details ?? {}) };
  if (email && existing.email && email !== existing.email.toLowerCase()) {
    details["Other emails"] = uniq([...(details["Other emails"] ?? "").split(", "), email]).join(", ");
  }
  if (phone && existing.phone && phone !== existing.phone) {
    details["Other phones"] = uniq([...(details["Other phones"] ?? "").split(", "), phone]).join(", ");
  }
  const known = new Set(existing.purchases.map(purchaseKey));
  const allPurchases = [...existing.purchases, ...purchases.filter((p) => !known.has(purchaseKey(p)))];
  const total = allPurchases.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const isCustomer = existing.is_customer || allPurchases.some((p) => p.amount > 0 || /course/i.test(p.product));
  const incomingStatus = isStatus(input.status) ? input.status : "new";
  const status = existing.status === "new" && STATUS_RANK[incomingStatus] > 0 ? incomingStatus : existing.status;
  const lastSeen = [existing.last_seen, input.last_seen ?? input.first_seen]
    .filter(Boolean)
    .map((d) => new Date(d!))
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const notes = input.notes && !(existing.notes ?? "").includes(input.notes)
    ? [existing.notes, input.notes].filter(Boolean).join("\n")
    : existing.notes;
  const { score, temperature } = scoreLead({
    business, funnels, details, is_customer: isCustomer, total_spent: total, status,
    last_seen: lastSeen, phone: existing.phone ?? phone,
  });
  await sql`
    UPDATE leads SET
      name = ${isPlaceholderName(existing.name, existing.email) ? input.name : existing.name},
      email = ${existing.email ?? email ?? null},
      phone = ${existing.phone ?? phone ?? null},
      company = ${existing.company ?? input.company ?? null},
      profession = ${existing.profession ?? input.profession ?? null},
      city = ${existing.city ?? input.city ?? null},
      business = ${business}, funnels = ${funnels},
      tags = ${uniq([...existing.tags, ...(input.tags ?? [])])},
      purchases = ${sql.json(allPurchases)}, total_spent = ${total}, is_customer = ${isCustomer},
      details = ${sql.json(details)}, status = ${status}, notes = ${notes},
      score = ${score}, temperature = ${temperature}, last_seen = ${lastSeen},
      created_at = LEAST(created_at, ${input.first_seen ?? existing.created_at}::timestamptz),
      owner_id = COALESCE(owner_id, ${input.owner_id ?? null}),
      custom = ${sql.json({ ...(input.custom ?? {}), ...(existing.custom ?? {}) })},
      ${hasUtm ? sql`utm_source = ${utm.utm_source ?? null}, utm_medium = ${utm.utm_medium ?? null},
        utm_campaign = ${utm.utm_campaign ?? null}, utm_content = ${utm.utm_content ?? null},
        utm_term = ${utm.utm_term ?? null},` : sql``}
      updated_at = now()
    WHERE id = ${existing.id}`;
  await addTouchpoints(sql, existing.id, touchpoints);
  if (activity) {
    await sql`INSERT INTO lead_activities (lead_id, type, content)
      VALUES (${existing.id}, 'system', ${`${activity} (matched existing lead by ${email && existing.email?.toLowerCase() === email ? "email" : "phone"})`})`;
  }
  return { id: existing.id, created: false };
}

async function addTouchpoints(sql: postgres.Sql, leadId: number, tps: TouchpointInput[]) {
  for (const t of tps) {
    const at = t.date ? new Date(t.date) : null;
    const u = t.utm ?? {};
    const [dup] = await sql<{ id: number }[]>`
      SELECT id FROM lead_touchpoints
      WHERE lead_id = ${leadId} AND funnel = ${t.funnel}
        AND captured_at IS NOT DISTINCT FROM ${at}
        AND purchase IS NOT DISTINCT FROM ${t.purchase ? sql.json(t.purchase) : null}`;
    if (dup) {
      if (u.utm_source || u.utm_campaign || u.page_url) {
        await sql`UPDATE lead_touchpoints SET
            utm_source = COALESCE(utm_source, ${u.utm_source ?? null}), utm_medium = COALESCE(utm_medium, ${u.utm_medium ?? null}),
            utm_campaign = COALESCE(utm_campaign, ${u.utm_campaign ?? null}), utm_content = COALESCE(utm_content, ${u.utm_content ?? null}),
            utm_term = COALESCE(utm_term, ${u.utm_term ?? null}), page_url = COALESCE(page_url, ${u.page_url ?? null})
          WHERE id = ${dup.id}`;
      }
      continue;
    }
    if (at) {
      // A dated copy of an entry that was imported earlier without a date replaces it.
      await sql`DELETE FROM lead_touchpoints WHERE lead_id = ${leadId} AND funnel = ${t.funnel} AND captured_at IS NULL
                AND purchase IS NOT DISTINCT FROM ${t.purchase ? sql.json(t.purchase) : null}`;
    }
    await sql`
      INSERT INTO lead_touchpoints (lead_id, business, funnel, sheet, captured_at, purchase,
                                    utm_source, utm_medium, utm_campaign, utm_content, utm_term, page_url)
      VALUES (${leadId}, ${t.business}, ${t.funnel}, ${t.sheet ?? null}, ${at},
              ${t.purchase ? sql.json(t.purchase) : null}, ${u.utm_source ?? null}, ${u.utm_medium ?? null},
              ${u.utm_campaign ?? null}, ${u.utm_content ?? null}, ${u.utm_term ?? null}, ${u.page_url ?? null})`;
  }
  // "entries" = how many times this person has come in (form fills, purchases, imports).
  await sql`UPDATE leads SET entries = GREATEST(1, (SELECT count(*) FROM lead_touchpoints WHERE lead_id = ${leadId}))
            WHERE id = ${leadId}`;
}
