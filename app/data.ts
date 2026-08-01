export type BoardKey = "stake";
export type BoardPeriod = "week" | "biweek" | "month";

export type BoardConfig = {
  key: BoardKey;
  name: string;
  logo: string;
  logoAlt: string;
  code: string;
  url: string;
  pool: string;
  paidPlaces: number;
  period: BoardPeriod;
};

export const boards: Record<BoardKey, BoardConfig> = {
  stake: {
    key: "stake",
    name: "Stake",
    logo: "/stake-logo-white.png",
    logoAlt: "Stake",
    code: "FRIZZ",
    url: "https://stake.com/?c=FRIZZ",
    pool: "$10,000",
    paidPlaces: 10,
    period: "month",
  },
};

export const STAKE_US_URL = "https://stake.us/?c=FRIZZ";

export const DISCORD_URL = "https://discord.com/invite/kcHCKuJVjG";

export const PLACEHOLDER_NAME = "This could be you";

export function maskedName(name: string) {
  if (name === PLACEHOLDER_NAME) return name;
  return `${name.charAt(0).toUpperCase()}${"*".repeat(Math.max(name.length - 1, 5))}`;
}

export function badgeFor(name: string) {
  if (name === PLACEHOLDER_NAME) return "??";
  return name.slice(0, 2).toUpperCase();
}

export function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
