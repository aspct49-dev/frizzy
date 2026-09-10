import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  DISCORD_OAUTH_STATE_COOKIE,
  discordClientId,
  discordRedirectUri,
} from "../../../lib/discord-auth";
import { sessionCookieOptions } from "../../../lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const clientId = discordClientId();
  if (!clientId) {
    return NextResponse.json({ error: "Discord login is not configured" }, { status: 503 });
  }

  const redirectUri = discordRedirectUri(request.url);

  // CSRF guard: a random value echoed back by Discord and checked in the
  // callback, so someone can't hand a victim a pre-baked callback URL.
  const state = randomBytes(16).toString("hex");

  const authUrl = new URL("https://discord.com/oauth2/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "identify");
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set(DISCORD_OAUTH_STATE_COOKIE, state, sessionCookieOptions(10 * 60));
  return response;
}
