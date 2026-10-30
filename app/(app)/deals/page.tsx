import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { formatMoney } from "@/lib/leads";
import { BizTabs } from "@/components/biz-tabs";
import { DealBoard, type DealRow } from "@/components/deal-board";

type SP = Promise<Record<string, string | undefined>>;

export default async function DealsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const s = await requireSession();
  const biz = sp.biz === "dmm" || sp.biz === "ds" ? sp.biz : "";
  const sql = await db();
  const deals = await sql<DealRow[]>`
    SELECT d.id, d.title, d.amount, d.stage, d.business, d.lead_id, l.name AS lead_name, u.name AS owner_name
    FROM deals d JOIN leads l ON l.id = d.lead_id LEFT JOIN users u ON u.id = d.owner_id
    WHERE (d.stage NOT IN ('won','lost') OR d.updated_at > now() - interval '60 days')
      ${biz ? sql`AND d.business = ${biz}` : sql``}
      ${s.role === "caller" ? sql`AND l.owner_id = ${s.uid}` : sql``}
    ORDER BY d.updated_at DESC LIMIT 1000`;
  const open = deals.filter((d) => !["won", "lost"].includes(d.stage));
  const won = deals.filter((d) => d.stage === "won");
  const sum = (xs: DealRow[]) => xs.reduce((a, d) => a + Number(d.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Deals</h1>
          <p className="text-sm muted">
            Open pipeline ₹{formatMoney(sum(open))} ({open.length}) · Won in last 60 days ₹{formatMoney(sum(won))} ({won.length}).
            Create deals from a lead&apos;s page.
          </p>
        </div>
        <BizTabs path="/deals" params={sp} />
      </div>
      <DealBoard deals={deals.map((d) => ({ ...d }))} />
    </div>
  );
}
