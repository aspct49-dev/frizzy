import { createHmac, timingSafeEqual } from "node:crypto";

// Azzubu keeps sessions in an in-memory Map. That can't work here: Vercel runs
// each request in a serverless invocation with no shared memory, so a session
// written by one request would be invisible to the next. Instead the session
// *is* the cookie — a small signed payload we can verify without storing
// anything server-side.

export type SessionUser = {
  id: string;
  username: string;
  avatarUrl: string;
};

type SessionPayload = SessionUser & { exp: number };

export const SESSION_COOKIE = "fb_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function secret(): string {
  const value = process.env.SESSION_SECRET?.trim();
  if (!value) throw new Error("SESSION_SECRET is not set");
  return value;
}

function b64urlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function b64urlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function signature(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

/** Signs an arbitrary payload with an absolute expiry baked in. */
export function signPayload(data: object, ttlSeconds: number): string {
  const body = b64urlEncode(JSON.stringify({ ...data, exp: Date.now() + ttlSeconds * 1000 }));
  return `${body}.${signature(body)}`;
}

/** Verifies signature and expiry, returning the payload or null. */
export function readPayload<T extends { exp: number }>(value: string | undefined): T | null {
  if (!value) return null;
  const [body, mac] = value.split(".");
  if (!body || !mac) return null;

  // Compare in constant time so a wrong signature can't be narrowed down byte
  // by byte. Buffers of differing length would make timingSafeEqual throw.
  const expected = Buffer.from(signature(body));
  const provided = Buffer.from(mac);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;

  try {
    const payload = JSON.parse(b64urlDecode(body)) as T;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createSessionCookie(user: SessionUser): string {
  return signPayload(user, SESSION_MAX_AGE_SECONDS);
}

export function readSessionCookie(value: string | undefined): SessionUser | null {
  const payload = readPayload<SessionPayload>(value);
  if (!payload?.id || !payload.username) return null;
  return { id: payload.id, username: payload.username, avatarUrl: payload.avatarUrl };
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
