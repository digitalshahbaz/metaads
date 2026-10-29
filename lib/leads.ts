export const STATUSES = [
  { id: "new", label: "New", color: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200" },
  { id: "contacted", label: "Contacted", color: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200" },
  { id: "qualified", label: "Qualified", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" },
  { id: "proposal", label: "Proposal", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200" },
  { id: "won", label: "Won", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" },
  { id: "lost", label: "Lost", color: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
] as const;

export type Status = (typeof STATUSES)[number]["id"];

export const SOURCES = ["manual", "meta_ads", "google_ads", "website", "referral", "instagram", "whatsapp", "cold_outreach", "import", "other"];

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
};

export type Activity = {
  id: number;
  lead_id: number;
  type: string;
  content: string;
  created_at: Date;
};

export function isStatus(s: unknown): s is Status {
  return STATUSES.some((x) => x.id === s);
}

export function statusMeta(s: string) {
  return STATUSES.find((x) => x.id === s) ?? STATUSES[0];
}

export function sourceLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function parseTags(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).map((t) => t.trim()).filter(Boolean);
  if (typeof v !== "string") return [];
  return v.split(/[,;|]/).map((t) => t.trim()).filter(Boolean);
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
  const email = pick("email", "email_address", "e-mail");
  const phone = pick("phone", "phone_number", "mobile", "whatsapp", "phone number");
  const status = pick("status")?.toLowerCase();
  const value = Number(pick("value", "deal_value", "amount") ?? 0);
  const followUp = pick("follow_up", "followup", "follow up");
  return {
    name: name ?? email ?? phone ?? "Unnamed lead",
    email,
    phone,
    company: pick("company", "company_name", "business", "organization"),
    source: (pick("source", "lead_source") ?? "manual").toLowerCase().replace(/\s+/g, "_"),
    status: isStatus(status) ? status : ("new" as Status),
    value: Number.isFinite(value) ? value : 0,
    tags: parseTags(raw.tags),
    notes: pick("notes", "note", "message", "comments"),
    follow_up: followUp && !Number.isNaN(Date.parse(followUp)) ? followUp.slice(0, 10) : null,
  };
}

export function formatMoney(v: string | number) {
  const n = Number(v) || 0;
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function formatDate(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
