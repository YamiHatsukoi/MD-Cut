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

export interface ColorAdjust {
  brightness: number;
  contrast: number;
  saturation: number;
}

/** Brightness/contrast/saturation adjustment for a clip. All three are on a
 * -100..100 scale where 0 means "unchanged". Stored as a single
 * `brightness-contrast` effect entry, added lazily. */
export function getColorAdjust(clip: Clip): ColorAdjust {
  const e = clip.effects.find((e) => e.type === "brightness-contrast");
  return {
    brightness: e?.params.brightness ?? 0,
    contrast: e?.params.contrast ?? 0,
    saturation: e?.params.saturation ?? 0,
  };
}

export function withColorAdjust(clip: Clip, patch: Partial<ColorAdjust>): Effect[] {
  const merged = { ...getColorAdjust(clip), ...patch };
  const others = clip.effects.filter((e) => e.type !== "brightness-contrast");
  if (merged.brightness === 0 && merged.contrast === 0 && merged.saturation === 0) {
    return others;
  }
  return [...others, { id: "brightness-contrast", type: "brightness-contrast", params: merged }];
}

/** CSS `filter` value for previewing a clip's color adjust on a <video>/<canvas>
 * element. Returns "none" when there's nothing to apply. */
export function cssColorFilter(clip: Clip | undefined): string {
  if (!clip) return "none";
  const { brightness, contrast, saturation } = getColorAdjust(clip);
  if (brightness === 0 && contrast === 0 && saturation === 0) return "none";
  return `brightness(${1 + brightness / 100}) contrast(${1 + contrast / 100}) saturate(${1 + saturation / 100})`;
}

/** 0..1..0 easing envelope for a slide/zoom text entrance+exit animation:
 * ramps up over `animDuration` seconds at the start of the clip, stays at 1,
 * then ramps back down over `animDuration` seconds at the end. Independent
 * from (and multiplicative with) fade opacity. */
export function computeAnimProgress(
  localTime: number,
  clipDuration: number,
  animDuration: number
): number {
  if (animDuration <= 0) return 1;
  const inProgress = Math.min(1, Math.max(0, localTime / animDuration));
  const timeFromEnd = clipDuration - localTime;
  const outProgress = Math.min(1, Math.max(0, timeFromEnd / animDuration));
  return Math.min(inProgress, outProgress);
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
