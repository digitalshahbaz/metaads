"use client";

import { useRefreshTransition } from "./use-refresh-transition";
import Link from "next/link";
import { useRef } from "react";
import { Check, Trash2 } from "lucide-react";
import { addTask, deleteTask, toggleTask } from "@/app/crm-actions";
import { formatDateTime, type TeamMember } from "@/lib/leads";

export type TaskRow = { id: number; title: string; due_at: Date; done_at: Date | null; lead_id: number | null; lead_name: string | null; lead_phone: string | null; user_name: string | null };

export function TaskList({ tasks, showUser }: { tasks: TaskRow[]; showUser: boolean }) {
  const [pending, start] = useRefreshTransition();
  return (
    <ul className={`divide-y divide-slate-100 dark:divide-slate-800 ${pending ? "opacity-70" : ""}`}>
      {tasks.map((t) => {
        const overdue = !t.done_at && new Date(t.due_at) < new Date();
        return (
          <li key={t.id} className="group flex items-start gap-3 py-2.5 text-sm">
            <button
              className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border ${t.done_at ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 hover:border-indigo-500 dark:border-slate-600"}`}
              onClick={() => start(() => toggleTask(t.id, !t.done_at))}
              aria-label={t.done_at ? "Mark not done" : "Mark done"}
            >
              {t.done_at && <Check className="size-3.5" />}
            </button>
            <div className="min-w-0 flex-1">
              <div className={t.done_at ? "line-through muted" : "font-medium"}>{t.title}</div>
              <div className={`text-xs ${overdue ? "text-red-600" : "muted"}`}>
                {overdue ? "Overdue · " : ""}{formatDateTime(t.due_at)}
                {t.lead_id && <> · <Link href={`/leads/${t.lead_id}`} className="text-indigo-600 hover:underline">{t.lead_name}</Link></>}
                {t.lead_phone && <> · <a href={`tel:${t.lead_phone}`} className="hover:underline">{t.lead_phone}</a></>}
                {showUser && t.user_name ? ` · ${t.user_name}` : ""}
              </div>
            </div>
            <button className="text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-600" onClick={() => start(() => deleteTask(t.id))} aria-label="Delete task">
              <Trash2 className="size-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function NewTaskForm({ team, canAssign }: { team: TeamMember[]; canAssign: boolean }) {
  const [pending, start] = useRefreshTransition();
  const form = useRef<HTMLFormElement>(null);
  const soon = new Date(Date.now() + 3600e3 + 5.5 * 3600e3).toISOString().slice(0, 16);
  return (
    <form ref={form} className="flex flex-wrap gap-2" action={(fd) => start(async () => { await addTask(fd); form.current?.reset(); })}>
      <input name="title" placeholder="New task (not linked to a lead)…" className="input min-w-0 flex-1 basis-64" required />
      <input type="datetime-local" name="due_at" defaultValue={soon} className="input w-auto" required />
      {canAssign && (
        <select name="user_id" className="input w-auto" defaultValue="">
          <option value="">Me</option>
          {team.filter((m) => m.active).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      )}
      <button className="btn-primary" disabled={pending}>Add</button>
    </form>
  );
}
