"use client";

import { useActionState } from "react";
import { login } from "@/app/actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form action={action} className="card w-full max-w-sm p-6">
        <div className="mb-6 flex items-center gap-2 text-lg font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-white">L</span>
          Lead CRM
        </div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" className="input" autoFocus required />
        {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
        <button className="btn-primary mt-4 w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
