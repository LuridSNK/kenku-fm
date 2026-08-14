export type YouTubeDownloadState =
  | "queued"
  | "downloading"
  | "saving"
  | "completed"
  | "canceling"
  | "canceled"
  | "failed";

export interface YouTubeDownloadRequest {
  sourceUrl: string;
  title?: string;
}

export interface YouTubeDownloadJob extends YouTubeDownloadRequest {
  id: string;
  state: YouTubeDownloadState;
  progress?: number;
  resolvedTitle?: string;
  error?: string;
  createdAt: number;
}
export interface YouTubeDownloadUpdate {
  id: string;
  job?: YouTubeDownloadJob;
}

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
]);

export function canonicalizeYouTubeUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    return null;
  }

  const host = url.hostname.toLowerCase();
  let videoId: string | undefined;
  if (host === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0];
  } else if (YOUTUBE_HOSTS.has(host)) {
    const parts = url.pathname.split("/").filter(Boolean);
    if (url.pathname === "/watch")
      videoId = url.searchParams.get("v") ?? undefined;
    else if (["shorts", "live"].includes(parts[0])) videoId = parts[1];
  }

  return videoId && VIDEO_ID.test(videoId)
    ? `https://www.youtube.com/watch?v=${videoId}`
    : null;
}
