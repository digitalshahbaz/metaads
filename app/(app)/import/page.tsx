import { redirect } from "next/navigation";
import { Importer } from "@/components/importer";
import { canManage, requireSession } from "@/lib/session";

export default async function ImportPage() {
  if (!canManage(await requireSession())) redirect("/");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="page-title">Import / Export</h1>

      <div className="card space-y-3 p-5">
        <h2 className="font-medium">Import leads (CSV or cleaned JSON)</h2>
        <p className="text-sm muted">
          Works with exports from Meta Lead Ads, Google Sheets, Excel, Elementor forms etc. Recognized columns:{" "}
          <code className="text-xs">name / full_name / first_name + last_name, email, phone / phone_number, company, profession / niche, city, source, status, value, tags, notes, follow_up, utm_source, utm_campaign, utm_content, page_url / Source URL (UTMs are read from the URL), campaign_name, ad_name</code>.
        </p>
        <p className="text-sm muted">
          <b>Duplicates are merged, not skipped:</b> if the email or phone already exists, the new funnel, tags and details are added to that person&apos;s
          record and their score is updated. Importing the same file twice is safe.
        </p>
        <Importer />
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="font-medium">Export</h2>
        <p className="text-sm muted">Download all leads as a CSV file (opens in Excel / Google Sheets).</p>
        <a href="/api/export" className="btn-ghost">Download CSV</a>
      </div>
    </div>
  );
}
