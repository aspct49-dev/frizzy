import { NextResponse } from "next/server";
import { dbConfigured, listChallenges } from "../../lib/db";

export const dynamic = "force-dynamic";

/** Public: active challenges only. Completed ones stay in the admin view. */
export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ challenges: [] });

  try {
    return NextResponse.json({ challenges: await listChallenges(true) });
  } catch (error) {
    console.error("Failed to load challenges:", error);
    // An empty list degrades the page gracefully rather than erroring it out.
    return NextResponse.json({ challenges: [] });
  }
}
