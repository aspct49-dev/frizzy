import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { forbidden, requireAdmin } from "../../../lib/admin";
import { blobConfigured } from "../../../lib/storage";

export const dynamic = "force-dynamic";
// The upload is one network hop to Blob storage, but the default ceiling is
// low enough that a slow hop is indistinguishable from a crash.
export const maxDuration = 30;

// Vercel caps a serverless function's request body at 4.5MB. The browser
// downscales before sending, so this is a backstop for anything that skipped
// that path (an animated GIF, or an image the browser could not decode).
const MAX_BYTES = 4 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/**
 * Anything thrown here would otherwise escape as a platform error page with no
 * JSON body, which the client can only report as an opaque status code. The
 * whole handler is wrapped so a failure always comes back as a readable
 * message instead.
 *
 * The real error text is included: this route is admin-only, and the
 * alternative is asking someone to go and read function logs.
 */
export async function POST(request: Request) {
  try {
    return await handleUpload(request);
  } catch (error) {
    console.error("Blob upload crashed:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Image storage rejected the upload: ${detail}` },
      { status: 502 },
    );
  }
}

async function handleUpload(request: Request) {
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
      { error: `Unsupported image type "${file.type || "unknown"}"` },
      { status: 415 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "That file is empty" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 4MB or smaller" }, { status: 413 });
  }

  // addRandomSuffix keeps two uploads of the same filename from colliding.
  const blob = await put(`challenges/upload.${extension}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
  });

  return NextResponse.json({ ok: true, url: blob.url });
}
