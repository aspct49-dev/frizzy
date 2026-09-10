export const CLAIM_COOLDOWN_COOKIE = "fb_last_claim";
export const CLAIM_COOLDOWN_SECONDS = 24 * 60 * 60;

export type ClaimCooldown = { at: string; exp: number };

// NOTE ON THE COOLDOWN: this is a signed cookie, not a stored record. It's
// tamper-proof (a forged value fails the signature check) but a determined
// user can still clear their cookies to submit again — and nothing here
// survives as a claim history. Claims live in the Discord channel the webhook
// posts to; that channel is the record. Making the cooldown authoritative,
// or showing users their own claim history, needs a real datastore
// (Vercel KV / Postgres / Upstash) rather than a cookie.
