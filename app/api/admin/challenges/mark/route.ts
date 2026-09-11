import { NextResponse } from "next/server";
import { forbidden, requireAdmin } from "../../../../lib/admin";
import {
  dbConfigured,
  setChallengeStatus,
  type ChallengeStatus,
} from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await requireAdmin())) return forbidden();
  if (!dbConfigured()) {
    return NextResponse.json({ error: "No database configured" }, { status: 503 });
  }

  let id = "";
  let status: ChallengeStatus = "active";
  let completedBy: string | null = null;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    id = typeof body.id === "string" ? body.id.trim() : "";
    status = body.status === "completed" ? "completed" : "active";
    completedBy =
      typeof body.completedBy === "string" && body.completedBy.trim()
        ? body.completedBy.trim().slice(0, 40)
        : null;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!id) return NextResponse.json({ error: "Missing challenge id" }, { status: 400 });

  try {
    const challenge = await setChallengeStatus(id, status, completedBy);
    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, challenge });
  } catch (error) {
    console.error("Failed to mark challenge:", error);
    return NextResponse.json({ error: "Could not update challenge" }, { status: 502 });
  }
}
