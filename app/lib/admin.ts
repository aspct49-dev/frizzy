import { cookies } from "next/headers";
import { readSessionCookie, SESSION_COOKIE, type SessionUser } from "./session";

/**
 * Admins are listed by Discord user ID (snowflake), comma separated.
 *
 * Deliberately IDs and not usernames: a Discord username can be changed by
 * its owner at any time, so an allowlist of names is an impersonation route.
 * Snowflakes are permanent.
 */
export function adminIds(): string[] {
  return (process.env.ADMIN_DISCORD_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function adminConfigured(): boolean {
  return adminIds().length > 0;
}

export function isAdmin(user: SessionUser | null): boolean {
  if (!user) return false;
  return adminIds().includes(user.id);
}

/**
 * Resolves the signed-in user and whether they are an admin.
 *
 * The check runs against the env allowlist on every request rather than
 * trusting a flag stored in the session cookie. Revoking an admin then takes
 * effect on their next request instead of whenever their week-long cookie
 * happens to expire.
 */
export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  return readSessionCookie(jar.get(SESSION_COOKIE)?.value);
}

export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await currentUser();
  return isAdmin(user) ? user : null;
}

/** Shared 403 body so every admin route answers identically. */
export function forbidden(): Response {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}
