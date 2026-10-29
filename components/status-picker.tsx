"use client";

import { useTransition } from "react";
import { setStatus } from "@/app/actions";
import { STATUSES } from "@/lib/leads";

export function StatusPicker({ id, status }: { id: number; status: string }) {
  const [pending, start] = useTransition();
  return (
    <div className={`flex flex-wrap gap-1.5 ${pending ? "opacity-60" : ""}`}>
      {STATUSES.map((s) => (
        <button
          key={s.id}
          disabled={pending}
          onClick={() => start(() => setStatus(id, s.id))}
          className={`badge cursor-pointer ${s.color} ${s.id === status ? "ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-zinc-900" : "opacity-60 hover:opacity-100"}`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
