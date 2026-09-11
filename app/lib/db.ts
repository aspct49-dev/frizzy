import { createPool, type VercelPool } from "@vercel/postgres";

/**
 * Vercel's Postgres integration exports POSTGRES_URL; the Neon marketplace
 * integration exports DATABASE_URL. Accept either so the app works whichever
 * way the database was attached.
 */
function connectionString(): string | undefined {
  return (
    process.env.POSTGRES_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    undefined
  );
}

export function dbConfigured(): boolean {
  return Boolean(connectionString());
}

// Next.js reloads modules on edit in development, so the pool and the
// schema-init promise hang off globalThis to avoid opening a new pool (and
// re-running migrations) on every hot reload.
const globalForDb = globalThis as unknown as {
  __frizzyPool?: VercelPool;
  __frizzySchema?: Promise<void>;
};

function pool(): VercelPool {
  const url = connectionString();
  if (!url) throw new Error("No database configured (set POSTGRES_URL)");
  globalForDb.__frizzyPool ??= createPool({ connectionString: url });
  return globalForDb.__frizzyPool;
}

/**
 * Creates the tables on first use. Cheap enough to await on every query path
 * because the promise is memoised per process, so it costs one round trip per
 * cold start rather than one per request.
 */
export function ensureSchema(): Promise<void> {
  globalForDb.__frizzySchema ??= (async () => {
    const db = pool();
    await db.sql`
      CREATE TABLE IF NOT EXISTS claims (
        id               BIGSERIAL PRIMARY KEY,
        discord_id       TEXT        NOT NULL,
        discord_username TEXT        NOT NULL,
        avatar_url       TEXT,
        stake_username   TEXT        NOT NULL,
        status           TEXT        NOT NULL DEFAULT 'pending',
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        settled_at       TIMESTAMPTZ
      )
    `;
    await db.sql`
      CREATE INDEX IF NOT EXISTS claims_created_idx ON claims (created_at DESC)
    `;
    await db.sql`
      CREATE INDEX IF NOT EXISTS claims_user_idx ON claims (discord_id, created_at DESC)
    `;
    await db.sql`
      CREATE TABLE IF NOT EXISTS challenges (
        id           TEXT        PRIMARY KEY,
        name         TEXT        NOT NULL,
        image_url    TEXT        NOT NULL,
        target       TEXT,
        min_bet      TEXT,
        prize        TEXT,
        provider     TEXT,
        status       TEXT        NOT NULL DEFAULT 'active',
        completed_by TEXT,
        completed_at TIMESTAMPTZ,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
  })().catch((error) => {
    // Don't cache a failed init, or the process stays poisoned until redeploy.
    globalForDb.__frizzySchema = undefined;
    throw error;
  });

  return globalForDb.__frizzySchema;
}

export type ClaimStatus = "pending" | "claimed";

export type ClaimRow = {
  id: string;
  discordId: string;
  discordUsername: string;
  avatarUrl: string | null;
  stakeUsername: string;
  status: ClaimStatus;
  createdAt: string;
  settledAt: string | null;
};

export type ChallengeStatus = "active" | "completed";

export type ChallengeRow = {
  id: string;
  name: string;
  imageUrl: string;
  target: string | null;
  minBet: string | null;
  prize: string | null;
  provider: string | null;
  status: ChallengeStatus;
  completedBy: string | null;
  completedAt: string | null;
  createdAt: string;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const toClaim = (r: any): ClaimRow => ({
  id: String(r.id),
  discordId: r.discord_id,
  discordUsername: r.discord_username,
  avatarUrl: r.avatar_url,
  stakeUsername: r.stake_username,
  status: r.status === "claimed" ? "claimed" : "pending",
  createdAt: new Date(r.created_at).toISOString(),
  settledAt: r.settled_at ? new Date(r.settled_at).toISOString() : null,
});

const toChallenge = (r: any): ChallengeRow => ({
  id: r.id,
  name: r.name,
  imageUrl: r.image_url,
  target: r.target,
  minBet: r.min_bet,
  prize: r.prize,
  provider: r.provider,
  status: r.status === "completed" ? "completed" : "active",
  completedBy: r.completed_by,
  completedAt: r.completed_at ? new Date(r.completed_at).toISOString() : null,
  createdAt: new Date(r.created_at).toISOString(),
});
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function insertClaim(claim: {
  discordId: string;
  discordUsername: string;
  avatarUrl: string | null;
  stakeUsername: string;
}): Promise<ClaimRow> {
  await ensureSchema();
  const { rows } = await pool().sql`
    INSERT INTO claims (discord_id, discord_username, avatar_url, stake_username)
    VALUES (${claim.discordId}, ${claim.discordUsername}, ${claim.avatarUrl}, ${claim.stakeUsername})
    RETURNING *
  `;
  return toClaim(rows[0]);
}

/**
 * The authoritative cooldown check. The signed cookie throttles the common
 * case without a round trip, but a visitor can clear cookies; this cannot be
 * cleared from the browser.
 */
export async function lastClaimAt(discordId: string): Promise<Date | null> {
  await ensureSchema();
  const { rows } = await pool().sql`
    SELECT created_at FROM claims
    WHERE discord_id = ${discordId}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return rows[0] ? new Date(rows[0].created_at) : null;
}

export async function listClaims(limit = 500): Promise<ClaimRow[]> {
  await ensureSchema();
  const { rows } = await pool().sql`
    SELECT * FROM claims ORDER BY created_at DESC LIMIT ${limit}
  `;
  return rows.map(toClaim);
}

export async function setClaimStatus(
  id: string,
  status: ClaimStatus,
): Promise<ClaimRow | null> {
  await ensureSchema();
  const settled = status === "claimed" ? new Date().toISOString() : null;
  const { rows } = await pool().sql`
    UPDATE claims
    SET status = ${status}, settled_at = ${settled}
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? toClaim(rows[0]) : null;
}

export async function listChallenges(onlyActive = false): Promise<ChallengeRow[]> {
  await ensureSchema();
  const db = pool();
  const { rows } = onlyActive
    ? await db.sql`SELECT * FROM challenges WHERE status = 'active' ORDER BY created_at DESC`
    : await db.sql`SELECT * FROM challenges ORDER BY created_at DESC`;
  return rows.map(toChallenge);
}

export async function insertChallenge(challenge: {
  id: string;
  name: string;
  imageUrl: string;
  target: string | null;
  minBet: string | null;
  prize: string | null;
  provider: string | null;
}): Promise<ChallengeRow> {
  await ensureSchema();
  const { rows } = await pool().sql`
    INSERT INTO challenges (id, name, image_url, target, min_bet, prize, provider)
    VALUES (${challenge.id}, ${challenge.name}, ${challenge.imageUrl}, ${challenge.target},
            ${challenge.minBet}, ${challenge.prize}, ${challenge.provider})
    RETURNING *
  `;
  return toChallenge(rows[0]);
}

export async function setChallengeStatus(
  id: string,
  status: ChallengeStatus,
  completedBy?: string | null,
): Promise<ChallengeRow | null> {
  await ensureSchema();
  const completed = status === "completed";
  const { rows } = await pool().sql`
    UPDATE challenges
    SET status = ${status},
        completed_by = ${completed ? completedBy || "Unknown" : null},
        completed_at = ${completed ? new Date().toISOString() : null}
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? toChallenge(rows[0]) : null;
}

export async function deleteChallenge(id: string): Promise<boolean> {
  await ensureSchema();
  const { rowCount } = await pool().sql`DELETE FROM challenges WHERE id = ${id}`;
  return (rowCount ?? 0) > 0;
}

export async function challengeExists(id: string): Promise<boolean> {
  await ensureSchema();
  const { rows } = await pool().sql`SELECT 1 FROM challenges WHERE id = ${id}`;
  return rows.length > 0;
}
