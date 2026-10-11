"use client";

import { longevityTier } from "@/lib/analysis";
import type { Ad } from "@/lib/types";

interface Props {
  ad: Ad;
  saved: boolean;
  onToggleSave: (ad: Ad) => void;
  children?: React.ReactNode;
}

export function AdCard({ ad, saved, onToggleSave, children }: Props) {
  const tier = longevityTier(ad.daysRunning);
  const body = ad.bodies[0] ?? "";
  return (
    <article className="card">
      <header className="card-head">
        <div>
          <div className="page-name">{ad.pageName}</div>
          <div className="muted small">
            {ad.startTime ? `Started ${ad.startTime.slice(0, 10)}` : "Start date unknown"}
            {ad.stopTime ? ` · Stopped ${ad.stopTime.slice(0, 10)}` : ""}
          </div>
        </div>
        <span className={`badge badge-${tier.tone}`} title={tier.label}>
          {ad.daysRunning}d
        </span>
      </header>

      <p className="body">{body || <span className="muted">No primary text</span>}</p>
      {ad.titles[0] && <p className="headline">{ad.titles[0]}</p>}
      {ad.bodies.length > 1 && <p className="muted small">+{ad.bodies.length - 1} more text variations</p>}

      <div className="tags">
        <span className={`tag ${ad.isActive ? "tag-live" : ""}`}>{ad.isActive ? "Active" : "Inactive"}</span>
        <span className="tag">{tier.label}</span>
        {ad.platforms.map((p) => (
          <span key={p} className="tag">
            {p.replace(/_/g, " ")}
          </span>
        ))}
      </div>

      {children}

      <footer className="card-foot">
        <a href={ad.libraryUrl} target="_blank" rel="noreferrer">
          View in Ad Library ↗
        </a>
        <button className={saved ? "btn btn-saved" : "btn"} onClick={() => onToggleSave(ad)}>
          {saved ? "★ Saved" : "☆ Save"}
        </button>
      </footer>
    </article>
  );
}
