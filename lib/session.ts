import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db } from "@/lib/db";
import { COOKIE, readToken, type Role, type Session } from "@/lib/auth";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 32);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(pw: string, stored: string | null) {
  if (!stored?.startsWith("scrypt$")) return false;
  const [, saltHex, keyHex] = stored.split("$");
  const key = await scrypt(pw, Buffer.from(saltHex, "hex"), 32);
  const expected = Buffer.from(keyHex, "hex");
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Current user (verified cookie + still active in DB). Cached per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  const s = await readToken((await cookies()).get(COOKIE)?.value);
  if (!s) return null;
  const sql = await db();
  const [u] = await sql<{ name: string; role: Role; active: boolean }[]>`
    SELECT name, role, active FROM users WHERE id = ${s.uid}`;
  if (!u || !u.active) return null;
  return { ...s, name: u.name, role: u.role };
});

export async function requireSession() {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

export const canManage = (s: Session) => s.role === "admin" || s.role === "manager";
export const isAdmin = (s: Session) => s.role === "admin";

export async function requireRole(...roles: Role[]) {
  const s = await requireSession();
  if (!roles.includes(s.role)) throw new Error("You don't have permission to do that.");
  return s;
}

/** Callers may only touch leads assigned to them. */
export async function assertLeadAccess(s: Session, leadId: number) {
  if (canManage(s)) return;
  const sql = await db();
  const [l] = await sql`SELECT 1 FROM leads WHERE id = ${leadId} AND owner_id = ${s.uid}`;
  if (!l) throw new Error("This lead isn't assigned to you.");
}
