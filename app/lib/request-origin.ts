// Placeholder until Frizzybets' production domain is confirmed; override with SITE_URL.
const DEFAULT_SITE_ORIGIN = "https://frizzybets.com";

export function requestOrigin(): string {
  const configured = process.env.SITE_URL?.trim();
  if (!configured) return DEFAULT_SITE_ORIGIN;

  try {
    const url = new URL(configured);
    if (
      (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password
    ) {
      return url.origin;
    }
  } catch {
    // Fall through to the known production origin.
  }

  return DEFAULT_SITE_ORIGIN;
}
