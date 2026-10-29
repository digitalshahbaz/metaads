"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { importLeads } from "@/app/actions";
import { parseCSV } from "@/lib/csv";
import { SOURCES, sourceLabel } from "@/lib/leads";

const CHUNK = 300;

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
  const [fileName, setFileName] = useState("");
  const [source, setSource] = useState("import");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);

  const headers = rows[0] ? Object.keys(rows[0]) : [];

  async function run() {
    setBusy(true);
    setResult(null);
    let inserted = 0, skipped = 0;
    try {
      for (let i = 0; i < rows.length; i += CHUNK) {
        const r = await importLeads(rows.slice(i, i + CHUNK), source);
        inserted += r.inserted;
        skipped += r.skipped;
        setProgress(Math.min(rows.length, i + CHUNK));
      }
      setResult(`Imported ${inserted} lead(s). Skipped ${skipped} (duplicates or empty rows).`);
      setRows([]);
      setFileName("");
      router.refresh();
    } catch (e) {
      setResult(`Import failed after ${inserted} lead(s): ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="file"
        accept=".csv,text/csv"
        className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-white"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          setResult(null);
          if (!f) return;
          setFileName(f.name);
          setRows(parseCSV(decode(await f.arrayBuffer())));
        }}
      />

      {fileName && rows.length === 0 && <p className="text-sm text-red-600">No rows found in {fileName}.</p>}

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
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="label" htmlFor="src">Source for rows without one</label>
              <select id="src" value={source} onChange={(e) => setSource(e.target.value)} className="input w-auto">
                {SOURCES.map((s) => <option key={s} value={s}>{sourceLabel(s)}</option>)}
              </select>
            </div>
            <button onClick={run} disabled={busy} className="btn-primary">
              {busy ? `Importing… ${progress}/${rows.length}` : `Import ${rows.length} leads`}
            </button>
          </div>
        </>
      )}

      {result && <p className="rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-800">{result}</p>}
    </div>
  );
}
