import { PLACEHOLDER_NAME, type BoardKey } from "../data";

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

// Tops up a partial standings list to the full paid-places count with an
// open invitation rather than a blank state — prizes stay real, only the
// name and wagered amount are filler.
function fillWithPlaceholders(standings: Standing[]): Standing[] {
  if (standings.length >= STAKE_PRIZES.length) return standings;
  const filler = STAKE_PRIZES.slice(standings.length).map((prize) => ({
    name: PLACEHOLDER_NAME,
    wagered: 0,
    prize,
  }));
  return [...standings, ...filler];
}

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

// Splits one CSV line into cells, respecting double-quoted fields (Stake's
// affiliate export quotes any wagered value that contains a thousands
// comma, e.g. "$51,141.67" — a naive line.split(",") would break that in two).
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

// Parses a published CSV (e.g. a Google Sheets "publish to web" link, or a
// Stake affiliate leaderboard export). Column order doesn't matter — the
// name/wagered columns are found by header name, falling back to the first
// two columns for a bare "username,wagered" sheet with no matching header.
function parseCsv(text: string): Array<{ name: string; wagered: number }> {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length < 2) return [];

  const header = splitCsvLine(lines[0]).map((cell) => cell.trim().toLowerCase());
  const nameCol = header.findIndex((cell) => ["user_name", "username", "name"].includes(cell));
  const wageredCol = header.findIndex((cell) => ["wagered", "wager", "amount"].includes(cell));
  const nameIndex = nameCol >= 0 ? nameCol : 0;
  const wageredIndex = wageredCol >= 0 ? wageredCol : 1;

  return lines
    .slice(1)
    .map((line) => splitCsvLine(line))
    .filter((cols) => cols.length > Math.max(nameIndex, wageredIndex))
    .map((cols) => ({
      name: (cols[nameIndex] ?? "").trim().replace(/^"|"$/g, ""),
      wagered: Number((cols[wageredIndex] ?? "").replace(/[^0-9.]/g, "")),
    }))
    .filter((entry) => entry.name);
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

  return [];
}

export async function getBoardsData(): Promise<BoardsData> {
  const { start } = currentMonthRange();
  const stake = await cached(`stake:${start}`, fetchStakeStandings);
  return { stake: fillWithPlaceholders(stake) };
}
