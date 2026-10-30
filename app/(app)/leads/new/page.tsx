import { createLead } from "@/app/actions";
import { LeadForm } from "@/components/lead-form";
import { db } from "@/lib/db";
import { canManage, requireSession } from "@/lib/session";
import type { TeamMember } from "@/lib/leads";

export default async function NewLeadPage() {
  const s = await requireSession();
  const sql = await db();
  const team = canManage(s) ? await sql<TeamMember[]>`SELECT id, name, email, role, active FROM users ORDER BY name` : [];
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="page-title">Add lead</h1>
      <p className="text-sm muted">If this phone or email already exists, the details are merged into that person instead of creating a duplicate.</p>
      <LeadForm action={createLead} cancelHref="/leads" team={team.map((m) => ({ ...m }))} />
    </div>
  );
}
