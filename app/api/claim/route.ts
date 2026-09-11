import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  CLAIM_COOLDOWN_COOKIE,
  CLAIM_COOLDOWN_SECONDS,
  type ClaimCooldown,
} from "../../lib/claim";
import { dbConfigured, insertClaim, lastClaimAt } from "../../lib/db";
import {
  readPayload,
  readSessionCookie,
  sessionCookieOptions,
  signPayload,
  SESSION_COOKIE,
} from "../../lib/session";

export const dynamic = "force-dynamic";

const COOLDOWN_MS = CLAIM_COOLDOWN_SECONDS * 1000;

export async function POST(request: Request) {
  const jar = await cookies();
  const user = readSessionCookie(jar.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  // Fast path: the signed cookie catches the common repeat without a round
  // trip to the database.
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
  const hasDb = dbConfigured();
  if (!hasDb && !webhook) {
    console.error("Neither POSTGRES_URL nor DISCORD_CLAIM_WEBHOOK_URL is set");
    return NextResponse.json({ error: "Claims are not configured yet" }, { status: 503 });
  }

  const now = new Date();

  // Authoritative cooldown. Unlike the cookie above, this cannot be cleared
  // from the browser.
  if (hasDb) {
    try {
      const last = await lastClaimAt(user.id);
      const elapsed = last ? now.getTime() - last.getTime() : Infinity;
      if (elapsed < COOLDOWN_MS) {
        return NextResponse.json(
          { error: "Cooldown active", cooldownRemaining: COOLDOWN_MS - elapsed },
          { status: 429 },
        );
      }
    } catch (error) {
      console.error("Cooldown lookup failed:", error);
      return NextResponse.json({ error: "Could not submit claim, try again" }, { status: 502 });
    }

    try {
      await insertClaim({
        discordId: user.id,
        discordUsername: user.username,
        avatarUrl: user.avatarUrl,
        stakeUsername,
      });
    } catch (error) {
      console.error("Claim insert failed:", error);
      return NextResponse.json({ error: "Could not submit claim, try again" }, { status: 502 });
    }
  }

  if (webhook) {
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
        const detail = await delivered.text();
        console.error("Claim webhook rejected:", delivered.status, detail);
        // Already recorded, so the claim is not lost -- the admin panel will
        // show it even though the Discord ping did not land.
        if (!hasDb) {
          return NextResponse.json({ error: "Could not submit claim, try again" }, { status: 502 });
        }
      }
    } catch (error) {
      console.error("Claim webhook failed:", error);
      if (!hasDb) {
        return NextResponse.json({ error: "Could not submit claim, try again" }, { status: 502 });
      }
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    CLAIM_COOLDOWN_COOKIE,
    signPayload({ at: now.toISOString() }, CLAIM_COOLDOWN_SECONDS),
    sessionCookieOptions(CLAIM_COOLDOWN_SECONDS),
  );
  return response;
}
