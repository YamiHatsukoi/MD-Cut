import { useEffect, useState } from "react";
import { useProjectStore } from "../store/projectStore";
import { useUiStore } from "../store/uiStore";
import { useT } from "../i18n/useLang";
import { getFadeInDuration, getFadeOutDuration, getFadeOutHoldDuration } from "../lib/effects";
import { getProjectDuration } from "../lib/projectDuration";
import type { ExportFormat, ExportResolution } from "../types";

const FORMATS: ExportFormat[] = ["mp4", "mov", "webm"];
const RESOLUTIONS: ExportResolution[] = ["720p", "1080p", "4k"];
const FPS_OPTIONS = [24, 25, 30, 60];

export function ExportDialog() {
  const open = useUiStore((s) => s.exportDialogOpen);
  const setOpen = useUiStore((s) => s.setExportDialogOpen);
  const t = useT();

  const project = useProjectStore((s) => s.project);

  const [format, setFormat] = useState<ExportFormat>("mp4");
  const [resolution, setResolution] = useState<ExportResolution>("1080p");
  const [fps, setFps] = useState(30);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const off = window.mdcut.onExportProgress((ratio) => setProgress(ratio));
    return off;
  }, [open]);

  if (!open) return null;

  const videoTrack = project.tracks.find((tr) => tr.type === "video");
  const videoClips = (videoTrack?.clips ?? [])
    .slice()
    .sort((a, b) => a.timelineStart - b.timelineStart)
    .map((c) => {
      const asset = project.mediaLibrary.find((a) => a.id === c.assetId);
      if (!asset) return null;
      const transition = project.transitions.find((tr) => tr.afterClipId === c.id);
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
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const audioTrack = project.tracks.find((tr) => tr.type === "audio");
  const audioOverlays = (audioTrack?.clips ?? [])
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
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const textTrack = project.tracks.find((tr) => tr.type === "text");
  const textOverlays = (textTrack?.clips ?? [])
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
    }));

  const imageTrack = project.tracks.find((tr) => tr.type === "image");
  const imageOverlays = (imageTrack?.clips ?? [])
    .map((c) => {
      const asset = project.mediaLibrary.find((a) => a.id === c.assetId);
      if (!asset) return null;
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
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const totalDuration = getProjectDuration(project.tracks);
  const hasAnyContent = videoClips.length > 0 || audioOverlays.length > 0 || textOverlays.length > 0 || imageOverlays.length > 0;

  async function handleStart() {
    setError(null);
    setDone(null);
    setProgress(0);
    try {
      const result = await window.mdcut.exportVideo(videoClips, audioOverlays, textOverlays, imageOverlays, {
        format,
        resolution,
        fps,
        totalDuration,
      });
      if (result.canceled) {
        setProgress(null);
        return;
      }
      setDone(result.outputPath ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => setOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t("exportDialogTitle")}</h3>

        {!hasAnyContent && (
          <p className="hint">Chưa có gì trên timeline để xuất.</p>
        )}

        <label className="field">
          <span>{t("exportFormat")}</span>
          <select value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)}>
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
            onChange={(e) => setResolution(e.target.value as ExportResolution)}
          >
            {RESOLUTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>{t("exportFps")}</span>
          <select value={fps} onChange={(e) => setFps(Number(e.target.value))}>
            {FPS_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>

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
