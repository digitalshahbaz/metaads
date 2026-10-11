"use client";

import { AdCard } from "@/components/AdCard";
import { toCsv } from "@/lib/analysis";
import { downloadText } from "@/lib/download";
import { useSwipeFile } from "@/lib/swipeFile";

export default function SavedPage() {
  const { saved, toggle, setNote } = useSwipeFile();

  return (
    <>
      <div className="toolbar">
        <h2>Swipe file ({saved.length})</h2>
        <button className="btn" onClick={() => downloadText("swipe-file.csv", toCsv(saved))} disabled={!saved.length}>
          Export CSV
        </button>
      </div>
      {!saved.length && <p className="muted">Nothing saved yet. Hit ☆ Save on any ad in Research.</p>}
      <div className="grid">
        {saved.map((ad) => (
          <AdCard key={ad.id} ad={ad} saved onToggleSave={toggle}>
            <textarea
              className="note"
              placeholder="Notes: angle, offer, why it works…"
              value={ad.note}
              onChange={(e) => setNote(ad.id, e.target.value)}
            />
          </AdCard>
        ))}
      </div>
    </>
  );
}
