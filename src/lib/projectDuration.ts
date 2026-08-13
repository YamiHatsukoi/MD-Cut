import type { Track } from "../types";

export function getProjectDuration(tracks: Track[]): number {
  return tracks.reduce(
    (max, track) =>
      track.clips.reduce((m, c) => Math.max(m, c.timelineEnd), max),
    0
  );
}
