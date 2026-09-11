import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { forbidden, requireAdmin } from "../../../lib/admin";
import { blobConfigured } from "../../../lib/storage";

export const dynamic = "force-dynamic";

// Vercel caps a serverless function's request body at 4.5MB, so anything
// larger would fail with an opaque platform error rather than our message.
const MAX_BYTES = 4 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export async function POST(request: Request) {
  if (!(await requireAdmin())) return forbidden();

  if (!blobConfigured()) {
    return NextResponse.json(
      { error: "Image storage is not configured (BLOB_READ_WRITE_TOKEN)" },
      { status: 503 },
    );
  }

  let file: File;
  try {
    const form = await request.formData();
    const candidate = form.get("file");
    if (!(candidate instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    file = candidate;
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  const extension = EXTENSIONS[file.type];
  if (!extension) {
    return NextResponse.json(
      { error: "Image must be PNG, JPEG, WebP, GIF or AVIF" },
      { status: 415 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "That file is empty" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 4MB or smaller" }, { status: 413 });
  }

  try {
    // addRandomSuffix keeps two uploads of the same filename from colliding.
    const blob = await put(`challenges/upload.${extension}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    });
    return NextResponse.json({ ok: true, url: blob.url });
  } catch (error) {
    console.error("Blob upload failed:", error);
    return NextResponse.json({ error: "Could not upload image" }, { status: 502 });
  }
}
