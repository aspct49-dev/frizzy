import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  CLAIM_COOLDOWN_COOKIE,
  CLAIM_COOLDOWN_SECONDS,
  type ClaimCooldown,
} from "../../lib/claim";
import {
  readPayload,
  readSessionCookie,
  sessionCookieOptions,
  signPayload,
  SESSION_COOKIE,
} from "../../lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const jar = await cookies();
  const user = readSessionCookie(jar.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const cooldown = readPayload<ClaimCooldown>(jar.get(CLAIM_COOLDOWN_COOKIE)?.value);
  if (cooldown) {
    return NextResponse.json(
      { error: "Cooldown active", cooldownRemaining: cooldown.exp - Date.now() },
      { status: 429 },
    );
  }

  let stakeUsername = "";
  try {
    const body = (await request.json()) as { stakeUsername?: unknown };
    stakeUsername = typeof body.stakeUsername === "string" ? body.stakeUsername.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!stakeUsername) {
    return NextResponse.json({ error: "Stake username is required" }, { status: 400 });
  }
  if (stakeUsername.length > 40) {
    return NextResponse.json({ error: "That username looks too long" }, { status: 400 });
  }

  const webhook = process.env.DISCORD_CLAIM_WEBHOOK_URL?.trim();
  if (!webhook) {
    console.error("DISCORD_CLAIM_WEBHOOK_URL is not set — claim could not be delivered");
    return NextResponse.json({ error: "Claims are not configured yet" }, { status: 503 });
  }

  const now = new Date();
  try {
    const delivered = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: "🧃 Affiliate Claim",
            color: 0x22d8e6,
            thumbnail: { url: user.avatarUrl },
            fields: [
              { name: "Discord", value: `${user.username} (${user.id})`, inline: true },
              { name: "Stake Username", value: stakeUsername, inline: true },
              { name: "Submitted", value: now.toUTCString(), inline: false },
            ],
            timestamp: now.toISOString(),
            footer: { text: "frizzybets" },
          },
        ],
      }),
    });

    if (!delivered.ok) {
      console.error("Claim webhook rejected:", delivered.status, await delivered.text());
      return NextResponse.json({ error: "Could not submit claim, try again" }, { status: 502 });
    }
  } catch (error) {
    console.error("Claim webhook failed:", error);
    return NextResponse.json({ error: "Could not submit claim, try again" }, { status: 502 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    CLAIM_COOLDOWN_COOKIE,
    signPayload({ at: now.toISOString() }, CLAIM_COOLDOWN_SECONDS),
    sessionCookieOptions(CLAIM_COOLDOWN_SECONDS),
  );
  return response;
}
