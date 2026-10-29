"use client";

import { useTransition } from "react";
import { deleteActivity, deleteLead } from "@/app/actions";

export function DeleteLeadButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn-danger w-full"
      disabled={pending}
      onClick={() => confirm("Delete this lead and its activity? This cannot be undone.") && start(() => deleteLead(id))}
    >
      Delete lead
    </button>
  );
}

export function DeleteActivityButton({ leadId, activityId }: { leadId: number; activityId: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      aria-label="Delete activity"
      disabled={pending}
      onClick={() => confirm("Delete this entry?") && start(() => deleteActivity(leadId, activityId))}
      className="shrink-0 self-start text-zinc-400 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
    >
      ✕
    </button>
  );
}
