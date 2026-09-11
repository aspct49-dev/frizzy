import type { Metadata } from "next";
import { FaDiscord } from "react-icons/fa";
import { adminIds, currentUser, isAdmin } from "../lib/admin";
import {
  dbConfigured,
  listChallenges,
  listClaims,
  type ChallengeRow,
  type ClaimRow,
} from "../lib/db";
import { AdminClient } from "./admin-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  // Never let the control panel into search results.
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const user = await currentUser();
  const admin = isAdmin(user);
  const adminCount = adminIds().length;

  // Anyone who is not an admin gets a shell with no data in it at all -- the
  // claims and challenges are fetched client-side from routes that check the
  // allowlist again, so nothing sensitive reaches the page payload here.
  if (!admin) {
    return (
      <main>
        <section className="adminSection">
          <span className="adminBadge">Staff Only</span>
          <h1 className="adminTitle">Admin Panel</h1>
          {!user ? (
            <div className="adminGate">
              <p>Sign in with Discord to continue.</p>
              <a className="discordButton" href="/api/auth/discord">
                <FaDiscord aria-hidden="true" /> Login with Discord
              </a>
            </div>
          ) : (
            <div className="adminGate">
              <p className="claimError">This account is not an admin.</p>
              <p className="adminHint">
                Signed in as <strong>{user.username}</strong>
              </p>
              <p className="adminHint">
                Your Discord ID is <code>{user.id}</code>
              </p>
              {/* The count, never the IDs themselves. It is the one fact that
                  separates "the variable never reached this deployment" from
                  "it did, but your ID is not in it" -- which are fixed very
                  differently. */}
              {adminCount === 0 ? (
                <p className="adminHint">
                  This deployment sees <strong>no</strong>{" "}
                  <code>ADMIN_DISCORD_IDS</code> value. Add the ID above to that
                  environment variable, then redeploy — env changes only reach a
                  new deployment.
                </p>
              ) : (
                <p className="adminHint">
                  This deployment has {adminCount} admin ID
                  {adminCount === 1 ? "" : "s"} configured, and the ID above is
                  not one of them. Check it was copied from{" "}
                  <em>Copy User ID</em> (your account) and not a server or
                  application ID.
                </p>
              )}
            </div>
          )}
        </section>
      </main>
    );
  }

  // Loaded here rather than from an effect in the browser: this component
  // already established the viewer is an admin, so the data can be rendered on
  // first paint instead of after a round trip.
  let claims: ClaimRow[] = [];
  let challenges: ChallengeRow[] = [];
  let loadError: string | null = null;

  if (dbConfigured()) {
    try {
      [claims, challenges] = await Promise.all([listClaims(), listChallenges(false)]);
    } catch (error) {
      console.error("Admin load failed:", error);
      loadError = "Could not read the database. Check POSTGRES_URL.";
    }
  }

  return (
    <AdminClient
      username={user!.username}
      databaseReady={dbConfigured()}
      initialClaims={claims}
      initialChallenges={challenges}
      loadError={loadError}
    />
  );
}
