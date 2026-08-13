import type { Clip, Effect } from "../types";

export function getFadeInDuration(clip: Clip): number {
  return clip.effects.find((e) => e.type === "fade-in")?.params.duration ?? 0;
}

export function getFadeOutDuration(clip: Clip): number {
  return clip.effects.find((e) => e.type === "fade-out")?.params.duration ?? 0;
}

/** How long (seconds) the clip stays fully black/silent after the fade-out
 * ramp finishes, before the clip's own timeline slot ends. Only meaningful
 * when a fade-out duration is also set. */
export function getFadeOutHoldDuration(clip: Clip): number {
  return clip.effects.find((e) => e.type === "fade-out")?.params.holdDuration ?? 0;
}

export function withFadeDuration(
  clip: Clip,
  kind: "fade-in" | "fade-out",
  duration: number
): Effect[] {
  const existing = clip.effects.find((e) => e.type === kind);
  const others = clip.effects.filter((e) => e.type !== kind);
  if (duration <= 0) return others;
  return [
    ...others,
    { id: kind, type: kind, params: { ...existing?.params, duration } },
  ];
}

/** Sets the fade-out "hold black" duration. No-op if there's no fade-out
 * effect yet (hold has no meaning without a ramp to hold after). */
export function withFadeOutHold(clip: Clip, holdDuration: number): Effect[] {
  const existing = clip.effects.find((e) => e.type === "fade-out");
  if (!existing) return clip.effects;
  const others = clip.effects.filter((e) => e.type !== "fade-out");
  return [
    ...others,
    { ...existing, params: { ...existing.params, holdDuration: Math.max(0, holdDuration) } },
  ];
}

/** Opacity/volume multiplier (0..1) for a point `localTime` seconds into a
 * clip whose (trimmed) duration is `clipDuration` seconds, given its fade
 * in/out settings. Fade-out ramps down to black over `fadeOut` seconds and
 * then holds at black for `holdDuration` more seconds before the clip ends. */
export function computeFadeFactor(
  clip: Clip,
  localTime: number,
  clipDuration: number
): number {
  const fadeIn = getFadeInDuration(clip);
  const fadeOut = getFadeOutDuration(clip);
  const holdOut = getFadeOutHoldDuration(clip);
  let factor = 1;
  if (fadeIn > 0 && localTime < fadeIn) {
    factor = Math.min(factor, Math.max(0, localTime / fadeIn));
  }
  if (fadeOut > 0) {
    const timeFromEnd = clipDuration - localTime;
    if (timeFromEnd <= holdOut) {
      factor = 0;
    } else if (timeFromEnd < holdOut + fadeOut) {
      factor = Math.min(factor, Math.max(0, (timeFromEnd - holdOut) / fadeOut));
    }
  }
  return factor;
}
