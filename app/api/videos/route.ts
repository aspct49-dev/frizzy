export type VideoData = {
  id: string;
  title: string;
  date: string;
  views: string;
};

const CHANNEL_ID = "UCK5-cmQKdUoNUzmIcfsGgCg"; // youtube.com/@frizzybets
const CACHE_TTL_MS = 30 * 60_000;

let cache: { at: number; data: VideoData[] } | null = null;

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/\s*#\S+/gu, "")
    .replace(/\s*@\S+/gu, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRss(xml: string): VideoData[] {
  return xml
    .split("<entry>")
    .slice(1)
    .map((entry) => {
      const id = /<yt:videoId>([^<]+)</.exec(entry)?.[1] ?? "";
      const rawTitle = /<title>([^<]+)</.exec(entry)?.[1] ?? "";
      const published = /<published>([^<]+)</.exec(entry)?.[1] ?? "";
      const viewsRaw = /<media:statistics views="(\d+)"/.exec(entry)?.[1] ?? "0";
      if (!id) return null;
      return {
        id,
        title: cleanTitle(rawTitle),
        date: published ? formatDate(published) : "",
        views: formatViews(Number(viewsRaw)),
      };
    })
    .filter((entry): entry is VideoData => entry !== null)
    .slice(0, 10);
}

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return Response.json(cache.data);
  }

  try {
    const response = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`,
    );
    if (!response.ok) throw new Error(`RSS ${response.status}`);
    const videos = parseRss(await response.text());
    cache = { at: Date.now(), data: videos };
    return Response.json(videos);
  } catch (error) {
    console.error("YouTube RSS fetch failed:", error);
    return Response.json(cache?.data ?? [], { status: cache ? 200 : 502 });
  }
}
