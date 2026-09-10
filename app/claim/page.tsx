import type { Metadata } from "next";
import { cookies } from "next/headers";
import { CLAIM_COOLDOWN_COOKIE, type ClaimCooldown } from "../lib/claim";
import { readPayload, readSessionCookie, SESSION_COOKIE } from "../lib/session";
import { ClaimClient } from "./claim-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Claim Rakeback",
  description:
    "Log in with Discord and submit your Stake username to claim your 3.5% rakeback under code frizz.",
  alternates: { canonical: "/claim" },
  openGraph: {
    title: "Claim Your Frizzybets Rakeback",
    description:
      "Log in with Discord and submit your Stake username to claim your 3.5% rakeback under code frizz.",
    url: "/claim",
    images: ["/og.png"],
  },
};

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [jar, params] = await Promise.all([cookies(), searchParams]);
  const user = readSessionCookie(jar.get(SESSION_COOKIE)?.value);

  // readPayload already drops expired cookies, so a value here is still live.
  // Hand the client the absolute expiry rather than a remaining duration —
  // the countdown then ticks off the browser's own clock instead of a
  // server-computed number that starts going stale the moment it's rendered.
  const cooldown = readPayload<ClaimCooldown>(jar.get(CLAIM_COOLDOWN_COOKIE)?.value);

  return (
    <ClaimClient
      user={user}
      cooldownExpiresAt={cooldown?.exp ?? 0}
      configured={Boolean(process.env.DISCORD_CLIENT_ID?.trim())}
      loginError={params.error ?? null}
    />
  );
}
