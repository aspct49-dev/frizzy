import type { BoardKey } from "../data";

export type Standing = {
  name: string;
  wagered: number;
  prize: number;
};

export type BoardsData = Record<BoardKey, Standing[]>;

// $10,000 monthly Stake leaderboard, paid across the top 10.
const STAKE_PRIZES = [
  4000, 2000, 1200, 800, 600, 450, 350, 250, 200, 150,
];

const CACHE_TTL_MS = 60_000;

// Placeholder standings shown until a real data source is configured via
// STAKE_LEADERBOARD_CSV_URL or STAKE_API_URL in .dev.vars. Remove once live.
const DUMMY_STANDINGS: Array<{ name: string; wagered: number }> = [
  { name: "JuicyWhale", wagered: 412384.22 },
  { name: "SpinDoctor", wagered: 298541.1 },
  { name: "MaxBetMarcus", wagered: 244098.75 },
  { name: "SlotGoblin", wagered: 187420.0 },
  { name: "CartonKing", wagered: 154206.9 },
  { name: "BubbleBandit", wagered: 121889.35 },
  { name: "StrawSniper", wagered: 98454.6 },
  { name: "BlueRush", wagered: 76210.42 },
  { name: "DripFeed", wagered: 54008.18 },
  { name: "LuckyLoaf", wagered: 39754.99 },
];

type CacheEntry = { at: number; data: Standing[] };
const cache = new Map<string, CacheEntry>();

function env(name: string): string | undefined {
  try {
    const value = process.env[name];
    return value && value.trim() !== "" ? value.trim() : undefined;
  } catch {
    return undefined;
  }
}

function currentMonthRange() {
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  return {
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
  };
}

async function cached(key: string, load: () => Promise<Standing[]>): Promise<Standing[]> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;
  try {
    const data = await load();
    cache.set(key, { at: Date.now(), data });
    return data;
  } catch (error) {
    console.error(`leaderboard fetch failed for ${key}:`, error);
    return hit?.data ?? [];
  }
}

function rank(entries: Array<{ name: string; wagered: number }>): Standing[] {
  return entries
    .filter((entry) => Number.isFinite(entry.wagered) && entry.wagered > 0)
    .sort((a, b) => b.wagered - a.wagered)
    .slice(0, STAKE_PRIZES.length)
    .map((entry, index) => ({ ...entry, prize: STAKE_PRIZES[index] ?? 0 }));
}

// Parses a published CSV (e.g. a Google Sheets "publish to web" link) with
// username,wagered columns — the common way Stake affiliate exports are shared.
function parseCsv(text: string): Array<{ name: string; wagered: number }> {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(","))
    .filter((cols) => cols.length >= 2)
    .map((cols) => ({
      name: cols[0].trim().replace(/^"|"$/g, ""),
      wagered: Number(cols[1].replace(/[^0-9.]/g, "")),
    }))
    .filter((entry) => entry.name && entry.name.toLowerCase() !== "username");
}

async function fetchStakeStandings(): Promise<Standing[]> {
  const csvUrl = env("STAKE_LEADERBOARD_CSV_URL");
  const apiUrl = env("STAKE_API_URL");

  if (csvUrl) {
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error(`Stake CSV ${response.status}`);
    return rank(parseCsv(await response.text()));
  }

  if (apiUrl) {
    const { start, end } = currentMonthRange();
    const url = new URL(apiUrl);
    if (!url.searchParams.has("startDate")) url.searchParams.set("startDate", start);
    if (!url.searchParams.has("endDate")) url.searchParams.set("endDate", end);

    const headers: Record<string, string> = { accept: "application/json" };
    const token = env("STAKE_API_TOKEN");
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`Stake API ${response.status}`);

    const payload = (await response.json()) as unknown;
    const list = Array.isArray(payload)
      ? payload
      : ((payload as { data?: unknown[] })?.data ??
        (payload as { leaderboard?: unknown[] })?.leaderboard ??
        []);
    if (!Array.isArray(list)) return [];

    return rank(
      list.map((entry) => {
        const item = entry as { username?: string; name?: string; wagered?: number | string };
        return {
          name: item.username ?? item.name ?? "player",
          wagered: Number(item.wagered ?? 0),
        };
      }),
    );
  }

  return rank(DUMMY_STANDINGS);
}

export async function getBoardsData(): Promise<BoardsData> {
  const { start } = currentMonthRange();
  const stake = await cached(`stake:${start}`, fetchStakeStandings);
  return { stake };
}
