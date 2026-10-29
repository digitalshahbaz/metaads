import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateLead } from "@/app/actions";
import { LeadForm } from "@/components/lead-form";
import type { Lead } from "@/lib/leads";

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const sql = await db();
  const [lead] = await sql<Lead[]>`SELECT * FROM leads WHERE id = ${id}`;
  if (!lead) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Edit {lead.name}</h1>
      <LeadForm lead={lead} action={updateLead.bind(null, id)} cancelHref={`/leads/${id}`} />
    </div>
  );
}
