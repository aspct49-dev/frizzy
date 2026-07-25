import type { Metadata } from "next";
import Link from "next/link";
import { DISCORD_URL, maskedName, money, STAKE_US_URL } from "./data";
import { VideosSection } from "./components/videos-section";
import { getBoardsData } from "./lib/leaderboards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Frizzybets | Stake Leaderboard and Bonuses",
  description:
    "Join Frizzybets' $10,000 monthly Stake leaderboard with code FRIZZ, claim exclusive Stake and Stake.us sign-up bonuses, and watch Frizzybets live.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Frizzybets | Stake Leaderboard and Bonuses",
    description:
      "Compete in Frizzybets' $10,000 monthly Stake leaderboard under code FRIZZ and win your share of the prize pool.",
    url: "/",
    images: ["/og.png"],
  },
};

const ribbonPlaces = [2, 1, 3];

// Deterministic bubble field: [sprite, left %, size px, rise s, delay s, sway s]
const BACK_BUBBLES: Array<[number, number, number, number, number, number]> = [
  [1, 6, 26, 16, 0, 5.2],
  [3, 18, 16, 14, 4, 4.4],
  [5, 31, 22, 17, 8, 5.8],
  [2, 44, 18, 15, 2, 4.8],
  [3, 58, 14, 13, 6, 4.1],
  [1, 71, 24, 18, 10, 5.5],
  [5, 84, 17, 14, 3, 4.6],
  [3, 93, 20, 16, 12, 5.0],
];

const FRONT_BUBBLES: Array<[number, number, number, number, number, number]> = [
  [2, 10, 60, 9, 1, 3.6],
  [4, 24, 74, 11, 5, 4.2],
  [1, 38, 50, 8.5, 3, 3.2],
  [5, 55, 66, 10, 7, 3.9],
  [3, 68, 42, 8, 0, 3.0],
  [1, 80, 70, 11.5, 4, 4.4],
  [2, 91, 54, 9.5, 8, 3.4],
];

function BubbleField({ bubbles, layer }: { bubbles: typeof BACK_BUBBLES; layer: string }) {
  return (
    <div className={`bubbleLayer ${layer}`} aria-hidden="true">
      {bubbles.map(([sprite, left, size, rise, delay, sway], index) => (
        <span
          className="bubble"
          key={index}
          style={{
            left: `${left}%`,
            width: `${size}px`,
            animationDuration: `${rise}s`,
            animationDelay: `${delay}s`,
          }}
        >
          <img
            src={`/bubble-${sprite}.png`}
            alt=""
            style={{ animationDuration: `${sway}s` }}
          />
        </span>
      ))}
    </div>
  );
}

export default async function Home() {
  const { stake } = await getBoardsData();
  const topThree = stake.slice(0, 3);
  const ribbonOrder = topThree.length === 3 ? [topThree[1], topThree[0], topThree[2]] : [];

  return (
    <main>
      <section className="homeHero" aria-labelledby="home-hero-title">
        <div className="heroBackdrop" aria-hidden="true" />
        <BubbleField bubbles={BACK_BUBBLES} layer="bubblesBack" />
        <BubbleField bubbles={FRONT_BUBBLES} layer="bubblesFront" />
        <div className="heroGlow" aria-hidden="true" />
        <div className="heroContent">
          <span className="heroKicker">Official Stake Partner</span>
          <h1 id="home-hero-title" className="heroLogoTitle">
            <img src="/frizzybets-wordmark.png" alt="Frizzybets" />
          </h1>
          <p className="heroTagline">Leaderboards. Bonuses. Live with Frizzybets.</p>
          <p className="heroSummary">
            A $10,000 monthly Stake wager race, exclusive sign-up bonuses, and every stream in one
            place.
          </p>
          <div className="heroActions">
            <Link className="primaryAction juiceAction" href="/leaderboard">View Leaderboard</Link>
            <a className="secondaryAction juiceSecondary" href="https://kick.com/frizzybets" target="_blank" rel="noreferrer">Watch Live</a>
          </div>
        </div>
        <div className="heroMascot" aria-hidden="true">
          <img src="/juicebox-mascot.png" alt="" />
        </div>
        <div className="waveBand waveBack" aria-hidden="true" />
        <div className="waveBand waveFront" aria-hidden="true" />
        <a className="heroScroll" href="#bonuses" aria-label="Scroll to bonuses">
          <span aria-hidden="true" />
          Explore bonuses
        </a>
      </section>

      <div className="band bandBase" id="bonuses">
      <section className="homeSection" aria-label="Frizzybets exclusive bonuses">
        <div className="centerHeading" data-reveal="heading">
          <h2>BONUSES</h2>
          <p className="underCode">Exclusive perks under code FRIZZ</p>
        </div>

        <div className="bonusGrid">
          <article className="bonusCard" data-reveal="card">
            <span className="bonusBadge">US players only</span>
            <div className="bonusLogoWrap">
              <img className="bonusLogo bonusLogoUs" src="/stake-us.webp" alt="Stake.us" />
            </div>
            <p className="bonusDesc">America&apos;s premier social casino experience.</p>
            <div className="bonusBox">
              <span className="bonusBoxLabel">Exclusive Bonus</span>
              <div className="bonusAmountRow">
                <span className="bonusAmount">25SC</span>
                <span className="bonusAmountSuffix">Free</span>
              </div>
              <ul className="bonusFeatures">
                <li>1SC Daily</li>
                <li>3.5% rakeback</li>
                <li>Leaderboard Access</li>
                <li>No deposit required</li>
              </ul>
            </div>
            <a className="perkAction bonusCta" href={STAKE_US_URL} target="_blank" rel="noreferrer">
              Claim 25SC Free Now ↗
            </a>
            <p className="bonusNote">1SC can be redeemed for the equivalent of $1 USD</p>
          </article>

          <article className="bonusCard" data-reveal="card">
            <span className="bonusBadge">International players</span>
            <div className="bonusLogoWrap">
              <img className="bonusLogo" src="/stake-logo-white.png" alt="Stake" />
            </div>
            <p className="bonusDesc">The world&apos;s leading crypto casino.</p>
            <div className="bonusBox">
              <span className="bonusBoxLabel">Exclusive Bonus</span>
              <div className="bonusAmountRow">
                <span className="bonusAmount">$50</span>
                <span className="bonusAmountSuffix">Bonus</span>
              </div>
              <ul className="bonusFeatures">
                <li>3.5% rakeback</li>
                <li>Leaderboard Access</li>
                <li>Requires $50+ deposit</li>
                <li>Requires $1,000+ wagered within 3 days of sign up</li>
              </ul>
            </div>
            <a className="perkAction bonusCta" href={DISCORD_URL} target="_blank" rel="noreferrer">
              Claim $50 Bonus ↗
            </a>
            <p className="bonusNote">
              Create a{" "}
              <a href={DISCORD_URL} target="_blank" rel="noreferrer">
                Discord ticket
              </a>{" "}
              to claim the sign up bonus
            </p>
          </article>
        </div>
      </section>
      </div>

      <div className="band bandDeep">
        <VideosSection />
      </div>

      <div className="band bandBase bandPromo">
      <section className="promoBanner" aria-label="Current Stake leaderboard preview" data-reveal="section">
        <div className="promoCopy">
          <h2><span>$10,000</span> Leaderboard</h2>
          <p>Climb to the top of the Stake leaderboard &amp; win crazy prizes!</p>
          <Link className="primaryAction" href="/leaderboard">View Leaderboard</Link>
        </div>
        {ribbonOrder.length === 3 ? (
          <div className="promoPodium">
            {ribbonOrder.map((player, index) => {
              const place = ribbonPlaces[index];
              return (
                <div className={`podiumSlot place${place}`} key={player.name}>
                  <div className="podiumCard">
                    <img
                      className="frameArt"
                      src={place === 1 ? "/frame-crown.png" : "/frame-plain.png"}
                      alt=""
                      aria-hidden="true"
                    />
                    <div className="podiumInner">
                      <div className="podiumAvatar">
                        <span className="avatarRing">
                          <img src="/juicebox-face.png" alt="" />
                        </span>
                        <img className="rankBadge" src={`/medal-${place}.png?v=2`} alt={`Rank ${place}`} />
                      </div>
                      <h2>{maskedName(player.name)}</h2>
                      <span className="podiumLabel">Wagered</span>
                      <span className="wagerPill">{money(player.wagered)}</span>
                    </div>
                    <div className="podiumPrize">{money(player.prize)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="promoEmpty">Standings appear here as this month&apos;s wagers are recorded.</div>
        )}
      </section>
      </div>
    </main>
  );
}
