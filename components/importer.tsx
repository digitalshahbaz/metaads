"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { importBundle, importLeads } from "@/app/actions";
import { parseCSV } from "@/lib/csv";
import { BUSINESSES, SOURCES, sourceLabel } from "@/lib/leads";
import type { LeadInput } from "@/lib/upsert";

const CSV_CHUNK = 200;
const BUNDLE_CHUNK = 100;

// Meta Lead Ads exports are UTF-16 with a BOM; everything else is usually UTF-8.
function decode(buf: ArrayBuffer) {
  const b = new Uint8Array(buf);
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder("utf-16le").decode(buf);
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder("utf-16be").decode(buf);
  return new TextDecoder("utf-8").decode(buf);
}

export function Importer() {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [bundle, setBundle] = useState<LeadInput[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [source, setSource] = useState("import");
  const [business, setBusiness] = useState("dmm");
  const [funnel, setFunnel] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);

  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const total = bundle ? bundle.length : rows.length;

  async function run() {
    setBusy(true);
    setResult(null);
    let created = 0, merged = 0, skipped = 0;
    try {
      if (bundle) {
        for (let i = 0; i < bundle.length; i += BUNDLE_CHUNK) {
          const r = await importBundle(bundle.slice(i, i + BUNDLE_CHUNK));
          created += r.created;
          merged += r.merged;
          setProgress(Math.min(bundle.length, i + BUNDLE_CHUNK));
        }
      } else {
        for (let i = 0; i < rows.length; i += CSV_CHUNK) {
          const r = await importLeads(rows.slice(i, i + CSV_CHUNK), source, business, funnel.trim());
          created += r.created;
          merged += r.merged;
          skipped += r.skipped;
          setProgress(Math.min(rows.length, i + CSV_CHUNK));
        }
      }
      setResult(`Done: ${created} new lead(s), ${merged} merged into existing leads${skipped ? `, ${skipped} empty rows skipped` : ""}.`);
      setRows([]);
      setBundle(null);
      setFileName("");
      router.refresh();
    } catch (e) {
      setResult(`Import stopped after ${created + merged} lead(s): ${e instanceof Error ? e.message : String(e)}. Re-running the import is safe — duplicates are merged.`);
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="file"
        accept=".csv,text/csv,.json,application/json"
        className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-white"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          setResult(null);
          setRows([]);
          setBundle(null);
          if (!f) return;
          setFileName(f.name);
          const text = decode(await f.arrayBuffer());
          if (f.name.toLowerCase().endsWith(".json")) {
            try {
              const data = JSON.parse(text);
              setBundle(Array.isArray(data) ? data : Array.isArray(data.leads) ? data.leads : []);
            } catch {
              setResult("That JSON file could not be read.");
            }
          } else {
            setRows(parseCSV(text));
          }
        }}
      />

      {fileName && total === 0 && !result && <p className="text-sm text-red-600">No leads found in {fileName}.</p>}

      {bundle && bundle.length > 0 && (
        <p className="text-sm">
          <b>{bundle.length}</b> cleaned leads in {fileName}, with business, funnels, purchases and journey already set.
        </p>
      )}

      {rows.length > 0 && (
        <>
          <p className="text-sm"><b>{rows.length}</b> rows found in {fileName}. Preview:</p>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                <tr>{headers.map((h) => <th key={h} className="p-2 font-medium whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                    {headers.map((h) => <td key={h} className="max-w-48 truncate p-2">{r[h]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="biz">Business</label>
              <select id="biz" value={business} onChange={(e) => setBusiness(e.target.value)} className="input">
                {BUSINESSES.filter((b) => b.id !== "both").map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="funnel">Funnel / list name</label>
              <input id="funnel" value={funnel} onChange={(e) => setFunnel(e.target.value)} placeholder="e.g. Diwali Webinar 2026" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="src">Source for rows without one</label>
              <select id="src" value={source} onChange={(e) => setSource(e.target.value)} className="input">
                {SOURCES.map((s) => <option key={s} value={s}>{sourceLabel(s)}</option>)}
              </select>
            </div>
          </div>
        </>
      )}

      {total > 0 && (
        <button onClick={run} disabled={busy} className="btn-primary">
          {busy ? `Importing… ${progress}/${total}` : `Import ${total} leads`}
        </button>
      )}

      {result && <p className="rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-800">{result}</p>}
    </div>
  );
}
