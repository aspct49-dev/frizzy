"use client";

import { useEffect, useState } from "react";
import { FaDiscord } from "react-icons/fa";
import { boards } from "../data";
import { CLAIM_COOLDOWN_SECONDS } from "../lib/claim";
import type { SessionUser } from "../lib/session";

// Side-hugging bubbles, same mechanic as the leaderboard hero.
const SIDE_BUBBLES: Array<[number, number, number, number, number, number]> = [
  [1, 3, 38, 13, 0, 4.2],
  [3, 7, 18, 11, 4, 3.6],
  [5, 11, 26, 15, 8, 4.8],
  [2, 92, 22, 12, 2, 4.0],
  [1, 95, 34, 14, 1, 4.6],
  [5, 89, 24, 11, 7, 3.8],
];

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: "Discord login isn't configured yet.",
  no_code: "Discord didn't send a login code — try again.",
  bad_state: "That login link expired. Please try again.",
  token_exchange: "Discord rejected the login. Try again.",
  profile: "Couldn't read your Discord profile. Try again.",
  auth_failed: "Something went wrong signing you in. Try again.",
};

/**
 * Wall clock that only starts ticking in the browser. Starting at null keeps
 * the server and first client render identical (no hydration mismatch), and
 * means the countdown runs off the viewer's clock rather than a server-side
 * duration that's stale on arrival.
 */
function useNow(active: boolean) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  return now;
}

const pad = (value: number) => String(value).padStart(2, "0");

export function ClaimClient({
  user,
  cooldownExpiresAt,
  configured,
  loginError,
}: {
  user: SessionUser | null;
  cooldownExpiresAt: number;
  configured: boolean;
  loginError: string | null;
}) {
  const [stakeUsername, setStakeUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState(cooldownExpiresAt);

  const now = useNow(expiresAt > 0);
  // Before the clock starts, trust the server's word that a cooldown exists.
  const remaining = now === null ? (expiresAt > 0 ? 1 : 0) : Math.max(0, expiresAt - now);
  const onCooldown = remaining > 0;

  const error = submitError ?? (loginError ? ERROR_MESSAGES[loginError] ?? "Login failed. Try again." : null);

  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);

  const submit = async () => {
    const value = stakeUsername.trim();
    if (!value || busy) return;
    setBusy(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stakeUsername: value }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        cooldownRemaining?: number;
      };
      if (response.ok && data.ok) {
        setClaimed(true);
        setExpiresAt(Date.now() + CLAIM_COOLDOWN_SECONDS * 1000);
      } else {
        setSubmitError(data.error ?? "Could not submit claim, try again.");
        if (typeof data.cooldownRemaining === "number") {
          setExpiresAt(Date.now() + data.cooldownRemaining);
        }
      }
    } catch {
      setSubmitError("Could not reach the server, try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main>
      <section className="claimSection">
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

        <span className="claimBadge">Affiliate Rewards</span>
        <h1 className="claimTitle">
          Claim Your <span>100% Affiliate Money Back</span>
        </h1>
        <p className="claimSub">
          Log in with Discord and drop your Stake username. Play under code{" "}
          <strong>{boards.stake.code}</strong>{" "}
          and we&apos;ll send your affiliate money back straight to you.
        </p>

        <div className="claimPanel">
          {error && <p className="claimError">{error}</p>}

          {!configured && (
            <p className="claimError">Discord login isn&apos;t configured on this deployment yet.</p>
          )}

          {configured && !user && (
            <>
              <p className="claimPrompt">Sign in to submit a claim.</p>
              <a className="discordButton" href="/api/auth/discord">
                <FaDiscord aria-hidden="true" /> Login with Discord
              </a>
            </>
          )}

          {user && (
            <>
              <div className="claimUser">
                <img className="claimAvatar" src={user.avatarUrl} alt="" />
                <div className="claimUserMeta">
                  <span className="claimUserLabel">Signed in as</span>
                  <strong>{user.username}</strong>
                </div>
                <form action="/api/auth/logout" method="post">
                  <button className="claimLogout" type="submit">
                    Log out
                  </button>
                </form>
              </div>

              {claimed && <p className="claimSuccess">Claim submitted — the team has been notified.</p>}

              {!claimed && onCooldown && (
                <div className="claimCooldown">
                  <span className="claimCooldownLabel">Next claim in</span>
                  <div className="claimTimer">
                    <span>{pad(hours)}</span>
                    <em>:</em>
                    <span>{pad(minutes)}</span>
                    <em>:</em>
                    <span>{pad(seconds)}</span>
                  </div>
                </div>
              )}

              {!claimed && !onCooldown && (
                <div className="claimForm">
                  <label className="claimField">
                    <span>Stake username</span>
                    <input
                      type="text"
                      value={stakeUsername}
                      onChange={(event) => setStakeUsername(event.target.value)}
                      onKeyDown={(event) => event.key === "Enter" && submit()}
                      placeholder="Your Stake username"
                      maxLength={40}
                    />
                  </label>
                  <button
                    className="perkAction claimSubmit"
                    type="button"
                    onClick={submit}
                    disabled={busy || !stakeUsername.trim()}
                  >
                    {busy ? "Submitting…" : "Submit Claim"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <p className="claimNote">
          Claims are reviewed manually against your wagers under code {boards.stake.code}.
        </p>
      </section>
    </main>
  );
}
