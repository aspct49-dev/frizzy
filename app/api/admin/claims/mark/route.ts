import { NextResponse } from "next/server";
import { forbidden, requireAdmin } from "../../../../lib/admin";
import { dbConfigured, setClaimStatus, type ClaimStatus } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await requireAdmin())) return forbidden();
  if (!dbConfigured()) {
    return NextResponse.json({ error: "No database configured" }, { status: 503 });
  }

  let id = "";
  let status: ClaimStatus = "pending";
  try {
    const body = (await request.json()) as { id?: unknown; status?: unknown };
    id = typeof body.id === "string" ? body.id.trim() : "";
    // Anything that is not an explicit "claimed" falls back to pending, so a
    // malformed status can never silently mark money as paid out.
    status = body.status === "claimed" ? "claimed" : "pending";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid claim id" }, { status: 400 });
  }

  try {
    const claim = await setClaimStatus(id, status);
    if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    return NextResponse.json({ ok: true, claim });
  } catch (error) {
    console.error("Failed to mark claim:", error);
    return NextResponse.json({ error: "Could not update claim" }, { status: 502 });
  }
}
