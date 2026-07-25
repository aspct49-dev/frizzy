"use client";

import { RaceCountdownBoxes, useRaceClock } from "../components/month-countdown";
import { badgeFor, boards, maskedName, money } from "../data";
import type { BoardsData } from "../lib/leaderboards";

function detailedMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const placeLabel = ["1st", "2nd", "3rd"];

// Side-hugging bubble field: [sprite, left %, size px, rise s, delay s, sway s]
const SIDE_BUBBLES: Array<[number, number, number, number, number, number]> = [
  [1, 2, 42, 13, 0, 4.2],
  [3, 5, 20, 11, 4, 3.6],
  [5, 8, 30, 15, 8, 4.8],
  [2, 4, 24, 12, 2, 4.0],
  [3, 96, 18, 12, 5, 3.4],
  [1, 93, 38, 14, 1, 4.6],
  [5, 90, 26, 11, 7, 3.8],
  [2, 95, 32, 15, 10, 4.4],
];

export function LeaderboardClient({ standings }: { standings: BoardsData }) {
  const board = boards.stake;
  const race = useRaceClock(board.period);
  const rankedPlayers = standings.stake ?? [];
  const topThree = rankedPlayers.slice(0, 3);

  return (
    <main>
      <section className="lbHero">
        <div className="lbBubbles" aria-hidden="true">
          {SIDE_BUBBLES.map(([sprite, left, size, rise, delay, sway], index) => (
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
              <img src={`/bubble-${sprite}.png`} alt="" style={{ animationDuration: `${sway}s` }} />
            </span>
          ))}
        </div>
        <img className="casinoLogo" src={board.logo} alt={board.logoAlt} />
        <h1 className="lbTitle"><span>{board.pool}</span> Monthly Leaderboard</h1>
        <p className="lbSub">Compete against other players on {board.name} under code <strong>{board.code}</strong> and win big rewards!</p>
        <div className="codeRow">
          <span className="codePill">Code: <strong>{board.code}</strong></span>
          <a className="primaryAction" href={board.url} target="_blank" rel="noreferrer">Visit {board.name} ↗</a>
        </div>

        {topThree.length === 3 ? (
          <div className="podium" aria-label="Top three players this month">
            {[topThree[1], topThree[0], topThree[2]].map((player, index) => {
              const place = index === 0 ? 2 : index === 1 ? 1 : 3;
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
                        <img className="rankBadge" src={`/medal-${place}.png?v=2`} alt={placeLabel[place - 1]} />
                      </div>
                      <h2>{maskedName(player.name)}</h2>
                      <span className="podiumLabel">Wagered</span>
                      <span className="wagerPill">{detailedMoney(player.wagered)}</span>
                    </div>
                    <div className="podiumPrize">{money(player.prize)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="monthlyResetState">
            Standings for {race?.label ?? "this month"} will appear here as wagers are recorded on {board.name}.
          </div>
        )}

        <RaceCountdownBoxes period={board.period} />
      </section>

      <section className="leaderboardSection">
        <div className="sectionHeading" data-reveal="heading">
          <div>
            <p className="eyebrow">{race?.label ?? "Current month"} race | {board.name} | Code {board.code}</p>
            <h2>Wager Leaderboard</h2>
          </div>
          <span className="verifiedNote">Resets every month | Top {board.paidPlaces} paid</span>
        </div>
        <div className="leaderboardTable" role="table" aria-label={`Frizzybets ${board.name} leaderboard`} tabIndex={0}>
          <div className="tableRow tableHead" role="row">
            <span>Rank</span><span>User</span><span>Wagered</span><span>Reward</span>
          </div>
          {rankedPlayers.map((player, index) => (
            <div className="tableRow" role="row" key={player.name} data-reveal={index < 8 ? "row" : undefined}>
              {index < 3 ? (
                <img className="rankMedal" src={`/medal-${index + 1}.png?v=2`} alt={`Rank ${index + 1}`} />
              ) : (
                <span className="rankChip">{index + 1}</span>
              )}
              <div className="tablePlayer"><span className="miniBadge">{badgeFor(player.name)}</span><strong>{maskedName(player.name)}</strong></div>
              <strong className="wagered">{detailedMoney(player.wagered)}</strong>
              <strong className="prize">{player.prize > 0 ? money(player.prize) : "-"}</strong>
            </div>
          ))}
          {rankedPlayers.length === 0 && (
            <div className="emptyState">
              No wagers recorded for {race?.label ?? "the new race"} yet.
            </div>
          )}
        </div>
        <p className="maskNote">Usernames are masked for privacy. Standings update as wagers are processed.</p>
      </section>
    </main>
  );
}
