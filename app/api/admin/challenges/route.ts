import { NextResponse } from "next/server";
import { forbidden, requireAdmin } from "../../../lib/admin";
import {
  challengeExists,
  dbConfigured,
  insertChallenge,
  listChallenges,
} from "../../../lib/db";

export const dynamic = "force-dynamic";

/** URL-safe id derived from the name, e.g. "Sugar Rift 1K" -> "sugar-rift-1k". */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Both URLs here reach a public page -- one as an <img src>, one as an href.
 * Uploads produce a blob URL, but both fields also accept a pasted value, so
 * restrict them to http, https and same-origin paths rather than trusting
 * whatever scheme was typed.
 */
const webUrl = (value: string): boolean =>
  value.startsWith("/") || /^https?:\/\//i.test(value);

const field = (value: unknown, max = 60): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
};

/** Admin view: every challenge, active and completed. */
export async function GET() {
  if (!(await requireAdmin())) return forbidden();
  if (!dbConfigured()) {
    return NextResponse.json({ error: "No database configured" }, { status: 503 });
  }

  try {
    return NextResponse.json({ challenges: await listChallenges(false) });
  } catch (error) {
    console.error("Failed to list challenges:", error);
    return NextResponse.json({ error: "Could not load challenges" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return forbidden();
  if (!dbConfigured()) {
    return NextResponse.json({ error: "No database configured" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = field(body.name, 80);
  const imageUrl = field(body.imageUrl, 500);

  if (!name) return NextResponse.json({ error: "Challenge name is required" }, { status: 400 });
  if (!imageUrl) return NextResponse.json({ error: "Challenge image is required" }, { status: 400 });

  if (!webUrl(imageUrl)) {
    return NextResponse.json({ error: "Image must be an http(s) URL" }, { status: 400 });
  }

  const linkUrl = field(body.linkUrl, 500);
  if (linkUrl && !webUrl(linkUrl)) {
    return NextResponse.json(
      { error: "Challenge link must be an http(s) URL" },
      { status: 400 },
    );
  }

  const base = slugify(name) || "challenge";

  try {
    // Names repeat (the same slot can be posted twice), so suffix rather than
    // reject or overwrite an existing challenge. Inside the try because these
    // are database round trips like the insert below.
    let id = base;
    for (let n = 2; await challengeExists(id); n += 1) {
      id = `${base}-${n}`;
      if (n > 50) {
        return NextResponse.json({ error: "Too many challenges with that name" }, { status: 409 });
      }
    }

    const challenge = await insertChallenge({
      id,
      name,
      imageUrl,
      target: field(body.target, 20),
      minBet: field(body.minBet, 20),
      prize: field(body.prize, 20),
      provider: field(body.provider, 40),
      linkUrl,
    });
    return NextResponse.json({ ok: true, challenge });
  } catch (error) {
    console.error("Failed to create challenge:", error);
    return NextResponse.json({ error: "Could not create challenge" }, { status: 502 });
  }
}
