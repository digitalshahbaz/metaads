import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { normalizeLeadInput } from "@/lib/leads";

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
  for (const raw of items) {
    const lower: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw ?? {})) lower[k.toLowerCase()] = v;
    const l = normalizeLeadInput({ source: req.nextUrl.searchParams.get("source") ?? "api", ...lower });
    const [row] = await sql`
      INSERT INTO leads (name, email, phone, company, source, status, value, tags, notes, follow_up)
      VALUES (${l.name}, ${l.email}, ${l.phone}, ${l.company}, ${l.source}, ${l.status},
              ${l.value}, ${l.tags}, ${l.notes}, ${l.follow_up})
      RETURNING id`;
    await sql`INSERT INTO lead_activities (lead_id, type, content)
      VALUES (${row.id}, 'system', ${`Lead received via API (source: ${l.source})`})`;
    ids.push(row.id);
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, ids }, { status: 201 });
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  const sql = await db();
  const leads = await sql`SELECT * FROM leads ORDER BY created_at DESC LIMIT 500`;
  return NextResponse.json({ leads });
}
