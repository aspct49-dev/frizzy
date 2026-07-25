"use client";

import { useEffect, useState } from "react";
import { FaChevronLeft, FaChevronRight, FaPlay } from "react-icons/fa6";
import type { VideoData } from "../api/videos/route";

const CHANNEL_URL = "https://www.youtube.com/@frizzybets";

// Shown instantly on first render; replaced by the live RSS feed.
const FALLBACK: VideoData[] = [
  { id: "DpMOcKtbNO0", title: "CRAZY BONUS HIT ON TOME OF MADNESS! THIS IS WILD!!", date: "Jul 10, 2026", views: "2K" },
  { id: "ysEKXD7w438", title: "CHASING THE BEST SETUP ON DORK UNIT AND A CRAZY PRESENT BONUS!", date: "Jul 9, 2026", views: "702" },
  { id: "fxGJs9H965Y", title: "I TRIED FURY OF ANUBIS AND IT KEPT PRINTING! THIS IS INSANE!", date: "Jul 8, 2026", views: "1.3K" },
  { id: "6RUKtd94koA", title: "I CHASED A JUICED UP BIG BAMBOO SCREEN! RED TO GOLD BONUS!", date: "Jul 7, 2026", views: "851" },
  { id: "wRCvK3edY-Y", title: "RULE OF 3 BONUSES ON TOME OF MADNESS IS STILL ALIVE! INSANE!", date: "Jul 6, 2026", views: "2K" },
];

// Reel positioning: signed offset from the active slide → transform. Offset 0
// is front-and-center, ±1 are dimmed side slides, ±2 wait off-stage.
const STEP = 72;

function slideStyle(offset: number): React.CSSProperties {
  const abs = Math.abs(offset);
  return {
    transform: `translate(calc(-50% + ${offset * STEP}%), -50%) scale(${abs === 0 ? 1 : abs === 1 ? 0.48 : 0.4})`,
    opacity: abs === 0 ? 1 : abs === 1 ? 0.55 : 0,
    filter: abs === 0 ? "none" : "brightness(0.5) saturate(0.85)",
    zIndex: 30 - abs * 10,
    pointerEvents: abs >= 2 ? "none" : "auto",
  };
}

function Thumbnail({ id, title }: { id: string; title: string }) {
  const [errored, setErrored] = useState(false);
  const src = `https://img.youtube.com/vi/${id}/${errored ? "mqdefault" : "hqdefault"}.jpg`;
  return <img src={src} alt={title} onError={() => setErrored(true)} draggable={false} />;
}

export function VideosSection() {
  const [videos, setVideos] = useState<VideoData[]>(FALLBACK);
  const [active, setActive] = useState(0);

  useEffect(() => {
    fetch("/api/videos")
      .then((response) => response.json())
      .then((data: VideoData[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setVideos(data);
          setActive(0);
        }
      })
      .catch(() => {});
  }, []);

  const count = videos.length;
  const go = (dir: number) => setActive((current) => (current + dir + count) % count);
  const featured = videos[active];

  // Nearest signed offset from the active slide, wrapping so the reel loops.
  const slides = videos
    .map((video, index) => {
      let offset = index - active;
      if (offset > count / 2) offset -= count;
      else if (offset < -count / 2) offset += count;
      return { video, offset };
    })
    .filter((slide) => Math.abs(slide.offset) <= 2);

  return (
    <section className="videosSection" id="videos" aria-label="Latest Frizzybets YouTube videos">
      <div className="centerHeading" data-reveal="heading">
        <h2>
          <span className="playBadge" aria-hidden="true"><FaPlay /></span>
YouTube <span className="headingAccent">Highlights</span>
        </h2>
        <p className="underCode">Fresh videos from the Frizzybets channel</p>
      </div>

      <div className="videoReel" data-reveal="section">
        {slides.map(({ video, offset }) => (
          <div className="videoSlide" key={video.id} style={slideStyle(offset)}>
            {offset === 0 ? (
              <a
                className="videoFrame"
                href={`https://youtube.com/watch?v=${video.id}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`Watch ${video.title} on YouTube`}
              >
                <Thumbnail id={video.id} title={video.title} />
                <span className="playOverlay" aria-hidden="true"><FaPlay /></span>
              </a>
            ) : (
              <button
                className="videoFrame videoFrameSide"
                type="button"
                tabIndex={-1}
                aria-label={offset > 0 ? "Next video" : "Previous video"}
                onClick={() => go(offset > 0 ? 1 : -1)}
              >
                <Thumbnail id={video.id} title={video.title} />
              </button>
            )}
          </div>
        ))}

        <button className="reelNav reelNavPrev" type="button" aria-label="Previous video" onClick={() => go(-1)}>
          <FaChevronLeft />
        </button>
        <button className="reelNav reelNavNext" type="button" aria-label="Next video" onClick={() => go(1)}>
          <FaChevronRight />
        </button>
      </div>

      <div className="videoCaption">
        <p className="videoTitle" key={featured.id}>{featured.title}</p>
        <p className="videoMeta">
          {featured.views && <span>{featured.views} views</span>}
          {featured.views && featured.date && <span aria-hidden="true"> · </span>}
          {featured.date && <span>{featured.date}</span>}
        </p>
        <div className="videoActions">
          <a className="primaryAction" href={`https://youtube.com/watch?v=${featured.id}`} target="_blank" rel="noreferrer">
            Watch Now
          </a>
          <a className="secondaryAction" href={CHANNEL_URL} target="_blank" rel="noreferrer">
            View All Videos
          </a>
        </div>
      </div>
    </section>
  );
}
