import { useEffect, useState } from "react";
import { useProjectStore } from "../store/projectStore";
import { useUiStore } from "../store/uiStore";
import { useT } from "../i18n/useLang";
import {
  getFadeInDuration,
  getFadeOutDuration,
  getFadeOutHoldDuration,
  getColorAdjust,
} from "../lib/effects";
import { getProjectDuration } from "../lib/projectDuration";
import { friendlyExportError } from "../lib/exportErrors";
import type { ExportFormat, ExportResolution } from "../types";

const FORMATS: ExportFormat[] = ["mp4", "mov", "webm"];

const RESOLUTION_LABELS: Record<ExportResolution, string> = {
  "720p": "720p (16:9)",
  "1080p": "1080p (16:9)",
  "4k": "4K (16:9)",
  "1080p-9x16": "1080p dọc (9:16)",
  "720p-9x16": "720p dọc (9:16)",
  "1080p-1x1": "1080p vuông (1:1)",
  "720p-1x1": "720p vuông (1:1)",
};
const RESOLUTIONS = Object.keys(RESOLUTION_LABELS) as ExportResolution[];
const FPS_OPTIONS = [24, 25, 30, 60];

interface ExportPreset {
  id: string;
  label: string;
  format: ExportFormat;
  resolution: ExportResolution;
  fps: number;
}

const PRESETS: ExportPreset[] = [
  { id: "youtube-1080p", label: "YouTube 1080p", format: "mp4", resolution: "1080p", fps: 30 },
  { id: "youtube-4k", label: "YouTube 4K", format: "mp4", resolution: "4k", fps: 30 },
  {
    id: "shorts",
    label: "TikTok / Reels / Shorts (9:16)",
    format: "mp4",
    resolution: "1080p-9x16",
    fps: 30,
  },
  {
    id: "square",
    label: "Instagram vuông (1:1)",
    format: "mp4",
    resolution: "1080p-1x1",
    fps: 30,
  },
  { id: "web-light", label: "Web nhẹ (WebM 720p)", format: "webm", resolution: "720p", fps: 30 },
];

export function ExportDialog() {
  const open = useUiStore((s) => s.exportDialogOpen);
  const setOpen = useUiStore((s) => s.setExportDialogOpen);
  const t = useT();

  const project = useProjectStore((s) => s.project);

  const [presetId, setPresetId] = useState<string>("custom");
  const [format, setFormat] = useState<ExportFormat>("mp4");
  const [resolution, setResolution] = useState<ExportResolution>("1080p");
  const [fps, setFps] = useState(30);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [missingFiles, setMissingFiles] = useState<string[] | null>(null);

  useEffect(() => {
    if (!open) return;
    const off = window.mdcut.onExportProgress((ratio) => setProgress(ratio));
    return off;
  }, [open]);

  useEffect(() => {
    if (!open) {
      setMissingFiles(null);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  function applyPreset(id: string) {
    setPresetId(id);
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setFormat(preset.format);
    setResolution(preset.resolution);
    setFps(preset.fps);
  }

  const videoTrack = project.tracks.find((tr) => tr.type === "video");
  const videoClips = videoTrack?.hidden
    ? []
    : (videoTrack?.clips ?? [])
        .slice()
        .sort((a, b) => a.timelineStart - b.timelineStart)
        .map((c) => {
          const asset = project.mediaLibrary.find((a) => a.id === c.assetId);
          if (!asset) return null;
          const transition = project.transitions.find((tr) => tr.afterClipId === c.id);
          const colorAdjust = getColorAdjust(c);
          return {
            filePath: asset.filePath,
            trimIn: c.trimIn,
            trimOut: c.trimOut,
            timelineStart: c.timelineStart,
            fadeIn: getFadeInDuration(c),
            fadeOut: getFadeOutDuration(c),
            fadeOutHold: getFadeOutHoldDuration(c),
            transitionOutDuration: transition?.duration,
            scale: c.transform?.scale,
            xPct: c.transform?.x,
            yPct: c.transform?.y,
            rotation: c.transform?.rotation,
            brightness: colorAdjust.brightness,
            contrast: colorAdjust.contrast,
            saturation: colorAdjust.saturation,
            speed: c.speed,
            muted: videoTrack?.muted,
          };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);

  const audioTrack = project.tracks.find((tr) => tr.type === "audio");
  const audioOverlays =
    audioTrack?.hidden || audioTrack?.muted
      ? []
      : (audioTrack?.clips ?? [])
          .map((c) => {
            const asset = project.mediaLibrary.find((a) => a.id === c.assetId);
            if (!asset) return null;
            return {
              filePath: asset.filePath,
              trimIn: c.trimIn,
              trimOut: c.trimOut,
              timelineStart: c.timelineStart,
              volume: c.volume ?? 1,
              fadeIn: getFadeInDuration(c),
              fadeOut: getFadeOutDuration(c),
              fadeOutHold: getFadeOutHoldDuration(c),
              speed: c.speed,
            };
          })
          .filter((c): c is NonNullable<typeof c> => c !== null);

  const textTrack = project.tracks.find((tr) => tr.type === "text");
  const textOverlays = textTrack?.hidden
    ? []
    : (textTrack?.clips ?? [])
        .filter((c) => !!c.text)
        .map((c) => ({
          content: c.text!.content,
          fontFamily: c.text!.fontFamily,
          fontSize: c.text!.fontSize,
          color: c.text!.color,
          xPct: c.text!.x,
          yPct: c.text!.y,
          timelineStart: c.timelineStart,
          timelineEnd: c.timelineEnd,
          shadowEnabled: c.text!.shadowEnabled,
          shadowColor: c.text!.shadowColor,
          shadowOffsetX: c.text!.shadowOffsetX,
          shadowOffsetY: c.text!.shadowOffsetY,
          outlineEnabled: c.text!.outlineEnabled,
          outlineColor: c.text!.outlineColor,
          outlineWidth: c.text!.outlineWidth,
          animation: c.text!.animation,
          animationDuration: c.text!.animationDuration,
        }));

  const imageTrack = project.tracks.find((tr) => tr.type === "image");
  const imageOverlays = imageTrack?.hidden
    ? []
    : (imageTrack?.clips ?? [])
        .map((c) => {
          const asset = project.mediaLibrary.find((a) => a.id === c.assetId);
          if (!asset) return null;
          const colorAdjust = getColorAdjust(c);
          return {
            filePath: asset.filePath,
            scale: c.transform?.scale ?? 1,
            xPct: c.transform?.x ?? 50,
            yPct: c.transform?.y ?? 50,
            timelineStart: c.timelineStart,
            timelineEnd: c.timelineEnd,
            fadeIn: getFadeInDuration(c),
            fadeOut: getFadeOutDuration(c),
            fadeOutHold: getFadeOutHoldDuration(c),
            rotation: c.transform?.rotation,
            brightness: colorAdjust.brightness,
            contrast: colorAdjust.contrast,
            saturation: colorAdjust.saturation,
          };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);

  const totalDuration = getProjectDuration(project.tracks);
  const hasAnyContent =
    videoClips.length > 0 || audioOverlays.length > 0 || textOverlays.length > 0 || imageOverlays.length > 0;

  function referencedFilePaths(): string[] {
    const paths = new Set<string>();
    videoClips.forEach((c) => paths.add(c.filePath));
    audioOverlays.forEach((a) => paths.add(a.filePath));
    imageOverlays.forEach((img) => paths.add(img.filePath));
    return [...paths];
  }

  async function runExport(skipMissing: string[]) {
    setError(null);
    setDone(null);
    setProgress(0);
    const skip = new Set(skipMissing);
    const finalVideoClips = videoClips.filter((c) => !skip.has(c.filePath));
    const finalAudioOverlays = audioOverlays.filter((a) => !skip.has(a.filePath));
    const finalImageOverlays = imageOverlays.filter((img) => !skip.has(img.filePath));
    try {
      const result = await window.mdcut.exportVideo(
        finalVideoClips,
        finalAudioOverlays,
        textOverlays,
        finalImageOverlays,
        { format, resolution, fps, totalDuration }
      );
      if (result.canceled) {
        setProgress(null);
        return;
      }
      setDone(result.outputPath ?? null);
    } catch (err) {
      setError(friendlyExportError(err instanceof Error ? err.message : String(err)));
    } finally {
      setProgress(null);
    }
  }

  async function handleStart() {
    setError(null);
    const paths = referencedFilePaths();
    const missing = paths.length > 0 ? await window.mdcut.checkFilesExist(paths) : [];
    if (missing.length > 0) {
      setMissingFiles(missing);
      return;
    }
    await runExport([]);
  }

  async function handleExportAnywayDespiteMissing() {
    const missing = missingFiles ?? [];
    setMissingFiles(null);
    await runExport(missing);
  }

  return (
    <div className="modal-overlay" onClick={() => setOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t("exportDialogTitle")}</h3>

        {!hasAnyContent && <p className="hint">{t("noTimelineContent")}</p>}

        <label className="field">
          <span>{t("exportPreset")}</span>
          <select value={presetId} onChange={(e) => applyPreset(e.target.value)}>
            <option value="custom">{t("exportPresetCustom")}</option>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>{t("exportFormat")}</span>
          <select
            value={format}
            onChange={(e) => {
              setFormat(e.target.value as ExportFormat);
              setPresetId("custom");
            }}
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {f.toUpperCase()}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>{t("exportResolution")}</span>
          <select
            value={resolution}
            onChange={(e) => {
              setResolution(e.target.value as ExportResolution);
              setPresetId("custom");
            }}
          >
            {RESOLUTIONS.map((r) => (
              <option key={r} value={r}>
                {RESOLUTION_LABELS[r]}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>{t("exportFps")}</span>
          <select
            value={fps}
            onChange={(e) => {
              setFps(Number(e.target.value));
              setPresetId("custom");
            }}
          >
            {FPS_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>

        {missingFiles && missingFiles.length > 0 && (
          <div className="missing-files-warning">
            <p className="warning-title">⚠ {t("missingFilesTitle")}</p>
            <p>{t("missingFilesBody")}</p>
            <ul>
              {missingFiles.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <button className="export-btn" onClick={handleExportAnywayDespiteMissing}>
              {t("missingFilesContinue")}
            </button>
          </div>
        )}

        {progress !== null && (
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress * 100}%` }} />
            <span className="progress-label">
              {t("exportInProgress")} {Math.round(progress * 100)}%
            </span>
          </div>
        )}

        {done && (
          <div>
            <p className="export-done">{t("exportDone")}: {done}</p>
            <button
              type="button"
              className="text-btn"
              onClick={() => window.mdcut.showItemInFolder(done)}
            >
              📂 {t("openFolder")}
            </button>
          </div>
        )}
        {error && <p className="export-error">{error}</p>}

        <div className="modal-actions">
          <button onClick={() => setOpen(false)}>{t("exportCancel")}</button>
          <button
            className="export-btn"
            disabled={!hasAnyContent || progress !== null}
            onClick={handleStart}
          >
            {t("exportStart")}
          </button>
        </div>
      </div>
    </div>
  );
}
