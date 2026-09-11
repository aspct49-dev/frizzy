import type { Metadata } from "next";
import { boards } from "../data";
import { dbConfigured, listChallenges, type ChallengeRow } from "../lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Challenges",
  description:
    "Hit the target multiplier on these slots under code frizz and claim the prize. New Frizzybets challenges posted regularly.",
  alternates: { canonical: "/challenges" },
  openGraph: {
    title: "Frizzybets Challenges",
    description:
      "Hit the target multiplier on these slots under code frizz and claim the prize.",
    url: "/challenges",
    images: ["/og.png"],
  },
};

const BUBBLES: Array<[number, number, number, number, number, number]> = [
  [1, 3, 38, 13, 0, 4.2],
  [3, 7, 18, 11, 4, 3.6],
  [2, 92, 22, 12, 2, 4.0],
  [1, 95, 34, 14, 1, 4.6],
];

function requirement(challenge: ChallengeRow) {
  const target = challenge.target ? `First to hit ${challenge.target}` : "Open challenge";
  return challenge.minBet ? `${target} with min $${challenge.minBet} bet` : target;
}

export default async function ChallengesPage() {
  let challenges: ChallengeRow[] = [];
  if (dbConfigured()) {
    try {
      challenges = await listChallenges(true);
    } catch (error) {
      console.error("Could not load challenges:", error);
    }
  }

  return (
    <main>
      <section className="chalSection">
        <div className="lbBubbles" aria-hidden="true">
          {BUBBLES.map(([sprite, left, size, rise, delay, sway], index) => (
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

        <span className="chalBadge">Slot Challenges</span>
        <h1 className="chalTitle">
          Hit It, <span>Claim It</span>
        </h1>
        <p className="chalSub">
          Land the target multiplier on any of these under code{" "}
          <strong>{boards.stake.code}</strong>{" "}
          and drop your proof in Discord to collect.
        </p>

        {challenges.length === 0 ? (
          <p className="chalEmpty">
            No challenges live right now — check back soon.
          </p>
        ) : (
          <div className="chalGrid">
            {challenges.map((challenge) => {
              const body = (
                <>
                  <div className="chalArt">
                    <img src={challenge.imageUrl} alt={challenge.name} loading="lazy" />
                    <div className="chalArtOverlay">
                      <h2>{challenge.name}</h2>
                      {challenge.provider && <span>{challenge.provider}</span>}
                    </div>
                  </div>
                  <div className="chalBody">
                    <p className="chalReq">{requirement(challenge)}</p>
                    {challenge.prize && (
                      <p className="chalPrize">
                        <span>Prize</span>
                        <strong>${challenge.prize}</strong>
                      </p>
                    )}
                    {challenge.linkUrl && <span className="chalPlay">Play on Stake →</span>}
                  </div>
                </>
              );

              // A challenge without a link is not clickable, so it stays an
              // article rather than becoming an anchor to nowhere.
              return challenge.linkUrl ? (
                <a
                  className="chalCard chalCardLink"
                  href={challenge.linkUrl}
                  key={challenge.id}
                  target="_blank"
                  rel="noreferrer sponsored"
                >
                  {body}
                </a>
              ) : (
                <article className="chalCard" key={challenge.id}>
                  {body}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
