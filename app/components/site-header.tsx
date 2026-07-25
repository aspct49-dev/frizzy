"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { DISCORD_URL } from "../data";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/leaderboard", label: "Leaderboard", badge: "$10K" },
  { href: "/#bonuses", label: "Bonuses" },
  { href: "/#videos", label: "Videos" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="siteHeader">
      <nav className="topNav" aria-label="Primary navigation">
        <Link className="brand" href="/" aria-label="Frizzybets home" onClick={() => setOpen(false)}>
          <img src="/frizzybets-wordmark.png" alt="Frizzybets" />
        </Link>

        <div className={`navLinks ${open ? "open" : ""}`}>
          {navigation.map((item) => (
            <Link
              className={pathname === item.href ? "active" : ""}
              href={item.href}
              key={item.href}
              onClick={() => setOpen(false)}
            >
              {item.label}
              {item.badge && <span className="navBadge">{item.badge}</span>}
            </Link>
          ))}
        </div>

        <div className="navEnd">
          <a
            className="headerAction"
            href={DISCORD_URL}
            target="_blank"
            rel="noreferrer"
          >
            Claim Bonus
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
