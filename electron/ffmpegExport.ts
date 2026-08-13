import { spawn } from "node:child_process";
import ffmpegPathRaw from "ffmpeg-static";
import type { ExportFormat, ExportResolution } from "../src/types";

// ffmpeg-static computes its binary path relative to its own package
// directory. It has no awareness of asar packaging: when the app is
// packaged, that directory is a virtual path inside app.asar even though
// electron-builder's asarUnpack physically extracted the binary next to it
// (app.asar.unpacked). Node/Electron do not redirect this automatically —
// the consuming code has to do it.
const ffmpegPath =
  ffmpegPathRaw && ffmpegPathRaw.includes("app.asar") && !ffmpegPathRaw.includes("app.asar.unpacked")
    ? ffmpegPathRaw.replace("app.asar", "app.asar.unpacked")
    : ffmpegPathRaw;

/** A clip on the Video track. `timelineStart` is its position (seconds)
 * on the overall exported timeline — gaps between clips are rendered as
 * black frames rather than silently skipped. */
export interface ExportVideoClipInput {
  filePath: string;
  trimIn: number;
  trimOut: number;
  timelineStart: number;
  fadeIn?: number;
  fadeOut?: number;
  /** Seconds to stay fully black/silent after the fade-out ramp finishes,
   * before the clip's timeline slot ends. Only meaningful with fadeOut > 0. */
  fadeOutHold?: number;
  /** Whether the source file has an audio stream. Omit/true = has audio. */
  hasAudio?: boolean;
  /** Cross-fades this clip's tail into the very next clip in the array over
   * this many seconds. Only applied when the next clip is directly adjacent
   * (no gap) — otherwise ignored. */
  transitionOutDuration?: number;
  /** Size/position within the frame. Defaults to scale=1, centered (fills
   * the whole frame, letterboxed to preserve aspect ratio) — matching the
   * original fixed behavior when omitted. */
  scale?: number;
  xPct?: number;
  yPct?: number;
}

/** A clip from the separate Audio track, mixed on top of the video's own
 * audio at its timeline position. */
export interface ExportAudioOverlayInput {
  filePath: string;
  trimIn: number;
  trimOut: number;
  timelineStart: number;
  volume?: number;
  fadeIn?: number;
  fadeOut?: number;
  fadeOutHold?: number;
}

/** A clip from the Text track. `fontFile` must already be resolved to a
 * real .ttf/.otf path on disk (drawtext cannot look up fonts by name), and
 * `textFilePath` to a temp file holding the raw caption text (sidesteps
 * ffmpeg filtergraph string-escaping entirely for the actual content). */
export interface ExportTextOverlayInput {
  fontFile: string;
  textFilePath: string;
  fontSize: number;
  color: string;
  xPct: number;
  yPct: number;
  timelineStart: number;
  timelineEnd: number;
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  outlineEnabled?: boolean;
  outlineColor?: string;
  outlineWidth?: number;
}

/** A clip from the Image track. */
export interface ExportImageOverlayInput {
  filePath: string;
  scale: number;
  xPct: number;
  yPct: number;
  timelineStart: number;
  timelineEnd: number;
  fadeIn?: number;
  fadeOut?: number;
  fadeOutHold?: number;
}

export interface ExportOptions {
  format: ExportFormat;
  resolution: ExportResolution;
  fps: number;
  outputPath: string;
  /** Full duration (seconds) of the rendered output — the project's overall
   * timeline length, including any trailing audio/text/image-only tail. */
  totalDuration: number;
}

const RESOLUTIONS: Record<ExportResolution, { width: number; height: number }> = {
  "720p": { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
  "4k": { width: 3840, height: 2160 },
};

const CODECS: Record<ExportFormat, { video: string; audio: string }> = {
  mp4: { video: "libx264", audio: "aac" },
  mov: { video: "libx264", audio: "aac" },
  webm: { video: "libvpx-vp9", audio: "libopus" },
};

/** Escapes a filesystem path for use inside an ffmpeg filtergraph option
 * value (e.g. `fontfile=`, `textfile=`). Forward slashes sidestep backslash
 * escaping headaches on Windows; the colon after a drive letter still needs
 * escaping since `:` separates filter options. */
function escapeFilterPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/:/g, "\\:");
}

/** Local (0-based) start time for a fade-out ramp so it finishes `hold`
 * seconds before `clipDuration` ends. ffmpeg's fade/afade filters already
 * hold at the faded-out value (black/silent) for anything after the ramp
 * completes, so no extra filter is needed for the hold itself. */
function fadeOutStart(clipDuration: number, fadeOut: number, hold: number): number {
  return Math.max(0, clipDuration - hold - fadeOut);
}

interface VideoSegment {
  type: "single" | "merged";
  a: ExportVideoClipInput;
  aIndex: number;
  b?: ExportVideoClipInput;
  bIndex?: number;
  transitionDuration?: number;
}

/** Groups video clips into render segments, merging a clip with the next one
 * via a cross-fade when it has `transitionOutDuration` set and the next clip
 * is directly adjacent (no gap between them). */
function buildVideoSegments(clips: ExportVideoClipInput[]): VideoSegment[] {
  const segments: VideoSegment[] = [];
  let i = 0;
  while (i < clips.length) {
    const c = clips[i];
    const next = clips[i + 1];
    const tDur = c.transitionOutDuration;
    if (tDur && tDur > 0 && next) {
      const durA = c.trimOut - c.trimIn;
      const isAdjacent = Math.abs(next.timelineStart - (c.timelineStart + durA)) < 0.08;
      if (isAdjacent) {
        segments.push({ type: "merged", a: c, aIndex: i, b: next, bIndex: i + 1, transitionDuration: tDur });
        i += 2;
        continue;
      }
    }
    segments.push({ type: "single", a: c, aIndex: i });
    i += 1;
  }
  return segments;
}

export function buildFfmpegArgs(
  videoClips: ExportVideoClipInput[],
  audioOverlays: ExportAudioOverlayInput[],
  textOverlays: ExportTextOverlayInput[],
  imageOverlays: ExportImageOverlayInput[],
  options: ExportOptions
): string[] {
  const { width, height } = RESOLUTIONS[options.resolution];
  const duration = Math.max(0.1, options.totalDuration);

  const args: string[] = [];
  videoClips.forEach((c) => args.push("-i", c.filePath));
  audioOverlays.forEach((a) => args.push("-i", a.filePath));
  imageOverlays.forEach((img) => {
    args.push("-loop", "1", "-framerate", String(options.fps), "-i", img.filePath);
  });

  const audioInputBase = videoClips.length;
  const imageInputBase = videoClips.length + audioOverlays.length;

  const filterParts: string[] = [];

  // --- video: black canvas for the full duration, clips/images/text overlaid at their positions ---
  filterParts.push(`color=c=black:s=${width}x${height}:d=${duration}:r=${options.fps},format=yuv420p[vbase0]`);
  let videoBase = "vbase0";
  let stage = 1;

  const segments = buildVideoSegments(videoClips);
  segments.forEach((seg, segIdx) => {
    if (seg.type === "single") {
      const c = seg.a;
      const i = seg.aIndex;
      const clipDuration = c.trimOut - c.trimIn;
      const fadeIn = c.fadeIn ?? 0;
      const fadeOut = c.fadeOut ?? 0;
      const vScale = c.scale ?? 1;
      const vXPct = c.xPct ?? 50;
      const vYPct = c.yPct ?? 50;
      const targetW = Math.max(2, Math.round(width * vScale));
      const targetH = Math.max(2, Math.round(height * vScale));
      let chain =
        `[${i}:v]trim=start=${c.trimIn}:end=${c.trimOut},setpts=PTS-STARTPTS+${c.timelineStart}/TB,` +
        `scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2`;
      if (fadeIn > 0) chain += `,fade=t=in:st=${c.timelineStart}:d=${fadeIn}`;
      if (fadeOut > 0) {
        const st = c.timelineStart + fadeOutStart(clipDuration, fadeOut, c.fadeOutHold ?? 0);
        chain += `,fade=t=out:st=${st}:d=${fadeOut}`;
      }
      const label = `vclip${i}`;
      filterParts.push(`${chain}[${label}]`);
      const next = `vbase${stage++}`;
      filterParts.push(
        `[${videoBase}][${label}]overlay=x=(W*${vXPct}/100)-w/2:y=(H*${vYPct}/100)-h/2:eof_action=pass[${next}]`
      );
      videoBase = next;
    } else {
      const c = seg.a;
      const nextClip = seg.b!;
      const i = seg.aIndex;
      const j = seg.bIndex!;
      const durA = c.trimOut - c.trimIn;
      const durB = nextClip.trimOut - nextClip.trimIn;
      const d = Math.min(seg.transitionDuration!, durA, durB);
      // Transitions are anchored to clip A's scale/position for both sides of the blend.
      const vScale = c.scale ?? 1;
      const vXPct = c.xPct ?? 50;
      const vYPct = c.yPct ?? 50;
      const targetW = Math.max(2, Math.round(width * vScale));
      const targetH = Math.max(2, Math.round(height * vScale));
      const scaleChain = `scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2`;
      filterParts.push(
        `[${i}:v]trim=start=${c.trimIn}:end=${c.trimOut},setpts=PTS-STARTPTS,${scaleChain}[xa${segIdx}]`
      );
      filterParts.push(
        `[${j}:v]trim=start=${nextClip.trimIn}:end=${nextClip.trimOut},setpts=PTS-STARTPTS,${scaleChain}[xb${segIdx}]`
      );
      filterParts.push(
        `[xa${segIdx}][xb${segIdx}]xfade=transition=fade:duration=${d}:offset=${durA - d}[xm${segIdx}]`
      );
      const label = `vclip${i}`;
      filterParts.push(`[xm${segIdx}]setpts=PTS+${c.timelineStart}/TB[${label}]`);
      const next = `vbase${stage++}`;
      filterParts.push(
        `[${videoBase}][${label}]overlay=x=(W*${vXPct}/100)-w/2:y=(H*${vYPct}/100)-h/2:eof_action=pass[${next}]`
      );
      videoBase = next;
    }
  });

  imageOverlays.forEach((img, k) => {
    const inputIdx = imageInputBase + k;
    const imgDuration = Math.max(0.1, img.timelineEnd - img.timelineStart);
    const targetW = Math.max(2, Math.round(width * 0.4 * img.scale));
    const fadeIn = img.fadeIn ?? 0;
    const fadeOut = img.fadeOut ?? 0;
    let chain =
      `[${inputIdx}:v]trim=duration=${imgDuration},setpts=PTS-STARTPTS+${img.timelineStart}/TB,` +
      `scale=${targetW}:-2,format=rgba`;
    if (fadeIn > 0) chain += `,fade=t=in:st=${img.timelineStart}:d=${fadeIn}:alpha=1`;
    if (fadeOut > 0) {
      const st = img.timelineStart + fadeOutStart(imgDuration, fadeOut, img.fadeOutHold ?? 0);
      chain += `,fade=t=out:st=${st}:d=${fadeOut}:alpha=1`;
    }
    const label = `img${k}`;
    filterParts.push(`${chain}[${label}]`);
    const next = `vbase${stage++}`;
    filterParts.push(
      `[${videoBase}][${label}]overlay=x=(W*${img.xPct}/100)-w/2:y=(H*${img.yPct}/100)-h/2:eof_action=pass[${next}]`
    );
    videoBase = next;
  });

  textOverlays.forEach((txt) => {
    const fontFile = escapeFilterPath(txt.fontFile);
    const textFile = escapeFilterPath(txt.textFilePath);
    const next = `vbase${stage++}`;
    const opts = [
      `fontfile='${fontFile}'`,
      `textfile='${textFile}'`,
      `fontsize=${txt.fontSize}`,
      `fontcolor=${txt.color}`,
      `x=(w*${txt.xPct}/100)-text_w/2`,
      `y=(h*${txt.yPct}/100)-text_h/2`,
      `enable='between(t,${txt.timelineStart},${txt.timelineEnd})'`,
    ];
    if (txt.shadowEnabled) {
      opts.push(`shadowcolor=${txt.shadowColor ?? "#000000"}`);
      opts.push(`shadowx=${txt.shadowOffsetX ?? 2}`);
      opts.push(`shadowy=${txt.shadowOffsetY ?? 2}`);
    }
    if (txt.outlineEnabled) {
      opts.push(`bordercolor=${txt.outlineColor ?? "#000000"}`);
      opts.push(`borderw=${txt.outlineWidth ?? 3}`);
    }
    filterParts.push(`[${videoBase}]drawtext=${opts.join(":")}[${next}]`);
    videoBase = next;
  });

  filterParts.push(`[${videoBase}]format=yuv420p,fps=${options.fps}[outv]`);

  // --- audio: silent bed for the full duration, mixed with each clip's own audio + overlay track, all delayed to position ---
  filterParts.push(`anullsrc=r=44100:cl=stereo:d=${duration}[abase]`);
  const audioLabels = ["abase"];

  videoClips.forEach((c, i) => {
    if (c.hasAudio === false) return;
    const clipDuration = c.trimOut - c.trimIn;
    const fadeIn = c.fadeIn ?? 0;
    const fadeOut = c.fadeOut ?? 0;
    let chain = `[${i}:a]atrim=start=${c.trimIn}:end=${c.trimOut},asetpts=PTS-STARTPTS`;
    if (fadeIn > 0) chain += `,afade=t=in:st=0:d=${fadeIn}`;
    if (fadeOut > 0) {
      const st = fadeOutStart(clipDuration, fadeOut, c.fadeOutHold ?? 0);
      chain += `,afade=t=out:st=${st}:d=${fadeOut}`;
    }
    const delayMs = Math.max(0, Math.round(c.timelineStart * 1000));
    chain += `,adelay=${delayMs}:all=1`;
    const label = `va${i}`;
    filterParts.push(`${chain}[${label}]`);
    audioLabels.push(label);
  });

  audioOverlays.forEach((a, k) => {
    const inputIdx = audioInputBase + k;
    const clipDuration = a.trimOut - a.trimIn;
    const volume = a.volume ?? 1;
    const fadeIn = a.fadeIn ?? 0;
    const fadeOut = a.fadeOut ?? 0;
    let chain = `[${inputIdx}:a]atrim=start=${a.trimIn}:end=${a.trimOut},asetpts=PTS-STARTPTS`;
    if (volume !== 1) chain += `,volume=${volume}`;
    if (fadeIn > 0) chain += `,afade=t=in:st=0:d=${fadeIn}`;
    if (fadeOut > 0) {
      const st = fadeOutStart(clipDuration, fadeOut, a.fadeOutHold ?? 0);
      chain += `,afade=t=out:st=${st}:d=${fadeOut}`;
    }
    const delayMs = Math.max(0, Math.round(a.timelineStart * 1000));
    chain += `,adelay=${delayMs}:all=1`;
    const label = `ao${k}`;
    filterParts.push(`${chain}[${label}]`);
    audioLabels.push(label);
  });

  if (audioLabels.length > 1) {
    const mixIn = audioLabels.map((l) => `[${l}]`).join("");
    const n = audioLabels.length;
    filterParts.push(
      `${mixIn}amix=inputs=${n}:duration=first:dropout_transition=0,volume=${n}[finala]`
    );
  } else {
    filterParts.push(`[abase]anull[finala]`);
  }

  args.push("-filter_complex", filterParts.join(";"));
  args.push("-map", "[outv]", "-map", "[finala]");
  args.push("-t", String(duration));

  const codec = CODECS[options.format];
  args.push("-c:v", codec.video, "-c:a", codec.audio);
  if (options.format === "mp4" || options.format === "mov") {
    args.push("-pix_fmt", "yuv420p");
  }

  args.push("-y", options.outputPath);
  return args;
}

function parseTimeToSeconds(timeStr: string): number {
  const [h, m, s] = timeStr.split(":");
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

/** Probes a media file for the presence of an audio stream by scraping
 * `ffmpeg -i`'s stderr output (ffmpeg-static ships no ffprobe binary). */
function probeHasAudio(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!ffmpegPath) {
      resolve(false);
      return;
    }
    const proc = spawn(ffmpegPath, ["-i", filePath]);
    let stderr = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on("error", () => resolve(false));
    proc.on("close", () => {
      resolve(/Stream #\d+:\d+[^\n]*:\s*Audio:/.test(stderr));
    });
  });
}

export async function runExport(
  videoClips: ExportVideoClipInput[],
  audioOverlays: ExportAudioOverlayInput[],
  textOverlays: ExportTextOverlayInput[],
  imageOverlays: ExportImageOverlayInput[],
  options: ExportOptions,
  onProgress?: (ratio: number) => void
): Promise<void> {
  const audioCache = new Map<string, boolean>();
  const resolvedClips: ExportVideoClipInput[] = [];
  for (const c of videoClips) {
    if (c.hasAudio === undefined) {
      if (!audioCache.has(c.filePath)) {
        audioCache.set(c.filePath, await probeHasAudio(c.filePath));
      }
      resolvedClips.push({ ...c, hasAudio: audioCache.get(c.filePath) });
    } else {
      resolvedClips.push(c);
    }
  }

  const args = buildFfmpegArgs(resolvedClips, audioOverlays, textOverlays, imageOverlays, options);
  const totalDuration = options.totalDuration;

  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("ffmpeg binary not found"));
      return;
    }
    const proc = spawn(ffmpegPath, args);
    let stderr = "";

    proc.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      const match = text.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
      if (match && onProgress && totalDuration > 0) {
        const elapsed = parseTimeToSeconds(match[1]);
        onProgress(Math.min(elapsed / totalDuration, 1));
      }
    });

    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) {
        onProgress?.(1);
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}\n${stderr.slice(-2000)}`));
      }
    });
  });
}
