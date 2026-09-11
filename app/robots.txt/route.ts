import { requestOrigin } from "../lib/request-origin";

export async function GET() {
  const origin = requestOrigin();
  const body = [
    "User-agent: *",
    "Allow: /",
    // Staff control panel and the endpoints behind it. Already gated by the
    // admin allowlist; this just keeps them out of the index.
    "Disallow: /admin",
    "Disallow: /api/",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
