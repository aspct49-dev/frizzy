import type { Metadata } from "next";
import { badgeFor, maskedName } from "../data";
import { getBoardsData } from "../lib/leaderboards";
import { LeaderboardClient } from "./leaderboard-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "Live standings for Frizzybets' $10,000 monthly Stake leaderboard under code frizz. Updated every 60 seconds.",
  alternates: { canonical: "/leaderboard" },
  openGraph: {
    title: "Frizzybets $10,000 Stake Leaderboard",
    description:
      "Live standings for Frizzybets' $10,000 monthly Stake wager race under code frizz.",
    url: "/leaderboard",
    images: ["/og.png"],
  },
};

export default async function LeaderboardPage() {
  const { stake } = await getBoardsData();
  // Mask on the server so the real username never crosses into the client
  // bundle's hydration payload — only the already-masked text + badge do.
  const standings = {
    stake: stake.map((player) => ({
      ...player,
      badge: badgeFor(player.name),
      name: maskedName(player.name),
    })),
  };
  return <LeaderboardClient standings={standings} />;
}
