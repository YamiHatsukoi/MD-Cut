import { type DragEvent } from "react";
import { useProjectStore } from "../store/projectStore";
import { useUiStore } from "../store/uiStore";
import { useT } from "../i18n/useLang";
import { kindFromExt, probeMediaDuration, generateVideoThumbnail } from "../lib/probeMedia";
import type { MediaAsset } from "../types";

const KIND_ICON: Record<MediaAsset["kind"], string> = {
  video: "🎬",
  audio: "🎵",
  image: "🖼️",
};

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MediaLibraryPanel() {
  const t = useT();
  const activePanel = useUiStore((s) => s.activePanel);
  const mediaLibrary = useProjectStore((s) => s.project.mediaLibrary);
  const addMediaAssets = useProjectStore((s) => s.addMediaAssets);
  const deleteMediaAsset = useProjectStore((s) => s.deleteMediaAsset);
  const selectedAssetId = useProjectStore((s) => s.selectedAssetId);
  const selectAsset = useProjectStore((s) => s.selectAsset);
  const addClipToTrack = useProjectStore((s) => s.addClipToTrack);
  const tracks = useProjectStore((s) => s.project.tracks);

  const visibleAssets =
    activePanel === "media"
      ? mediaLibrary
      : mediaLibrary.filter((a) => a.kind === activePanel);

  async function handleImport() {
    const files = await window.mdcut.openMediaFiles();
    if (files.length === 0) return;
    const assets: MediaAsset[] = [];
    for (const f of files) {
      const kind = kindFromExt(f.ext);
      const duration = await probeMediaDuration(f.fileUrl, kind);
      const thumbnailUrl =
        kind === "image"
          ? f.fileUrl
          : kind === "video"
            ? await generateVideoThumbnail(f.fileUrl)
            : null;
      assets.push({
        id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind,
        name: f.name,
        filePath: f.filePath,
        fileUrl: f.fileUrl,
        duration,
        thumbnailUrl,
      });
    }
    addMediaAssets(assets);
  }

  async function handleExternalDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    const assets: MediaAsset[] = [];
    for (const file of files) {
      const filePath = window.mdcut.getPathForFile(file);
      if (!filePath) continue;
      const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
      const kind = kindFromExt(ext);
      const fileUrl = await window.mdcut.resolveFileUrl(filePath);
      const duration = await probeMediaDuration(fileUrl, kind);
      const thumbnailUrl =
        kind === "image"
          ? fileUrl
          : kind === "video"
            ? await generateVideoThumbnail(fileUrl)
            : null;
      assets.push({
        id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind,
        name: file.name,
        filePath,
        fileUrl,
        duration,
        thumbnailUrl,
      });
    }
    if (assets.length > 0) addMediaAssets(assets);
  }

  function handleAddText() {
    const textTrack = tracks.find((tr) => tr.type === "text");
    if (!textTrack) return;
    const lastEnd = textTrack.clips.reduce(
      (max, c) => Math.max(max, c.timelineEnd),
      0
    );
    addClipToTrack(textTrack.id, {
      id: `clip-${Date.now()}`,
      assetId: null,
      trackId: textTrack.id,
      timelineStart: lastEnd,
      timelineEnd: lastEnd + 3,
      trimIn: 0,
      trimOut: 3,
      label: "Text",
      effects: [],
      text: {
        content: "Text",
        fontFamily: "sans-serif",
        fontSize: 32,
        color: "#ffffff",
        x: 50,
        y: 50,
      },
    });
  }

  return (
    <div
      className="media-panel"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) e.preventDefault();
      }}
      onDrop={handleExternalDrop}
    >
      <div className="media-panel-header">
        <h3>{t("mediaLibrary")}</h3>
        {activePanel === "text" ? (
          <button className="import-btn" onClick={handleAddText}>
            + {t("text")}
          </button>
        ) : (
          <button className="import-btn" onClick={handleImport}>
            {t("importMedia")}
          </button>
        )}
      </div>

      {activePanel !== "text" && visibleAssets.length === 0 && (
        <p className="hint">{t("emptyLibrary")}</p>
      )}

      <div className="asset-grid">
        {activePanel !== "text" &&
          visibleAssets.map((asset) => (
            <div
              key={asset.id}
              className={`asset-item${asset.id === selectedAssetId ? " selected" : ""}`}
              draggable
              title={t("dragToTimeline")}
              onClick={() => selectAsset(asset.id)}
              onDragStart={(e) => {
                e.dataTransfer.setData("application/mdcut-asset", asset.id);
              }}
            >
              <div className="asset-thumb">
                {asset.thumbnailUrl ? (
                  <img src={asset.thumbnailUrl} alt={asset.name} />
                ) : (
                  <span className="asset-icon">{KIND_ICON[asset.kind]}</span>
                )}
                <button
                  className="asset-delete-btn"
                  title="Xóa khỏi thư viện"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMediaAsset(asset.id);
                  }}
                >
                  ×
                </button>
              </div>
              <div className="asset-name">{asset.name}</div>
              {asset.duration != null && (
                <div className="asset-duration">
                  {formatDuration(asset.duration)}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
