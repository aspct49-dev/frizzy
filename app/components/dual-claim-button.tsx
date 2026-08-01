"use client";

import type { ReactNode } from "react";

type DualClaimButtonProps = {
  className?: string;
  primaryUrl: string;
  secondaryUrl: string;
  children: ReactNode;
};

// Two explicit window.open() calls, back to back, inside the same
// synchronous click handler — browsers allow multiple popups per user
// gesture this way. (Mixing a native <a href target="_blank"> navigation
// with a window.open() side effect does NOT work reliably: Chromium counts
// the href's default-action tab against the same one-popup-per-gesture
// budget as the JS call and silently drops one of them.)
export function DualClaimButton({ className, primaryUrl, secondaryUrl, children }: DualClaimButtonProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        window.open(primaryUrl, "_blank", "noopener,noreferrer");
        window.open(secondaryUrl, "_blank", "noopener,noreferrer");
      }}
    >
      {children}
    </button>
  );
}
