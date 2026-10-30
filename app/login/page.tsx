"use client";

import { useActionState } from "react";
import { login } from "@/app/actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-indigo-50 via-slate-50 to-violet-50 px-4 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950">
      <form action={action} className="card w-full max-w-sm p-7 shadow-xl">
        <div className="mb-6 flex items-center gap-2.5 text-lg font-semibold tracking-tight">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">DS</span>
          DS CRM
        </div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" className="input" placeholder="you@company.com" />
        <p className="mt-1 text-xs muted">Owner: leave empty and use the master password.</p>
        <label className="label mt-4" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" className="input" required />
        {state?.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
        <button className="btn-primary mt-5 w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}
