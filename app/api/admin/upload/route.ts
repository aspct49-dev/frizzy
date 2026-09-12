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
 * Imported at call time rather than at module scope on purpose.
 *
 * A top-level import that fails to load takes the whole function down before
 * any handler runs, which the platform serves as a bodyless 502 -- the one
 * failure our error handling cannot turn into a message. Loading it here makes
 * that case catchable and reportable like any other.
 */
async function blobPut() {
  const mod = await import("@vercel/blob");
  return mod.put;
}

const detailOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/**
 * Diagnostics. Admin-only, and far easier to reach than function logs: opening
 * this route in a browser says whether the module loads, whether a token is
 * present, and what Blob storage actually replies to a minimal write.
 */
export async function GET() {
  if (!(await requireAdmin())) return forbidden();

  const report: Record<string, unknown> = {
    tokenPresent: blobConfigured(),
    tokenPrefix: process.env.BLOB_READ_WRITE_TOKEN?.trim().slice(0, 20) ?? null,
  };

  try {
    const put = await blobPut();
    report.moduleLoaded = true;
    const probe = await put("challenges/_probe.txt", "ok", {
      access: "public",
      addRandomSuffix: true,
      contentType: "text/plain",
    });
    report.writeOk = true;
    report.url = probe.url;
  } catch (error) {
    report.moduleLoaded = report.moduleLoaded ?? false;
    report.writeOk = false;
    report.error = detailOf(error);
  }

  return NextResponse.json(report);
}

export async function POST(request: Request) {
  try {
    return await handleUpload(request);
  } catch (error) {
    console.error("Blob upload crashed:", error);
    return NextResponse.json(
      { error: `Image storage rejected the upload: ${detailOf(error)}` },
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

  const put = await blobPut();
  // addRandomSuffix keeps two uploads of the same filename from colliding.
  const blob = await put(`challenges/upload.${extension}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
  });

  return NextResponse.json({ ok: true, url: blob.url });
}
