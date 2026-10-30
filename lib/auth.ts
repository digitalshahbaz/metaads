// Signed session cookie shared by middleware (edge) and server code.
// Token = base64url(JSON payload) + "." + HMAC-SHA256(payload). Uses Web Crypto so it runs anywhere.

export const COOKIE = "crm_session";
const MAX_AGE_DAYS = 30;

export type Role = "admin" | "manager" | "caller";
export type Session = { uid: number; role: Role; name: string; exp: number };

function secret() {
  return process.env.AUTH_SECRET || process.env.APP_PASSWORD || "";
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmac(data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data))));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createToken(s: Omit<Session, "exp">) {
  const payload = b64url(enc.encode(JSON.stringify({ ...s, exp: Date.now() + MAX_AGE_DAYS * 864e5 })));
  return `${payload}.${await hmac(payload)}`;
}

export async function readToken(token: string | undefined): Promise<Session | null> {
  if (!token || !secret()) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !safeEqual(sig, await hmac(payload))) return null;
  try {
    const s = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as Session;
    return s.exp > Date.now() && typeof s.uid === "number" ? s : null;
  } catch {
    return null;
  }
}

export function checkMasterPassword(input: string) {
  const pw = process.env.APP_PASSWORD;
  return !!pw && safeEqual(input, pw);
}

export const cookieMaxAge = MAX_AGE_DAYS * 86400;
