import { NextResponse } from "next/server";
import { forbidden, requireAdmin } from "../../../lib/admin";
import { dbConfigured, listClaims } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdmin())) return forbidden();
  if (!dbConfigured()) {
    return NextResponse.json({ error: "No database configured" }, { status: 503 });
  }

  try {
    return NextResponse.json({ claims: await listClaims() });
  } catch (error) {
    console.error("Failed to list claims:", error);
    return NextResponse.json({ error: "Could not load claims" }, { status: 502 });
  }
}
