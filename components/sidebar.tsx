"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  BarChart3, Bookmark, CheckSquare, Columns3, FileUp, Handshake, LayoutDashboard, LogOut, Menu, MessageSquareText,
  Plug, Plus, SlidersHorizontal, Target, Users, UsersRound, X,
} from "lucide-react";
import { logout } from "@/app/actions";
import type { Role } from "@/lib/auth";

type View = { id: number; name: string; query: string };

const NAV: { href: string; label: string; icon: React.ElementType; roles?: Role[] }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: UsersRound },
  { href: "/tasks", label: "My tasks", icon: CheckSquare },
  { href: "/deals", label: "Deals", icon: Handshake },
  { href: "/pipeline", label: "Pipeline", icon: Columns3 },
  { href: "/segments", label: "Segments", icon: Target },
  { href: "/reports", label: "Team & calls", icon: BarChart3, roles: ["admin", "manager"] },
  { href: "/templates", label: "Templates", icon: MessageSquareText },
  { href: "/import", label: "Import / Export", icon: FileUp, roles: ["admin", "manager"] },
  { href: "/team", label: "Team members", icon: Users, roles: ["admin"] },
  { href: "/fields", label: "Custom fields", icon: SlidersHorizontal, roles: ["admin"] },
  { href: "/settings", label: "Integrations", icon: Plug, roles: ["admin", "manager"] },
];

export function Sidebar({ user, views, taskCount }: { user: { name: string; role: Role }; views: View[]; taskCount: number }) {
  const path = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const viewActive = (q: string) => path === "/leads" && sp.toString() === q;

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight" onClick={() => setOpen(false)}>
          <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-sm">DS</span>
          DS CRM
        </Link>
        <button className="md:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="size-5" /></button>
      </div>
      <div className="px-3">
        <Link href="/leads/new" className="btn-primary w-full" onClick={() => setOpen(false)}><Plus className="size-4" /> Add lead</Link>
      </div>
      <nav className="mt-3 flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
        {NAV.filter((n) => !n.roles || n.roles.includes(user.role)).map((n) => (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
              active(n.href)
                ? "bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            <n.icon className="size-4 shrink-0" />
            <span className="flex-1">{n.label}</span>
            {n.href === "/tasks" && taskCount > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white tabular-nums">{taskCount}</span>
            )}
          </Link>
        ))}
        {views.length > 0 && (
          <div className="pt-4">
            <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Saved views</div>
            {views.map((v) => (
              <Link
                key={v.id}
                href={`/leads?${v.query}`}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 truncate rounded-lg px-3 py-1.5 text-sm ${
                  viewActive(v.query) ? "bg-slate-100 font-medium dark:bg-slate-800" : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                <Bookmark className="size-3.5 shrink-0" /> <span className="truncate">{v.name}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>
      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <div className="flex items-center gap-2.5 px-1">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-200 text-xs font-semibold dark:bg-slate-700">
            {user.name.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{user.name}</div>
            <div className="text-xs capitalize muted">{user.role}</div>
          </div>
          <form action={logout}>
            <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Log out" aria-label="Log out">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/90">
        <button onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="size-5" /></button>
        <span className="font-semibold">DS CRM</span>
        <Link href="/leads/new" className="btn-primary px-2.5 py-1.5" aria-label="Add lead"><Plus className="size-4" /></Link>
      </div>
      {open && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200 bg-white transition-transform md:sticky md:top-0 md:z-auto md:h-screen md:translate-x-0 dark:border-slate-800 dark:bg-slate-900 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {content}
      </aside>
    </>
  );
}
