import { createLead } from "@/app/actions";
import { LeadForm } from "@/components/lead-form";

export default function NewLeadPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Add lead</h1>
      <LeadForm action={createLead} cancelHref="/leads" />
    </div>
  );
}
