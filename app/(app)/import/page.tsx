import { Importer } from "@/components/importer";

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Import / Export</h1>

      <div className="card space-y-3 p-5">
        <h2 className="font-medium">Import leads from CSV</h2>
        <p className="text-sm text-zinc-500">
          Works with exports from Meta Lead Ads, Google Sheets, Excel, HubSpot etc. Recognized columns:{" "}
          <code className="text-xs">name / full_name / first_name + last_name, email, phone / phone_number, company, source, status, value, tags, notes, follow_up</code>.
          Leads with an email or phone that already exists are skipped.
        </p>
        <Importer />
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="font-medium">Export</h2>
        <p className="text-sm text-zinc-500">Download all leads as a CSV file (opens in Excel / Google Sheets).</p>
        <a href="/api/export" className="btn-ghost">Download CSV</a>
      </div>
    </div>
  );
}
