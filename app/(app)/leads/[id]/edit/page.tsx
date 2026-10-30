import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateLead } from "@/app/actions";
import { requireSession } from "@/lib/session";
import { LeadForm } from "@/components/lead-form";
import type { Lead } from "@/lib/leads";

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const s = await requireSession();
  const sql = await db();
  const [lead] = await sql<Lead[]>`SELECT * FROM leads WHERE id = ${id}`;
  if (!lead || (s.role === "caller" && lead.owner_id !== s.uid)) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="page-title">Edit {lead.name}</h1>
      <LeadForm lead={lead} action={updateLead.bind(null, id)} cancelHref={`/leads/${id}`} />
    </div>
  );
}
