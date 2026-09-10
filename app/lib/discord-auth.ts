export const DISCORD_OAUTH_STATE_COOKIE = "fb_oauth_state";

export function discordClientId(): string | undefined {
  return process.env.DISCORD_CLIENT_ID?.trim() || undefined;
}

export function discordClientSecret(): string | undefined {
  return process.env.DISCORD_CLIENT_SECRET?.trim() || undefined;
}

/**
 * Discord only accepts redirect URIs registered on the application, so this
 * has to match one of them exactly. Derived from the incoming request by
 * default (keeps localhost and production working off the same code), with an
 * env override for cases where the public origin differs from what the
 * request reports — behind a proxy, say.
 */
export function discordRedirectUri(requestUrl: string): string {
  const configured = process.env.DISCORD_REDIRECT_URI?.trim();
  if (configured) return configured;
  return new URL("/api/auth/discord/callback", requestUrl).toString();
}

export function discordAvatarUrl(user: { id: string; avatar?: string | null }): string {
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`;
  }
  // Default avatars are keyed off the account's snowflake. Snowflakes exceed
  // Number.MAX_SAFE_INTEGER, so this has to go through BigInt — written as
  // constructor calls rather than `n` literals, which the ES2017 target rejects.
  const index = Number((BigInt(user.id) >> BigInt(22)) % BigInt(6));
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}
