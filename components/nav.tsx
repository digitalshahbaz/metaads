"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/segments", label: "Segments" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/import", label: "Import / Export" },
  { href: "/settings", label: "Integrations" },
];

export function Nav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <aside className="border-b border-zinc-200 bg-white md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:border-r md:border-b-0 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between px-4 py-4 md:block">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span className="grid size-7 place-items-center rounded-lg bg-indigo-600 text-sm text-white">L</span>
          Lead CRM
        </Link>
        <Link href="/leads/new" className="btn-primary md:hidden">+ Lead</Link>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:px-3">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${
              active(l.href)
                ? "bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            {l.label}
          </Link>
        ))}
        <form action={logout} className="md:hidden">
          <button className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-zinc-500">Log out</button>
        </form>
      </nav>
      <div className="hidden px-3 md:mt-4 md:block">
        <Link href="/leads/new" className="btn-primary w-full">+ Add lead</Link>
        <form action={logout} className="mt-2">
          <button className="btn w-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">Log out</button>
        </form>
      </div>
    </aside>
  );
}
