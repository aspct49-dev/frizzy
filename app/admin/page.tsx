import type { Metadata } from "next";
import { FaDiscord } from "react-icons/fa";
import { adminConfigured, currentUser, isAdmin } from "../lib/admin";
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
              <p className="claimError">
                This account is not an admin.
                {!adminConfigured() && " No admins are configured yet."}
              </p>
              <p className="adminHint">
                Signed in as <strong>{user.username}</strong> — Discord ID{" "}
                <code>{user.id}</code>
              </p>
              {!adminConfigured() && (
                <p className="adminHint">
                  Add that ID to the <code>ADMIN_DISCORD_IDS</code> environment
                  variable to grant access.
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
