import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { normalizeLeadInput } from "@/lib/leads";
import { upsertLead } from "@/lib/upsert";

// Webhook for incoming leads (website forms, Zapier, Make, Pabbly, Meta Lead Ads via an automation tool).
// Auth: header `x-api-key: <LEADS_API_KEY>` or `?key=<LEADS_API_KEY>`.

function authorized(req: NextRequest) {
  const expected = process.env.LEADS_API_KEY;
  if (!expected) return false;
  const given = req.headers.get("x-api-key") ?? req.nextUrl.searchParams.get("key") ?? "";
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const j = await req.json();
    return j && typeof j === "object" ? j : {};
  }
  const form = await req.formData();
  const o: Record<string, unknown> = {};
  form.forEach((v, k) => (o[k] = String(v)));
  return o;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await readBody(req);
  } catch {
    return NextResponse.json({ error: "Body must be JSON or form data" }, { status: 400 });
  }

  const items = Array.isArray(body.leads) ? (body.leads as Record<string, unknown>[]) : [body];
  const sql = await db();
  const ids: number[] = [];
  const merged: number[] = [];
  const params = req.nextUrl.searchParams;
  for (const raw of items) {
    const lower: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw ?? {})) lower[k.toLowerCase()] = v;
    const l = normalizeLeadInput({
      source: params.get("source") ?? "api",
      business: params.get("business") ?? undefined,
      funnel: params.get("funnel") ?? undefined,
      ...lower,
    });
    const funnel = l.funnel ?? `API (${l.source})`;
    const now = new Date().toISOString();
    const res = await upsertLead(sql, {
      ...l,
      funnels: [funnel],
      last_seen: now,
      touchpoints: [{ business: l.business, funnel, sheet: "Webhook", date: now }],
    }, `Lead received via API (${funnel})`);
    ids.push(res.id);
    if (!res.created) merged.push(res.id);
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, ids, merged_into_existing: merged }, { status: 201 });
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  const sql = await db();
  const leads = await sql`SELECT * FROM leads ORDER BY created_at DESC LIMIT 500`;
  return NextResponse.json({ leads });
}
