"use client";

import { useRefreshTransition } from "./use-refresh-transition";
import Link from "next/link";
import { useState } from "react";
import { Check, Mail, MessageCircle } from "lucide-react";
import { sendTemplate } from "@/app/crm-actions";

export type OutreachRow = { id: number; name: string; phone: string | null; email: string | null; preview: string };

export function OutreachList({ rows, templateId, channel }: { rows: OutreachRow[]; templateId: number; channel: string }) {
  const [sent, setSent] = useState<number[]>([]);
  const [pending, start] = useRefreshTransition();
  return (
    <div className="space-y-2">
      <p className="text-sm muted">{sent.length} of {rows.length} sent. Click each button: it opens {channel === "whatsapp" ? "WhatsApp" : "your email app"} with the message ready, and logs it on the lead.</p>
      <ul className="card divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map((r) => {
          const done = sent.includes(r.id);
          const reachable = channel === "whatsapp" ? r.phone : r.email;
          return (
            <li key={r.id} className={`flex flex-wrap items-start justify-between gap-3 p-4 ${done ? "opacity-60" : ""}`}>
              <div className="min-w-0 flex-1 basis-80">
                <Link href={`/leads/${r.id}`} className="font-medium hover:underline">{r.name}</Link>
                <span className="ml-2 text-xs muted">{channel === "whatsapp" ? r.phone : r.email}</span>
                <p className="mt-1 line-clamp-2 text-sm muted">{r.preview}</p>
              </div>
              {done ? <span className="badge bg-emerald-100 text-emerald-800"><Check className="size-3" /> Sent</span> : reachable ? (
                <button
                  className={channel === "whatsapp" ? "btn-wa" : "btn-ghost"}
                  disabled={pending}
                  onClick={() => start(async () => {
                    const win = window.open("about:blank", "_blank");
                    const url = await sendTemplate(r.id, templateId);
                    if (url && win) { win.location.href = url; setSent((s) => [...s, r.id]); } else win?.close();
                  })}
                >
                  {channel === "whatsapp" ? <MessageCircle className="size-4" /> : <Mail className="size-4" />} Send
                </button>
              ) : <span className="text-xs muted">No {channel === "whatsapp" ? "phone" : "email"}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
