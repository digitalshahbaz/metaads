import { headers } from "next/headers";

export default async function SettingsPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "your-app.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const endpoint = `${proto}://${host}/api/leads`;
  const keySet = Boolean(process.env.LEADS_API_KEY);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Integrations</h1>

      <div className="card space-y-3 p-5 text-sm">
        <h2 className="text-base font-medium">Receive leads automatically (webhook)</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Send leads from your website forms, Zapier, Make, Pabbly Connect, or Meta Lead Ads (through one of those tools)
          straight into the CRM.
        </p>
        {!keySet && (
          <p className="rounded-lg bg-amber-50 p-3 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            Set the <code>LEADS_API_KEY</code> environment variable in Vercel to turn this on.
          </p>
        )}
        <dl className="grid gap-2 sm:grid-cols-[8rem_1fr]">
          <dt className="text-zinc-500">URL</dt>
          <dd><code className="break-all">{endpoint}</code></dd>
          <dt className="text-zinc-500">Method</dt>
          <dd><code>POST</code> (JSON or form data)</dd>
          <dt className="text-zinc-500">Auth</dt>
          <dd>Header <code>x-api-key: YOUR_LEADS_API_KEY</code> or add <code>?key=YOUR_LEADS_API_KEY</code> to the URL</dd>
          <dt className="text-zinc-500">Source tag</dt>
          <dd>Add <code>&amp;source=meta_ads</code> to the URL, or send a <code>source</code> field</dd>
        </dl>
        <p className="font-medium">Example</p>
        <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-3 text-xs text-zinc-100">{`curl -X POST "${endpoint}?source=website" \\
  -H "x-api-key: YOUR_LEADS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Rahul Sharma","email":"rahul@example.com","phone":"+91 98765 43210","company":"Acme","notes":"Wants a demo","tags":"hot, demo"}'`}</pre>
        <p className="text-zinc-600 dark:text-zinc-400">
          Accepted fields: <code>name</code> (or <code>full_name</code>, <code>first_name</code>+<code>last_name</code>), <code>email</code>,{" "}
          <code>phone</code> (or <code>phone_number</code>), <code>company</code>, <code>source</code>, <code>status</code>, <code>value</code>,{" "}
          <code>tags</code>, <code>notes</code> (or <code>message</code>), <code>follow_up</code>. Send <code>{`{"leads":[...]}`}</code> to add many at once.
        </p>
      </div>

      <div className="card space-y-2 p-5 text-sm">
        <h2 className="text-base font-medium">Meta Lead Ads → CRM</h2>
        <ol className="list-decimal space-y-1 pl-5 text-zinc-600 dark:text-zinc-400">
          <li>In Zapier / Make / Pabbly, create a flow with trigger <b>Facebook Lead Ads → New Lead</b>.</li>
          <li>Add an action <b>Webhooks → POST</b> to <code className="break-all">{endpoint}?source=meta_ads&amp;key=YOUR_LEADS_API_KEY</code>.</li>
          <li>Map the fields <code>full_name</code>, <code>email</code>, <code>phone_number</code> (and any custom questions into <code>notes</code>).</li>
        </ol>
        <p className="text-zinc-500">Or download leads from Meta Ads Manager and use <b>Import / Export</b> — the Meta CSV format is supported.</p>
      </div>
    </div>
  );
}
