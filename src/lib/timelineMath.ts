import type { Clip } from "../types";

export const MIN_CLIP_DURATION = 0.1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/** Splits a clip at `atTime` (absolute timeline seconds). Returns null if the
 * split point is not strictly inside the clip (leaving at least MIN_CLIP_DURATION
 * on both sides). */
export function splitClip(
  clip: Clip,
  atTime: number,
  newId: string
): [Clip, Clip] | null {
  if (
    atTime <= clip.timelineStart + MIN_CLIP_DURATION ||
    atTime >= clip.timelineEnd - MIN_CLIP_DURATION
  ) {
    return null;
  }
  const offset = atTime - clip.timelineStart;
  const left: Clip = { ...clip, timelineEnd: atTime, trimOut: clip.trimIn + offset };
  const right: Clip = {
    ...clip,
    id: newId,
    timelineStart: atTime,
    trimIn: clip.trimIn + offset,
  };
  return [left, right];
}

function prevSiblingEnd(clip: Clip, siblings: Clip[]): number {
  return siblings
    .filter((s) => s.id !== clip.id && s.timelineEnd <= clip.timelineStart)
    .reduce((max, s) => Math.max(max, s.timelineEnd), 0);
}

function nextSiblingStart(clip: Clip, siblings: Clip[]): number {
  return siblings
    .filter((s) => s.id !== clip.id && s.timelineStart >= clip.timelineEnd)
    .reduce((min, s) => Math.min(min, s.timelineStart), Infinity);
}

export function clampMove(
  clip: Clip,
  siblings: Clip[],
  deltaSeconds: number
): { timelineStart: number; timelineEnd: number } {
  const duration = clip.timelineEnd - clip.timelineStart;
  const min = prevSiblingEnd(clip, siblings);
  const max = nextSiblingStart(clip, siblings) - duration;
  const timelineStart = clamp(clip.timelineStart + deltaSeconds, min, max);
  return { timelineStart, timelineEnd: timelineStart + duration };
}

export function clampTrimLeft(
  clip: Clip,
  siblings: Clip[],
  deltaSeconds: number,
  speed = 1
): { timelineStart: number; trimIn: number } {
  const min = Math.max(
    prevSiblingEnd(clip, siblings),
    clip.timelineStart - clip.trimIn / speed
  );
  const max = clip.timelineEnd - MIN_CLIP_DURATION;
  const timelineStart = clamp(clip.timelineStart + deltaSeconds, min, max);
  const applied = timelineStart - clip.timelineStart;
  return { timelineStart, trimIn: clip.trimIn + applied * speed };
}

/** Snaps `value` to the closest of `targets` if within `threshold`, else
 * returns `value` unchanged. */
export function snapToTargets(value: number, targets: number[], threshold: number): number {
  let best = value;
  let bestDist = threshold;
  for (const t of targets) {
    const d = Math.abs(value - t);
    if (d < bestDist) {
      bestDist = d;
      best = t;
    }
  }
  return best;
}

/** Candidate snap points for dragging/trimming `clip`: 0, and every other
 * clip's start/end on the same track. */
export function collectSnapTargets(clip: Clip, siblings: Clip[]): number[] {
  const targets: number[] = [0];
  siblings.forEach((s) => {
    if (s.id !== clip.id) targets.push(s.timelineStart, s.timelineEnd);
  });
  return targets;
}

export function clampTrimRight(
  clip: Clip,
  siblings: Clip[],
  deltaSeconds: number,
  assetDuration: number | null,
  speed = 1
): { timelineEnd: number; trimOut: number } {
  const maxByTrim =
    assetDuration != null
      ? clip.timelineEnd + (assetDuration - clip.trimOut) / speed
      : Infinity;
  const max = Math.min(nextSiblingStart(clip, siblings), maxByTrim);
  const min = clip.timelineStart + MIN_CLIP_DURATION;
  const timelineEnd = clamp(clip.timelineEnd + deltaSeconds, min, max);
  const applied = timelineEnd - clip.timelineEnd;
  return { timelineEnd, trimOut: clip.trimOut + applied * speed };
}

/** Removes `removedIds` from `clips`. When `ripple` is true, every remaining
 * clip is shifted left by the total duration of all removed clips that sat
 * before it (in timelineStart order) — closing each deleted clip's own gap
 * while leaving any other pre-existing gaps untouched. */
export function rippleCompactClips(
  clips: Clip[],
  removedIds: Set<string>,
  ripple: boolean
): Clip[] {
  if (!ripple) return clips.filter((c) => !removedIds.has(c.id));
  const sorted = [...clips].sort((a, b) => a.timelineStart - b.timelineStart);
  let shift = 0;
  const result: Clip[] = [];
  for (const c of sorted) {
    if (removedIds.has(c.id)) {
      shift += c.timelineEnd - c.timelineStart;
      continue;
    }
    result.push(
      shift > 0
        ? { ...c, timelineStart: c.timelineStart - shift, timelineEnd: c.timelineEnd - shift }
        : c
    );
  }
  return result;
}
