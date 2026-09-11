"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/leaderboard", label: "Leaderboard", badge: "$10K" },
  { href: "/#bonuses", label: "Bonuses" },
  { href: "/challenges", label: "Challenges" },
  { href: "/claim", label: "Claim" },
  { href: "/#videos", label: "Videos" },
];

export function SiteHeader({
  signedIn = false,
  isAdmin = false,
}: {
  signedIn?: boolean;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Admins get the panel in the nav; everyone else never sees that it exists.
  const links = isAdmin
    ? [...navigation, { href: "/admin", label: "Admin" }]
    : navigation;

  // Signed-in visitors go straight to the claim form. Everyone else starts the
  // Discord handshake, which lands on /claim once it completes -- so the button
  // means the same thing either way.
  const claimHref = signedIn ? "/claim" : "/api/auth/discord";

  return (
    <header className="siteHeader">
      <nav className="topNav" aria-label="Primary navigation">
        <Link className="brand" href="/" aria-label="Frizzybets home" onClick={() => setOpen(false)}>
          <img src="/frizzybets-wordmark.png" alt="Frizzybets" />
        </Link>

        <div className={`navLinks ${open ? "open" : ""}`}>
          {links.map((item) => (
            <Link
              className={`${pathname === item.href ? "active" : ""}${
                item.href === "/admin" ? " navAdmin" : ""
              }`}
              href={item.href}
              key={item.href}
              onClick={() => setOpen(false)}
            >
              {item.label}
              {"badge" in item && item.badge && <span className="navBadge">{item.badge}</span>}
            </Link>
          ))}
        </div>

        <div className="navEnd">
          {/* A plain anchor, not next/link: signed-out this points at an OAuth
              route handler, which has to be a real navigation rather than a
              client-side transition. */}
          <a className="headerAction" href={claimHref}>
            {signedIn ? "Claim Bonus" : "Login to Claim"}
          </a>

          <button
            className={`menuButton ${open ? "open" : ""}`}
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
            title={open ? "Close menu" : "Open menu"}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>
    </header>
  );
}
