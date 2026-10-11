import type { AdvertiserSummary } from "@/lib/types";

export function AdvertiserTable({ rows, onPick }: { rows: AdvertiserSummary[]; onPick: (pageId: string) => void }) {
  if (!rows.length) return null;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Advertiser</th>
            <th className="num">Ads</th>
            <th className="num">Active</th>
            <th className="num">Longest run</th>
            <th className="num">Avg run</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.pageId}>
              <td>
                <button className="link" onClick={() => onPick(r.pageId)} title="Show only this advertiser's ads">
                  {r.pageName}
                </button>
                <div className="muted small">Page ID {r.pageId}</div>
              </td>
              <td className="num">{r.adCount}</td>
              <td className="num">{r.activeCount}</td>
              <td className="num">{r.maxDaysRunning}d</td>
              <td className="num">{r.avgDaysRunning}d</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
