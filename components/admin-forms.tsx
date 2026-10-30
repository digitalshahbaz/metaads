"use client";

import { useRefreshTransition } from "./use-refresh-transition";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { deleteField, deleteTemplate, saveField, saveTemplate, saveUser, setUserActive } from "@/app/crm-actions";
import type { CustomField, Template } from "@/lib/leads";

export function TemplateEditor({ t, onDone }: { t?: Template; onDone?: () => void }) {
  const [pending, start] = useRefreshTransition();
  const [channel, setChannel] = useState(t?.channel ?? "whatsapp");
  return (
    <form className="grid gap-3 sm:grid-cols-2" action={(fd) => start(async () => { await saveTemplate(fd); onDone?.(); })}>
      {t && <input type="hidden" name="id" value={t.id} />}
      <label className="block"><span className="label">Name</span><input name="name" defaultValue={t?.name} className="input" required /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block"><span className="label">Channel</span>
          <select name="channel" value={channel} onChange={(e) => setChannel(e.target.value as Template["channel"])} className="input">
            <option value="whatsapp">WhatsApp</option><option value="email">Email</option>
          </select>
        </label>
        <label className="block"><span className="label">Business</span>
          <select name="business" defaultValue={t?.business ?? "any"} className="input">
            <option value="any">Both</option><option value="dmm">Digimark Media</option><option value="ds">Digital Shahbaz</option>
          </select>
        </label>
      </div>
      {channel === "email" && <label className="block sm:col-span-2"><span className="label">Subject</span><input name="subject" defaultValue={t?.subject ?? ""} className="input" /></label>}
      <label className="block sm:col-span-2">
        <span className="label">Message</span>
        <textarea name="body" defaultValue={t?.body} rows={5} className="input" required />
        <span className="mt-1 block text-xs muted">Placeholders: {"{first_name} {name} {business} {my_name} {city} {profession}"}</span>
      </label>
      <div className="flex gap-2"><button className="btn-primary" disabled={pending}>{t ? "Save" : "Add template"}</button>
        {onDone && <button type="button" className="btn-ghost" onClick={onDone}>Cancel</button>}</div>
    </form>
  );
}

export function TemplateCard({ t, canEdit }: { t: Template; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useRefreshTransition();
  if (editing) return <div className="card p-4"><TemplateEditor t={t} onDone={() => setEditing(false)} /></div>;
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{t.name}</div>
          <div className="text-xs muted">{t.channel === "whatsapp" ? "WhatsApp" : "Email"} · {t.business === "any" ? "Both businesses" : t.business === "dmm" ? "Digimark Media" : "Digital Shahbaz"}</div>
        </div>
        {canEdit && (
          <div className="flex gap-1">
            <button className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setEditing(true)} aria-label="Edit"><Pencil className="size-4" /></button>
            <button className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950" disabled={pending} onClick={() => confirm("Delete template?") && start(() => deleteTemplate(t.id))} aria-label="Delete"><Trash2 className="size-4" /></button>
          </div>
        )}
      </div>
      {t.subject && <div className="mt-2 text-sm font-medium">{t.subject}</div>}
      <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-wrap dark:bg-slate-800/50">{t.body}</p>
    </div>
  );
}

export function UserForm({ u, onDone }: { u?: { id: number; name: string; email: string; role: string }; onDone?: () => void }) {
  const [pending, start] = useRefreshTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form className="grid gap-3 sm:grid-cols-5" action={(fd) => start(async () => {
      const r = await saveUser(fd);
      if (r && "error" in r && r.error) setMsg(r.error); else { setMsg(u ? "Saved." : "Added. Share the email + password with them."); onDone?.(); }
    })}>
      {u && <input type="hidden" name="id" value={u.id} />}
      <label className="block"><span className="label">Name</span><input name="name" defaultValue={u?.name} className="input" required /></label>
      <label className="block sm:col-span-2"><span className="label">Email (their login)</span><input name="email" type="email" defaultValue={u?.email} className="input" required /></label>
      <label className="block"><span className="label">Role</span>
        <select name="role" defaultValue={u?.role ?? "caller"} className="input">
          <option value="caller">Caller</option><option value="manager">Manager</option><option value="admin">Admin</option>
        </select>
      </label>
      <label className="block"><span className="label">{u ? "New password (optional)" : "Password"}</span><input name="password" type="text" minLength={6} className="input" required={!u} /></label>
      <div className="flex items-center gap-2 sm:col-span-5">
        <button className="btn-primary" disabled={pending}>{u ? "Save" : "Add team member"}</button>
        {onDone && u && <button type="button" className="btn-ghost" onClick={onDone}>Cancel</button>}
        {msg && <span className="text-sm muted">{msg}</span>}
      </div>
    </form>
  );
}

export function UserRow({ u, stats, self }: { u: { id: number; name: string; email: string; role: string; active: boolean; last_login: Date | null }; stats: string; self: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useRefreshTransition();
  if (editing) return <li className="py-4"><UserForm u={u} onDone={() => setEditing(false)} /></li>;
  return (
    <li className={`flex flex-wrap items-center justify-between gap-3 py-3 text-sm ${u.active ? "" : "opacity-50"}`}>
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-slate-200 text-xs font-semibold dark:bg-slate-700">{u.name.slice(0, 2).toUpperCase()}</span>
        <div>
          <div className="font-medium">{u.name} <span className="badge ml-1 bg-slate-100 capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">{u.role}</span>{!u.active && <span className="badge ml-1 bg-red-100 text-red-700">Disabled</span>}</div>
          <div className="text-xs muted">{u.email === "owner" ? "Owner (master password)" : u.email} · {stats}</div>
        </div>
      </div>
      {u.email !== "owner" && !self && (
        <div className="flex gap-2">
          <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => setEditing(true)}>Edit / reset password</button>
          <button className="btn-ghost px-2.5 py-1.5 text-xs" disabled={pending} onClick={() => start(() => setUserActive(u.id, !u.active))}>{u.active ? "Disable" : "Enable"}</button>
        </div>
      )}
    </li>
  );
}

export function FieldForm({ f, onDone }: { f?: CustomField; onDone?: () => void }) {
  const [pending, start] = useRefreshTransition();
  const [type, setType] = useState(f?.type ?? "select");
  return (
    <form className="grid gap-3 sm:grid-cols-4" action={(fd) => start(async () => { await saveField(fd); onDone?.(); })}>
      {f && <input type="hidden" name="id" value={f.id} />}
      <label className="block"><span className="label">Column name</span><input name="label" defaultValue={f?.label} className="input" placeholder="e.g. Call status" required /></label>
      <label className="block"><span className="label">Type</span>
        <select name="type" value={type} onChange={(e) => setType(e.target.value as CustomField["type"])} className="input">
          <option value="select">Dropdown</option><option value="text">Text</option><option value="number">Number</option>
          <option value="date">Date</option><option value="checkbox">Yes / No</option>
        </select>
      </label>
      {type === "select" && (
        <label className="block sm:col-span-2"><span className="label">Dropdown options (comma or one per line)</span>
          <textarea name="options" rows={2} defaultValue={f?.options.join(", ")} className="input" placeholder="Interested, Not interested, Call back" required />
        </label>
      )}
      <label className="flex items-center gap-2 text-sm sm:col-span-4"><input type="checkbox" name="show_in_table" defaultChecked={f?.show_in_table ?? true} /> Show as a column in the leads table</label>
      <div className="flex gap-2 sm:col-span-4">
        <button className="btn-primary" disabled={pending}>{f ? "Save" : "Add field"}</button>
        {onDone && f && <button type="button" className="btn-ghost" onClick={onDone}>Cancel</button>}
      </div>
    </form>
  );
}

export function FieldRow({ f, usage }: { f: CustomField; usage: { value: string; n: number }[] }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useRefreshTransition();
  if (editing) return <li className="py-4"><FieldForm f={f} onDone={() => setEditing(false)} /></li>;
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
      <div>
        <div className="font-medium">{f.label} <span className="badge ml-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{f.type === "select" ? "Dropdown" : f.type}</span>{!f.show_in_table && <span className="ml-1 text-xs muted">hidden in table</span>}</div>
        {f.type === "select" && <div className="mt-1 flex flex-wrap gap-1">{f.options.map((o) => <span key={o} className="badge bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{o} {usage.find((u) => u.value === o)?.n ?? 0}</span>)}</div>}
      </div>
      <div className="flex gap-2">
        <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => setEditing(true)}>Edit</button>
        <button className="btn-danger px-2.5 py-1.5 text-xs" disabled={pending} onClick={() => confirm(`Delete "${f.label}" and its values on every lead?`) && start(() => deleteField(f.id))}>Delete</button>
      </div>
    </li>
  );
}
