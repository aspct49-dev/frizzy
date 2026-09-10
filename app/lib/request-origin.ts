// Frizzybets' production domain. Override with SITE_URL for previews or if the
// site ever moves.
const DEFAULT_SITE_ORIGIN = "https://frizzyrewards.com";

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
