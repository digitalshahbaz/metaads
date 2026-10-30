import { Suspense } from "react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { Sidebar } from "@/components/sidebar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  const sql = await db();
  const [views, [{ n }]] = await Promise.all([
    sql<{ id: number; name: string; query: string }[]>`
      SELECT id, name, query FROM saved_views WHERE shared OR user_id = ${s.uid} ORDER BY name`,
    sql`SELECT count(*)::int AS n FROM tasks WHERE user_id = ${s.uid} AND done_at IS NULL
        AND due_at < (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') + interval '1 day') AT TIME ZONE 'Asia/Kolkata'`,
  ]);
  return (
    <div className="min-h-screen md:flex">
      <Suspense>
        <Sidebar user={{ name: s.name, role: s.role }} views={views.map((v) => ({ ...v }))} taskCount={n} />
      </Suspense>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
