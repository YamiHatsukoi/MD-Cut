import type { MediaKind } from "../types";

export function probeMediaDuration(
  fileUrl: string,
  kind: MediaKind
): Promise<number | null> {
  if (kind === "image") {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const el = document.createElement(kind === "video" ? "video" : "audio");
    el.preload = "metadata";
    el.src = fileUrl;
    el.onloadedmetadata = () => resolve(Number.isFinite(el.duration) ? el.duration : null);
    el.onerror = () => resolve(null);
  });
}

/** Grabs a frame from a video file (a bit into it, so we don't land on a
 * black/blank opening frame) and returns it as a JPEG data URL, for use as
 * a Media Library thumbnail. Resolves null if the frame can't be captured. */
export function generateVideoThumbnail(fileUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = fileUrl;

    function finish(result: string | null) {
      video.src = "";
      resolve(result);
    }

    video.onloadedmetadata = () => {
      const seekTime = Math.min(0.5, (video.duration || 1) * 0.1);
      video.currentTime = seekTime;
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        if (canvas.width === 0 || canvas.height === 0) {
          finish(null);
          return;
        }
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          finish(null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        finish(canvas.toDataURL("image/jpeg", 0.7));
      } catch {
        finish(null);
      }
    };
    video.onerror = () => finish(null);
  });
}

export function kindFromExt(ext: string): MediaKind {
  const video = ["mp4", "mov", "webm", "mkv"];
  const audio = ["mp3", "wav", "aac", "m4a"];
  if (video.includes(ext)) return "video";
  if (audio.includes(ext)) return "audio";
  return "image";
}
