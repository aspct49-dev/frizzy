import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";

const PORT = 3411;
const BASE_URL = `http://localhost:${PORT}`;

let server;

async function waitForServer(timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(BASE_URL);
      if (response.ok || response.status < 500) return;
    } catch {
      // not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not become ready on ${BASE_URL} within ${timeoutMs}ms`);
}

before(async () => {
  server = spawn("node", ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], {
    cwd: new URL("..", import.meta.url),
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "production" },
  });
  server.stdout?.on("data", () => {});
  server.stderr?.on("data", () => {});
  await waitForServer();
});

after(() => {
  server?.kill();
});

async function htmlFor(path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { accept: "text/html" },
  });
  assert.equal(response.status, 200, `${path} should render successfully`);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  return response.text();
}

test("home is a focused Frizzybets hub", async () => {
  const html = await htmlFor("/");
  assert.match(html, /Leaderboards\. Bonuses\. Live with Frizzybets\./i);
  assert.match(html, /\$10,000.*Leaderboard/is);
  assert.match(html, /Watch live/i);
  assert.match(html, /US Players Only/i);
  assert.match(html, /International Players/i);
  assert.match(html, /25SC/);
  assert.match(html, /3\.5% rakeback/);
  assert.match(html, /YouTube/);
  assert.match(html, /code FRIZZ/);
  assert.match(html, /stake\.com\/\?c=FRIZZ/i);
  assert.match(html, /stake\.us\/\?c=FRIZZ/i);
  assert.match(html, /href="\/leaderboard"/i);
  assert.match(html, /href="\/#videos"/i);
  assert.match(html, /kick\.com\/frizzybets/i);
  assert.match(html, /twitch\.tv\/frizzable/i);
  assert.match(html, /youtube\.com\/@frizzybets/i);
  assert.doesNotMatch(html, /Drey|Roobet|Packy|DaddySkins/i);
});

test("the midnight-juice theme and social footer are present", async () => {
  const [styles, footer, waveFront, waveBack] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/components/site-footer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/wave-front.webp", import.meta.url)),
    readFile(new URL("../public/wave-back.webp", import.meta.url)),
  ]);

  assert.match(styles, /\.homeHero/);
  assert.match(styles, /bubbleRise/);
  assert.match(styles, /bubbleSway/);
  assert.match(styles, /waveScrollFront/);
  assert.match(styles, /waveScrollBack/);
  assert.match(styles, /mascotFloat/);
  assert.match(styles, /glowBreathe/);
  assert.match(styles, /wave-front\.webp/);
  assert.match(styles, /pageRiseIn/);
  assert.match(styles, /podiumFirstIn/);
  assert.match(styles, /countValueIn/);
  assert.match(styles, /motion-pending/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /--background:\s*#102135/);
  assert.match(styles, /--font-display:\s*"Baloo 2"/);
  assert.match(styles, /fonts\.googleapis\.com/);
  assert.match(footer, /Keep Up With Frizzy/);
  assert.match(footer, /SocialLinks footer/);
  assert.ok(waveFront.byteLength > 10_000);
  assert.ok(waveBack.byteLength > 10_000);
});

test("the leaderboard has its own page", async () => {
  const leaderboard = await htmlFor("/leaderboard");

  assert.match(leaderboard, /Wager leaderboard/i);
  assert.match(leaderboard, /monthly leaderboard/i);
  assert.match(leaderboard, /Stake/i);
  assert.match(leaderboard, /Resets every month/i);
  assert.match(leaderboard, /Top.{0,12}10.{0,12}paid/is);
});

test("shared navigation, metadata, and data config are consistent", async () => {
  const [layout, header, packageJson, leaderboards, data, countdown, origin] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/site-header.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/leaderboards.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/month-countdown.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/request-origin.ts", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /SiteHeader/);
  assert.match(layout, /MotionObserver/);
  assert.match(layout, /og\.png/);
  assert.match(layout, /requestOrigin/);
  assert.match(header, /\/leaderboard/);
  assert.match(header, /#videos/);
  assert.match(header, /Claim Bonus/);
  assert.match(packageJson, /"name": "frizzable-site"/);
  assert.match(leaderboards, /4000, 2000, 1200, 800, 600, 450, 350, 250, 200, 150/);
  assert.match(leaderboards, /fetchStakeStandings/);
  assert.match(leaderboards, /STAKE_LEADERBOARD_CSV_URL/);
  assert.match(data, /paidPlaces:\s*10,[\s\S]*period:\s*"month"/);
  assert.match(data, /stake\.us/);
  assert.match(countdown, /countValue/);
  assert.doesNotMatch(leaderboards, /node:fs/);
  assert.doesNotMatch(origin, /x-forwarded-host/);
});
