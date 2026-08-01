import type { Metadata } from "next";
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
  const standings = await getBoardsData();
  return <LeaderboardClient standings={standings} />;
}
