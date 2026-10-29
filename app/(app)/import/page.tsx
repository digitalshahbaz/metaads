import { Importer } from "@/components/importer";

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Import / Export</h1>

      <div className="card space-y-3 p-5">
        <h2 className="font-medium">Import leads (CSV or cleaned JSON)</h2>
        <p className="text-sm text-zinc-500">
          Works with exports from Meta Lead Ads, Google Sheets, Excel, Elementor forms etc. Recognized columns:{" "}
          <code className="text-xs">name / full_name / first_name + last_name, email, phone / phone_number, company, profession / niche, city, source, status, value, tags, notes, follow_up</code>.
        </p>
        <p className="text-sm text-zinc-500">
          <b>Duplicates are merged, not skipped:</b> if the email or phone already exists, the new funnel, tags and details are added to that person&apos;s
          record and their score is updated. Importing the same file twice is safe.
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
