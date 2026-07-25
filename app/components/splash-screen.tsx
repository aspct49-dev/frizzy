"use client";

import { useEffect, useState } from "react";

const MIN_SHOW_MS = 1400;
const FADE_MS = 600;

// Rising bubbles behind the wordmark: [sprite, left %, size px, rise s, delay s, sway s]
const SPLASH_BUBBLES: Array<[number, number, number, number, number, number]> = [
  [1, 12, 26, 7, 0, 3.8],
  [3, 24, 16, 6.2, 1.1, 3.2],
  [5, 38, 22, 7.6, 0.4, 4.1],
  [2, 55, 18, 6.8, 1.6, 3.5],
  [4, 68, 30, 8, 0.2, 4.4],
  [1, 80, 17, 6.4, 1.3, 3.1],
  [3, 90, 24, 7.2, 0.7, 3.9],
];

function SplashBubbles() {
  return (
    <div className="splashBubbles" aria-hidden="true">
      {SPLASH_BUBBLES.map(([sprite, left, size, rise, delay, sway], index) => (
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
          <img
            src={`/bubble-${sprite}.png`}
            alt=""
            style={{ animationDuration: `${sway}s` }}
          />
        </span>
      ))}
    </div>
  );
}

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
      <SplashBubbles />
      <div className="splashGlow" aria-hidden="true" />
      <img className="splashLogo" src="/frizzybets-wordmark.png" alt="Frizzybets" />
      <span className="splashText">
        Loading
        <span className="splashDots" aria-hidden="true">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </span>
    </div>
  );
}
