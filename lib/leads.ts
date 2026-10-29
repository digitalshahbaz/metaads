export const STATUSES = [
  { id: "new", label: "New", color: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200" },
  { id: "contacted", label: "Contacted", color: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200" },
  { id: "qualified", label: "Qualified", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" },
  { id: "proposal", label: "Proposal", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200" },
  { id: "won", label: "Won", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" },
  { id: "lost", label: "Lost", color: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
] as const;

export type Status = (typeof STATUSES)[number]["id"];

export const BUSINESSES = [
  { id: "dmm", label: "Digimark Media", short: "DMM", hint: "Service · coaches & business owners", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200" },
  { id: "ds", label: "Digital Shahbaz", short: "DS", hint: "Education · courses & masterclasses", color: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200" },
  { id: "both", label: "Both", short: "Both", hint: "In both businesses' funnels", color: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200" },
] as const;

export type Business = (typeof BUSINESSES)[number]["id"];

export const TEMPERATURES = [
  { id: "hot", label: "Hot", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  { id: "warm", label: "Warm", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" },
  { id: "cold", label: "Cold", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
] as const;

export const SOURCES = ["manual", "meta_ads", "google_ads", "website", "referral", "instagram", "whatsapp", "cold_outreach", "import", "other"];

export type Purchase = { product: string; amount: number; date?: string | null };

export type Lead = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string;
  status: Status;
  value: string;
  tags: string[];
  notes: string | null;
  follow_up: Date | null;
  created_at: Date;
  updated_at: Date;
  business: Business;
  funnels: string[];
  is_customer: boolean;
  total_spent: string;
  purchases: Purchase[];
  score: number;
  temperature: "hot" | "warm" | "cold";
  profession: string | null;
  city: string | null;
  details: Record<string, string>;
  last_seen: Date | null;
};

export type Activity = {
  id: number;
  lead_id: number;
  type: string;
  content: string;
  created_at: Date;
};

export type Touchpoint = {
  id: number;
  lead_id: number;
  business: string;
  funnel: string;
  sheet: string | null;
  captured_at: Date | null;
  purchase: Purchase | null;
};

export function isStatus(s: unknown): s is Status {
  return STATUSES.some((x) => x.id === s);
}

export function isBusiness(s: unknown): s is Business {
  return BUSINESSES.some((x) => x.id === s);
}

export function statusMeta(s: string) {
  return STATUSES.find((x) => x.id === s) ?? STATUSES[0];
}

export function businessMeta(s: string) {
  return BUSINESSES.find((x) => x.id === s) ?? BUSINESSES[0];
}

export function temperatureMeta(s: string) {
  return TEMPERATURES.find((x) => x.id === s) ?? TEMPERATURES[2];
}

export function sourceLabel(s: string) {
  if (/[A-Z ]/.test(s)) return s; // already a funnel name
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function parseTags(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).map((t) => t.trim()).filter(Boolean);
  if (typeof v !== "string") return [];
  return v.split(/[,;|]/).map((t) => t.trim()).filter(Boolean);
}

/** Lowercased, trimmed, with common gmail typos fixed; null if not an email. */
export function normalizeEmail(v: unknown): string | null {
  let e = String(v ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (!e) return null;
  e = e.replace(/@(gmail\.con|gmail\.co|gmial\.com|gamil\.com|gmai\.com|gmail\.cm|gmail\.comm|gnail\.com)$/, "@gmail.com");
  return /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/.test(e) ? e : null;
}

/** Indian numbers become +91XXXXXXXXXX so the same person always matches; null if junk. */
export function normalizePhone(v: unknown): string | null {
  let raw = String(v ?? "").trim().replace(/^'/, "");
  if (/^\d+\.0$/.test(raw)) raw = raw.slice(0, -2);
  let d = raw.replace(/\D/g, "");
  if (!d) return null;
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 10 && /^[6-9]/.test(d)) {
    if (new Set(d).size <= 2 || d === "9876543210") return null;
    return `+91${d}`;
  }
  if (d.length >= 10 && raw.startsWith("+")) return `+${d}`;
  return null;
}

/** Normalize loosely-shaped input (form, webhook JSON, CSV row) into lead fields. */
export function normalizeLeadInput(raw: Record<string, unknown>) {
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = raw[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
    }
    return null;
  };
  const first = pick("first_name", "firstname", "first name");
  const last = pick("last_name", "lastname", "last name");
  const name = pick("name", "full_name", "fullname", "full name") ?? ([first, last].filter(Boolean).join(" ") || null);
  const rawEmail = pick("email", "email_address", "e-mail", "email address");
  const rawPhone = pick("phone", "phone_number", "mobile", "whatsapp", "phone number", "phone/mobile");
  const email = normalizeEmail(rawEmail) ?? rawEmail;
  const phone = normalizePhone(rawPhone) ?? rawPhone;
  const status = pick("status")?.toLowerCase();
  const business = pick("business")?.toLowerCase();
  const value = Number(pick("value", "deal_value", "amount") ?? 0);
  const followUp = pick("follow_up", "followup", "follow up");
  const funnel = pick("funnel", "campaign", "form");
  return {
    name: name ?? email ?? phone ?? "Unnamed lead",
    email,
    phone,
    company: pick("company", "company_name", "business_name", "organization"),
    source: (pick("source", "lead_source") ?? "manual").toLowerCase().replace(/\s+/g, "_"),
    status: isStatus(status) ? status : ("new" as Status),
    business: isBusiness(business) ? business : ("dmm" as Business),
    funnel,
    value: Number.isFinite(value) ? value : 0,
    tags: parseTags(raw.tags),
    notes: pick("notes", "note", "message", "comments"),
    follow_up: followUp && !Number.isNaN(Date.parse(followUp)) ? followUp.slice(0, 10) : null,
    profession: pick("profession", "niche", "industry", "coach_type"),
    city: pick("city"),
  };
}

const REVENUE_POINTS: [RegExp, number][] = [
  [/over 10l|10 ?lakh\+|10l\+/i, 40],
  [/5 lakh above|5-10l/i, 35],
  [/2 lakh to 5 lakh|3-5l/i, 30],
  [/1l|51000 to 2 lakh/i, 22],
  [/50k ?-1l/i, 20],
  [/10-50k/i, 8],
  [/0 to 50,000/i, 5],
];

/**
 * Lead score 0-100 (hot ≥ 55, warm ≥ 30). Rewards buying intent for the service business
 * (revenue, running ads, growth-call application) and buying history/engagement for education.
 */
export function scoreLead(l: {
  business: string;
  funnels: string[];
  details: Record<string, string>;
  is_customer: boolean;
  total_spent: number;
  status: string;
  last_seen: Date | string | null;
  phone: string | null;
}) {
  let score = 0;
  const d = l.details ?? {};
  if (l.business === "dmm" || l.business === "both") {
    const rev = d["Monthly revenue"] ?? "";
    const hit = REVENUE_POINTS.find(([re]) => re.test(rev));
    if (hit) score += hit[1];
    if (/^yes/i.test(d["Running ads"] ?? "")) score += 12;
    if (l.funnels.some((f) => /growth call|coach lead form/i.test(f))) score += 12;
    if ((d["Website / social"] ?? "").length > 8) score += 4;
  }
  if (l.is_customer) {
    score += 25;
    score += l.total_spent >= 997 ? 20 : l.total_spent >= 299 ? 12 : l.total_spent >= 99 ? 8 : 4;
  }
  if (l.funnels.length >= 2) score += Math.min(15, 5 * (l.funnels.length - 1));
  if (d["Last email clicked"]) score += 8;
  else if (d["Last email opened"]) score += 4;
  if (l.status === "qualified") score += 15;
  if (l.last_seen) {
    const age = (Date.now() - new Date(l.last_seen).getTime()) / 864e5;
    score += age <= 90 ? 10 : age <= 365 ? 5 : 0;
  }
  if (/blocked|unsubscribed|unreachable|bounced/i.test(d["Email status"] ?? "") && !l.phone) score = Math.min(score, 10);
  if (l.status === "lost") score = Math.min(score, 5);
  score = Math.max(0, Math.min(100, score));
  return { score, temperature: (score >= 55 ? "hot" : score >= 30 ? "warm" : "cold") as Lead["temperature"] };
}

export function formatMoney(v: string | number) {
  const n = Number(v) || 0;
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function formatDate(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
