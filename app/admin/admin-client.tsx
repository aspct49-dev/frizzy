"use client";

import { useRef, useState } from "react";
import type { ChallengeRow, ClaimRow } from "../lib/db";

type Tab = "claims" | "challenges";
type ClaimFilter = "all" | "pending" | "claimed";

/**
 * Fixed locale and timezone. This table is rendered on the server and
 * hydrated in the browser, so anything that reads the viewer's locale or
 * timezone would produce a hydration mismatch -- and UTC is the least
 * ambiguous thing to show someone reconciling payouts anyway.
 */
const formatDate = (iso: string) =>
  `${new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  })} UTC`;

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

const EMPTY_FORM = {
  name: "",
  target: "",
  minBet: "",
  prize: "",
  provider: "",
};

export function AdminClient({
  username,
  databaseReady,
  initialClaims,
  initialChallenges,
  loadError,
}: {
  username: string;
  databaseReady: boolean;
  initialClaims: ClaimRow[];
  initialChallenges: ChallengeRow[];
  loadError: string | null;
}) {
  const [tab, setTab] = useState<Tab>("claims");

  // Seeded by the server component, so there is no on-mount fetch. Refresh and
  // the mutations below keep it current from there.
  const [claims, setClaims] = useState<ClaimRow[]>(initialClaims);
  const [challenges, setChallenges] = useState<ChallengeRow[]>(initialChallenges);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(loadError);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<ClaimFilter>("all");

  const [form, setForm] = useState(EMPTY_FORM);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [winners, setWinners] = useState<Record<string, string>>({});
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    if (!databaseReady || refreshing) return;
    setRefreshing(true);
    try {
      const [claimsRes, challengesRes] = await Promise.all([
        fetch("/api/admin/claims"),
        fetch("/api/admin/challenges"),
      ]);
      if (!claimsRes.ok || !challengesRes.ok) {
        const failed = !claimsRes.ok ? claimsRes : challengesRes;
        const data = (await failed.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Could not load data");
      }
      const claimsData = (await claimsRes.json()) as { claims: ClaimRow[] };
      const challengesData = (await challengesRes.json()) as { challenges: ChallengeRow[] };
      setClaims(claimsData.claims);
      setChallenges(challengesData.challenges);
      // Cleared only on success, so a failure stays on screen until a
      // subsequent load actually works.
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load data");
    } finally {
      setRefreshing(false);
    }
  };

  const toggleClaim = async (claim: ClaimRow) => {
    const next = claim.status === "claimed" ? "pending" : "claimed";
    setBusy(claim.id);
    try {
      const data = (await postJson("/api/admin/claims/mark", {
        id: claim.id,
        status: next,
      })) as { claim?: ClaimRow };
      if (data.claim) {
        setClaims((current) => current.map((c) => (c.id === claim.id ? data.claim! : c)));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update claim");
    } finally {
      setBusy(null);
    }
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    setFormError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body });
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      setImageUrl(data.url);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const createChallenge = async () => {
    if (!form.name.trim()) return setFormError("Give the challenge a name.");
    if (!imageUrl) return setFormError("Upload an image for the challenge.");
    setCreating(true);
    setFormError(null);
    try {
      const data = (await postJson("/api/admin/challenges", {
        ...form,
        imageUrl,
      })) as { challenge?: ChallengeRow };
      if (data.challenge) setChallenges((current) => [data.challenge!, ...current]);
      setForm(EMPTY_FORM);
      setImageUrl("");
      if (fileInput.current) fileInput.current.value = "";
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Could not create challenge");
    } finally {
      setCreating(false);
    }
  };

  const markChallenge = async (challenge: ChallengeRow) => {
    const next = challenge.status === "completed" ? "active" : "completed";
    setBusy(challenge.id);
    try {
      const data = (await postJson("/api/admin/challenges/mark", {
        id: challenge.id,
        status: next,
        completedBy: winners[challenge.id] ?? "",
      })) as { challenge?: ChallengeRow };
      if (data.challenge) {
        setChallenges((current) =>
          current.map((c) => (c.id === challenge.id ? data.challenge! : c)),
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update challenge");
    } finally {
      setBusy(null);
    }
  };

  const removeChallenge = async (challenge: ChallengeRow) => {
    if (!window.confirm(`Delete "${challenge.name}"? This cannot be undone.`)) return;
    setBusy(challenge.id);
    try {
      await postJson("/api/admin/challenges/delete", { id: challenge.id });
      setChallenges((current) => current.filter((c) => c.id !== challenge.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete challenge");
    } finally {
      setBusy(null);
    }
  };

  const visibleClaims = claims.filter((claim) =>
    filter === "all" ? true : claim.status === filter,
  );
  const pendingCount = claims.filter((claim) => claim.status === "pending").length;

  return (
    <main>
      <section className="adminSection">
        <div className="adminHead">
          <div>
            <span className="adminBadge">Staff Only</span>
            <h1 className="adminTitle">Admin Panel</h1>
            <p className="adminHint">
              Signed in as <strong>{username}</strong>
            </p>
          </div>
          <button
            className="adminRefresh"
            type="button"
            disabled={refreshing || !databaseReady}
            onClick={() => void refresh()}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {!databaseReady && (
          <p className="claimError">
            No database is configured, so there is nothing to show yet. Set
            <code> POSTGRES_URL </code> and redeploy.
          </p>
        )}
        {error && <p className="claimError">{error}</p>}

        <div className="adminTabs" role="tablist">
          <button
            className={tab === "claims" ? "active" : ""}
            role="tab"
            aria-selected={tab === "claims"}
            type="button"
            onClick={() => setTab("claims")}
          >
            Claims
            {pendingCount > 0 && <span className="adminPill">{pendingCount}</span>}
          </button>
          <button
            className={tab === "challenges" ? "active" : ""}
            role="tab"
            aria-selected={tab === "challenges"}
            type="button"
            onClick={() => setTab("challenges")}
          >
            Challenges
          </button>
        </div>

        {tab === "claims" && (
          <>
            <div className="adminFilters">
              {(["all", "pending", "claimed"] as ClaimFilter[]).map((value) => (
                <button
                  className={filter === value ? "active" : ""}
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                >
                  {value[0].toUpperCase()}
                  {value.slice(1)}
                </button>
              ))}
            </div>

            {visibleClaims.length === 0 ? (
              <p className="adminEmpty">No claims here yet.</p>
            ) : (
              <div className="adminTableWrap">
                <table className="adminTable">
                  <thead>
                    <tr>
                      <th>Discord</th>
                      <th>Stake username</th>
                      <th>Submitted</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {visibleClaims.map((claim) => (
                      <tr key={claim.id}>
                        <td>
                          <div className="adminUser">
                            {claim.avatarUrl && (
                              <img className="adminAvatar" src={claim.avatarUrl} alt="" />
                            )}
                            <div>
                              <strong>{claim.discordUsername}</strong>
                              <span className="adminId">{claim.discordId}</span>
                            </div>
                          </div>
                        </td>
                        <td className="adminMono">{claim.stakeUsername}</td>
                        <td className="adminMuted">{formatDate(claim.createdAt)}</td>
                        <td>
                          <span className={`adminStatus ${claim.status}`}>{claim.status}</span>
                        </td>
                        <td className="adminActions">
                          <button
                            className="adminButton"
                            type="button"
                            disabled={busy === claim.id}
                            onClick={() => void toggleClaim(claim)}
                          >
                            {claim.status === "claimed" ? "Undo" : "Mark claimed"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === "challenges" && (
          <>
            <div className="adminPanel">
              <h2 className="adminPanelTitle">Add a challenge</h2>
              {formError && <p className="claimError">{formError}</p>}

              <div className="adminFormGrid">
                <label className="claimField adminWide">
                  <span>Challenge name *</span>
                  <input
                    type="text"
                    value={form.name}
                    maxLength={80}
                    placeholder="Sugar Rift 1K"
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                  />
                </label>

                <label className="claimField">
                  <span>Target multiplier</span>
                  <input
                    type="text"
                    value={form.target}
                    maxLength={20}
                    placeholder="2,500x"
                    onChange={(event) => setForm({ ...form, target: event.target.value })}
                  />
                </label>

                <label className="claimField">
                  <span>Min bet</span>
                  <input
                    type="text"
                    value={form.minBet}
                    maxLength={20}
                    placeholder="0.20"
                    onChange={(event) => setForm({ ...form, minBet: event.target.value })}
                  />
                </label>

                <label className="claimField">
                  <span>Prize ($)</span>
                  <input
                    type="text"
                    value={form.prize}
                    maxLength={20}
                    placeholder="150.00"
                    onChange={(event) => setForm({ ...form, prize: event.target.value })}
                  />
                </label>

                <label className="claimField">
                  <span>Provider</span>
                  <input
                    type="text"
                    value={form.provider}
                    maxLength={40}
                    placeholder="Colorful Play"
                    onChange={(event) => setForm({ ...form, provider: event.target.value })}
                  />
                </label>

                <div className="claimField adminWide">
                  <span>Image *</span>
                  <div className="adminUpload">
                    <input
                      ref={fileInput}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadImage(file);
                      }}
                    />
                    {uploading && <span className="adminHint">Uploading…</span>}
                    {imageUrl && !uploading && (
                      <img className="adminPreview" src={imageUrl} alt="Challenge preview" />
                    )}
                  </div>
                </div>
              </div>

              <button
                className="perkAction claimSubmit"
                type="button"
                disabled={creating || uploading}
                onClick={() => void createChallenge()}
              >
                {creating ? "Adding…" : "Add Challenge"}
              </button>
            </div>

            {challenges.length === 0 ? (
              <p className="adminEmpty">No challenges yet.</p>
            ) : (
              <div className="adminChalGrid">
                {challenges.map((challenge) => (
                  <article className={`adminChal ${challenge.status}`} key={challenge.id}>
                    <img className="adminChalArt" src={challenge.imageUrl} alt="" />
                    <div className="adminChalBody">
                      <h3>{challenge.name}</h3>
                      <p className="adminMuted">
                        {challenge.target ? `${challenge.target}` : "No target"}
                        {challenge.minBet ? ` · min $${challenge.minBet}` : ""}
                        {challenge.prize ? ` · $${challenge.prize}` : ""}
                      </p>
                      {challenge.provider && (
                        <p className="adminMuted">{challenge.provider}</p>
                      )}
                      <span className={`adminStatus ${challenge.status}`}>
                        {challenge.status}
                      </span>
                      {challenge.status === "completed" && challenge.completedBy && (
                        <p className="adminMuted">Won by {challenge.completedBy}</p>
                      )}

                      {challenge.status === "active" && (
                        <input
                          className="adminWinner"
                          type="text"
                          placeholder="Winner (optional)"
                          value={winners[challenge.id] ?? ""}
                          maxLength={40}
                          onChange={(event) =>
                            setWinners({ ...winners, [challenge.id]: event.target.value })
                          }
                        />
                      )}

                      <div className="adminActions">
                        <button
                          className="adminButton"
                          type="button"
                          disabled={busy === challenge.id}
                          onClick={() => void markChallenge(challenge)}
                        >
                          {challenge.status === "completed" ? "Reopen" : "Mark complete"}
                        </button>
                        <button
                          className="adminButton danger"
                          type="button"
                          disabled={busy === challenge.id}
                          onClick={() => void removeChallenge(challenge)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
