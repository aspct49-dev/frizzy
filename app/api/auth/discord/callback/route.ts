import { NextResponse } from "next/server";
import {
  DISCORD_OAUTH_STATE_COOKIE,
  discordAvatarUrl,
  discordClientId,
  discordClientSecret,
  discordRedirectUri,
} from "../../../../lib/discord-auth";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionCookie,
  sessionCookieOptions,
} from "../../../../lib/session";

export const dynamic = "force-dynamic";

function failure(request: Request, reason: string) {
  const url = new URL("/claim", request.url);
  url.searchParams.set("error", reason);
  const response = NextResponse.redirect(url.toString());
  response.cookies.delete(DISCORD_OAUTH_STATE_COOKIE);
  return response;
}

export async function GET(request: Request) {
  const clientId = discordClientId();
  const clientSecret = discordClientSecret();
  if (!clientId || !clientSecret) return failure(request, "not_configured");

  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  const state = params.get("state");
  if (!code) return failure(request, "no_code");

  const expectedState = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${DISCORD_OAUTH_STATE_COOKIE}=`))
    ?.split("=")[1];

  if (!state || !expectedState || state !== expectedState) {
    return failure(request, "bad_state");
  }

  try {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: discordRedirectUri(request.url),
      }),
    });

    const tokenData = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenResponse.ok || !tokenData.access_token) return failure(request, "token_exchange");

    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = (await userResponse.json()) as {
      id?: string;
      username?: string;
      global_name?: string | null;
      avatar?: string | null;
    };
    if (!userResponse.ok || !user.id || !user.username) return failure(request, "profile");

    const response = NextResponse.redirect(new URL("/claim", request.url).toString());
    response.cookies.set(
      SESSION_COOKIE,
      createSessionCookie({
        id: user.id,
        username: user.global_name || user.username,
        avatarUrl: discordAvatarUrl({ id: user.id, avatar: user.avatar }),
      }),
      sessionCookieOptions(SESSION_MAX_AGE_SECONDS),
    );
    response.cookies.delete(DISCORD_OAUTH_STATE_COOKIE);
    return response;
  } catch (error) {
    console.error("Discord callback failed:", error);
    return failure(request, "auth_failed");
  }
}
