import { NextResponse } from "next/server";
import { forbidden, requireAdmin } from "../../../../lib/admin";
import { dbConfigured, deleteChallenge } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await requireAdmin())) return forbidden();
  if (!dbConfigured()) {
    return NextResponse.json({ error: "No database configured" }, { status: 503 });
  }

  let id = "";
  try {
    const body = (await request.json()) as { id?: unknown };
    id = typeof body.id === "string" ? body.id.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!id) return NextResponse.json({ error: "Missing challenge id" }, { status: 400 });

  try {
    const removed = await deleteChallenge(id);
    if (!removed) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }
    // The uploaded image is intentionally left in blob storage. Deleting it
    // here would break any other challenge reusing the same file, and the
    // storage cost of a few thumbnails is negligible.
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete challenge:", error);
    return NextResponse.json({ error: "Could not delete challenge" }, { status: 502 });
  }
}
