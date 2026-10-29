import Link from "next/link";

const TABS = [
  { id: "", label: "All" },
  { id: "dmm", label: "Digimark Media" },
  { id: "ds", label: "Digital Shahbaz" },
];

/** Business switcher; keeps every other query param except paging. */
export function BizTabs({ path, params }: { path: string; params: Record<string, string | undefined> }) {
  const active = params.biz === "dmm" || params.biz === "ds" ? params.biz : "";
  const href = (biz: string) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "biz" && k !== "page") p.set(k, v);
    if (biz) p.set("biz", biz);
    const s = p.toString();
    return s ? `${path}?${s}` : path;
  };
  return (
    <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5 text-sm dark:border-zinc-800 dark:bg-zinc-900">
      {TABS.map((t) => (
        <Link
          key={t.id}
          href={href(t.id)}
          className={`rounded-md px-3 py-1.5 whitespace-nowrap ${
            active === t.id ? "bg-indigo-600 font-medium text-white" : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
