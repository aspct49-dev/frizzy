"use client";

import { useEffect, useState } from "react";

const MIN_SHOW_MS = 1400;
const FADE_MS = 600;

export function SplashScreen() {
  const [hiding, setHiding] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let fadeTimer: number | undefined;
    let goneTimer: number | undefined;

    const dismiss = () => {
      fadeTimer = window.setTimeout(() => {
        setHiding(true);
        goneTimer = window.setTimeout(() => setGone(true), FADE_MS);
      }, MIN_SHOW_MS);
    };

    if (document.readyState === "complete") {
      dismiss();
    } else {
      window.addEventListener("load", dismiss, { once: true });
    }

    return () => {
      window.removeEventListener("load", dismiss);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(goneTimer);
    };
  }, []);

  useEffect(() => {
    if (gone) document.body.classList.add("splash-done");
  }, [gone]);

  if (gone) return null;

  return (
    <div className={`splash ${hiding ? "hide" : ""}`} role="status" aria-label="Loading Frizzybets">
      <img className="splashLogo" src="/juicebox-mascot.png" alt="Frizzybets" />
      <span className="splashText">Loading</span>
    </div>
  );
}
