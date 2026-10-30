"use client";

import { useRefreshTransition } from "./use-refresh-transition";
import { useState } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import { deleteView, saveView } from "@/app/crm-actions";

export function SaveViewButton({ query, canShare }: { query: string; canShare: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [shared, setShared] = useState(true);
  const [pending, start] = useRefreshTransition();
  if (!query) return null;
  return (
    <div className="relative">
      <button className="btn-ghost" onClick={() => setOpen((o) => !o)}><Bookmark className="size-4" /> Save view</button>
      {open && (
        <form
          className="card absolute right-0 z-20 mt-1 w-64 space-y-2 p-3 shadow-lg"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => { await saveView(name, query, shared); setOpen(false); setName(""); });
          }}
        >
          <label className="label" htmlFor="view-name">Name this view</label>
          <input id="view-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hot DMM coaches – Mumbai" autoFocus required />
          {canShare && (
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} /> Visible to the whole team</label>
          )}
          <button className="btn-primary w-full" disabled={pending}>Save</button>
        </form>
      )}
    </div>
  );
}

export function DeleteViewButton({ id }: { id: number }) {
  const [pending, start] = useRefreshTransition();
  return (
    <button className="btn px-2 py-1 text-xs muted hover:text-red-600" disabled={pending}
      onClick={() => confirm("Delete this saved view?") && start(async () => { await deleteView(id); })}>
      <Trash2 className="size-3.5" /> Delete view
    </button>
  );
}
