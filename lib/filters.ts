import type postgres from "postgres";
import { isBusiness, isStatus } from "@/lib/leads";

export type LeadFilters = {
  q?: string;
  status?: string;
  source?: string;
  biz?: string;
  funnel?: string;
  temp?: string;
  customer?: string;
  segment?: string;
};

/**
 * Ready-made audiences for nurturing and selling. `where` is applied on top of the
 * business filter, so each segment also works per business.
 */
export const SEGMENTS: {
  id: string;
  business: "dmm" | "ds" | "any";
  title: string;
  why: string;
  action: string;
  where: (sql: postgres.Sql) => postgres.PendingQuery<postgres.Row[]>;
}[] = [
  {
    id: "dmm-hot-coaches",
    business: "dmm",
    title: "High-revenue coaches running ads",
    why: "Earning ₹50K+/month and already spending on ads: they have budget and a problem we solve.",
    action: "Call within 24h and book a growth call for the done-for-you service.",
    where: (sql) => sql`business IN ('dmm','both')
      AND details->>'Running ads' ILIKE 'yes%'
      AND (details->>'Monthly revenue' ~* '(50k|1l|3-5l|5-10l|10l|lakh)')`,
  },
  {
    id: "dmm-growth-call-new",
    business: "dmm",
    title: "Growth-call applicants not contacted yet",
    why: "They filled a qualification form asking for a call, and nobody has touched them in the CRM.",
    action: "Work this list top-down by score; log every call in the lead's activity.",
    where: (sql) => sql`business IN ('dmm','both') AND status = 'new'
      AND EXISTS (SELECT 1 FROM unnest(funnels) f WHERE f ILIKE '%growth call%' OR f ILIKE '%coach lead form%')`,
  },
  {
    id: "dmm-not-running-ads",
    business: "dmm",
    title: "Coaches not running ads yet",
    why: "Interested but not ready for a service retainer. Better fit for a low-ticket workshop or course first.",
    action: "Nurture with case studies, then invite to the next workshop (or cross-sell a DS course).",
    where: (sql) => sql`business IN ('dmm','both') AND details->>'Running ads' ILIKE 'no%'`,
  },
  {
    id: "ds-buyers-upsell",
    business: "ds",
    title: "Past buyers to upsell",
    why: "They have paid you before. Buyers are the cheapest people to sell to again.",
    action: "Offer the next step up: masterclass → course → mentorship / agency accelerator.",
    where: (sql) => sql`business IN ('ds','both') AND is_customer`,
  },
  {
    id: "ds-low-ticket-buyers",
    business: "ds",
    title: "₹19–₹499 buyers who never bought a course",
    why: "They proved they will pay, but have only bought an ebook, kit or masterclass.",
    action: "WhatsApp broadcast with the course offer and a deadline-based bonus.",
    where: (sql) => sql`business IN ('ds','both') AND is_customer AND total_spent < 500
      AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(purchases) p WHERE p->>'product' ILIKE '%course%')`,
  },
  {
    id: "ds-registered-not-bought",
    business: "ds",
    title: "Masterclass / event registrants who never bought",
    why: "Showed up for free value but have no purchase on record.",
    action: "Send the replay plus a limited-time paid offer; follow up on WhatsApp.",
    where: (sql) => sql`business IN ('ds','both') AND NOT is_customer
      AND EXISTS (SELECT 1 FROM unnest(funnels) f WHERE f ILIKE '%masterclass%' OR f ILIKE '%event%' OR f ILIKE '%workshop%')`,
  },
  {
    id: "ds-email-engaged",
    business: "ds",
    title: "Email-engaged, never bought",
    why: "They click your emails (strong intent signal) but haven't purchased.",
    action: "Retarget with a direct offer email plus a personal WhatsApp message.",
    where: (sql) => sql`business IN ('ds','both') AND NOT is_customer AND details ? 'Last email clicked'`,
  },
  {
    id: "ds-interns-ready",
    business: "ds",
    title: "Internship applicants ready to start",
    why: "Applied to DSIP and are ready for an unpaid internship: a talent pool and future course buyers.",
    action: "Shortlist for interviews; offer the course to the rest.",
    where: (sql) => sql`'DSIP Internship' = ANY(funnels) AND details->>'Internship: ready for unpaid' ILIKE 'yes%'`,
  },
  {
    id: "cross-sell",
    business: "any",
    title: "In both businesses",
    why: "Appear in Digimark Media and Digital Shahbaz funnels: students who run a business, or coaches who learn.",
    action: "Pitch the done-for-you service to buyers who run a business; pitch courses to coaches.",
    where: (sql) => sql`business = 'both'`,
  },
  {
    id: "no-phone",
    business: "any",
    title: "Email only (no phone number)",
    why: "Can only be reached by email; WhatsApp campaigns will miss them.",
    action: "Send an email asking them to join your WhatsApp community.",
    where: (sql) => sql`phone IS NULL`,
  },
];

export function buildWhere(sql: postgres.Sql, f: LeadFilters) {
  const q = f.q?.trim() ?? "";
  const like = `%${q}%`;
  const segment = SEGMENTS.find((s) => s.id === f.segment);
  return sql`
    WHERE TRUE
    ${q ? sql`AND (name ILIKE ${like} OR email ILIKE ${like} OR phone ILIKE ${like} OR company ILIKE ${like}
                   OR notes ILIKE ${like} OR profession ILIKE ${like} OR city ILIKE ${like}
                   OR array_to_string(tags, ' ') ILIKE ${like})` : sql``}
    ${isStatus(f.status) ? sql`AND status = ${f.status}` : sql``}
    ${f.source ? sql`AND source = ${f.source}` : sql``}
    ${isBusiness(f.biz) ? (f.biz === "both" ? sql`AND business = 'both'` : sql`AND business IN (${f.biz}, 'both')`) : sql``}
    ${f.funnel ? sql`AND ${f.funnel} = ANY(funnels)` : sql``}
    ${f.temp && ["hot", "warm", "cold"].includes(f.temp) ? sql`AND temperature = ${f.temp}` : sql``}
    ${f.customer === "yes" ? sql`AND is_customer` : f.customer === "no" ? sql`AND NOT is_customer` : sql``}
    ${segment ? sql`AND (${segment.where(sql)})` : sql``}`;
}

export function filtersFrom(sp: Record<string, string | undefined>): LeadFilters {
  const { q, status, source, biz, funnel, temp, customer, segment } = sp;
  return { q, status, source, biz, funnel, temp, customer, segment };
}
