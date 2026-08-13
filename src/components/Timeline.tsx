import { useEffect, useRef, type DragEvent, type MouseEvent as ReactMouseEvent } from "react";
import { useProjectStore } from "../store/projectStore";
import { useUiStore, BASE_PIXELS_PER_SECOND } from "../store/uiStore";
import { useLayoutStore } from "../store/layoutStore";
import { useT } from "../i18n/useLang";
import { formatTime } from "../lib/format";
import { getProjectDuration } from "../lib/projectDuration";
import { TimelineClip } from "./TimelineClip";
import { ResizeHandle } from "./ResizeHandle";
import type { Track, TrackType } from "../types";

const DEFAULT_IMAGE_DURATION = 5;
const MIN_TIMELINE_SECONDS = 30;

function trackLabelKey(type: TrackType) {
  switch (type) {
    case "video":
      return "trackVideo" as const;
    case "audio":
      return "trackAudio" as const;
    case "text":
      return "trackText" as const;
    case "image":
      return "trackImage" as const;
  }
}

function TimelineTrackRow({
  track,
  width,
  pixelsPerSecond,
}: {
  track: Track;
  width: number;
  pixelsPerSecond: number;
}) {
  const t = useT();
  const mediaLibrary = useProjectStore((s) => s.project.mediaLibrary);
  const allTracks = useProjectStore((s) => s.project.tracks);
  const addClipToTrack = useProjectStore((s) => s.addClipToTrack);
  const transitions = useProjectStore((s) => s.project.transitions);
  const toggleTransition = useProjectStore((s) => s.toggleTransition);
  const toggleTrackLocked = useProjectStore((s) => s.toggleTrackLocked);
  const toggleTrackHidden = useProjectStore((s) => s.toggleTrackHidden);
  const toggleTrackMuted = useProjectStore((s) => s.toggleTrackMuted);

  // Dropping an asset anywhere on the timeline routes it to the matching
  // track by kind (video/audio/image) — the user doesn't have to hit the
  // exact row.
  function handleDrop(e: DragEvent) {
    e.preventDefault();
    const assetId = e.dataTransfer.getData("application/mdcut-asset");
    const asset = mediaLibrary.find((a) => a.id === assetId);
    if (!asset) return;
    const targetTrack = allTracks.find((tr) => tr.type === asset.kind);
    if (!targetTrack) return;

    const duration = asset.duration ?? DEFAULT_IMAGE_DURATION;
    const lastEnd = targetTrack.clips.reduce((max, c) => Math.max(max, c.timelineEnd), 0);
    addClipToTrack(targetTrack.id, {
      id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      assetId: asset.id,
      trackId: targetTrack.id,
      timelineStart: lastEnd,
      timelineEnd: lastEnd + duration,
      trimIn: 0,
      trimOut: duration,
      label: asset.name,
      effects: [],
    });
  }

  const adjacentPairs: { a: (typeof track.clips)[number] }[] = [];
  if (track.type === "video") {
    const sorted = [...track.clips].sort((a, b) => a.timelineStart - b.timelineStart);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (Math.abs(sorted[i].timelineEnd - sorted[i + 1].timelineStart) < 0.08) {
        adjacentPairs.push({ a: sorted[i] });
      }
    }
  }

  return (
    <div className={`timeline-track track-${track.type}${track.hidden ? " track-hidden" : ""}`}>
      <span className="track-label">
        {t(trackLabelKey(track.type))}
        <span className="track-controls">
          <button
            type="button"
            className={`track-ctrl-btn${track.locked ? " active" : ""}`}
            title={track.locked ? t("trackLockOn") : t("trackLockOff")}
            onClick={() => toggleTrackLocked(track.id)}
          >
            {track.locked ? "🔒" : "🔓"}
          </button>
          <button
            type="button"
            className={`track-ctrl-btn${track.hidden ? " active" : ""}`}
            title={track.hidden ? t("trackHideOn") : t("trackHideOff")}
            onClick={() => toggleTrackHidden(track.id)}
          >
            {track.hidden ? "🙈" : "👁"}
          </button>
          {(track.type === "audio" || track.type === "video") && (
            <button
              type="button"
              className={`track-ctrl-btn${track.muted ? " active" : ""}`}
              title={track.muted ? t("trackMuteOn") : t("trackMuteOff")}
              onClick={() => toggleTrackMuted(track.id)}
            >
              {track.muted ? "🔇" : "🔊"}
            </button>
          )}
        </span>
      </span>
      <div
        className={`track-clips-area${track.locked ? " track-locked" : ""}`}
        style={{ width }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={track.locked ? undefined : handleDrop}
      >
        {track.clips.map((clip) => (
          <TimelineClip key={clip.id} clip={clip} track={track} />
        ))}
        {adjacentPairs.map(({ a }) => {
          const hasTransition = transitions.some((tr) => tr.afterClipId === a.id);
          return (
            <button
              key={a.id}
              type="button"
              className={`transition-btn${hasTransition ? " active" : ""}`}
              style={{ left: a.timelineEnd * pixelsPerSecond }}
              title={hasTransition ? t("removeTransition") : t("addTransition")}
              onClick={(e) => {
                e.stopPropagation();
                toggleTransition(a.id);
              }}
            >
              {hasTransition ? "◐" : "+"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimelineRuler({
  width,
  duration,
  pixelsPerSecond,
}: {
  width: number;
  duration: number;
  pixelsPerSecond: number;
}) {
  const rulerRef = useRef<HTMLDivElement>(null);
  const setPlayheadTime = useProjectStore((s) => s.setPlayheadTime);

  function handleClick(e: ReactMouseEvent) {
    const rect = rulerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const time = Math.max(0, (e.clientX - rect.left) / pixelsPerSecond);
    setPlayheadTime(Math.min(time, duration));
  }

  const tickSeconds = pixelsPerSecond < 20 ? 20 : pixelsPerSecond < 60 ? 5 : 1;
  const ticks: number[] = [];
  for (let s = 0; s <= duration; s += tickSeconds) ticks.push(s);

  return (
    <div className="timeline-ruler" ref={rulerRef} style={{ width }} onMouseDown={handleClick}>
      {ticks.map((s) => (
        <span key={s} className="ruler-tick" style={{ left: s * pixelsPerSecond }}>
          {formatTime(s)}
        </span>
      ))}
    </div>
  );
}

export function Timeline() {
  const t = useT();
  const tracks = useProjectStore((s) => s.project.tracks);
  const playheadTime = useProjectStore((s) => s.playheadTime);
  const selectedClipId = useProjectStore((s) => s.selectedClipId);
  const splitClipAt = useProjectStore((s) => s.splitClipAt);
  const zoom = useUiStore((s) => s.zoom);
  const zoomIn = useUiStore((s) => s.zoomIn);
  const zoomOut = useUiStore((s) => s.zoomOut);
  const timelineHeight = useLayoutStore((s) => s.timelineHeight);
  const resizeTimelineHeight = useLayoutStore((s) => s.resizeTimelineHeight);
  const rippleEnabled = useProjectStore((s) => s.rippleEnabled);
  const setRippleEnabled = useProjectStore((s) => s.setRippleEnabled);
  const selectedClipIds = useProjectStore((s) => s.selectedClipIds);
  const deleteSelectedClips = useProjectStore((s) => s.deleteSelectedClips);
  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoom;

  const totalDuration = Math.max(getProjectDuration(tracks), MIN_TIMELINE_SECONDS);
  const width = totalDuration * pixelsPerSecond;
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleSplit() {
    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === selectedClipId);
      if (clip) {
        splitClipAt(track.id, clip.id, playheadTime);
        return;
      }
    }
  }

  // Ctrl+scroll to zoom. Attached as a native (non-passive) listener because
  // React's synthetic onWheel is passive by default, which would silently
  // swallow preventDefault() and let the page/OS handle the scroll instead.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onNativeWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      if (e.deltaY < 0) useUiStore.getState().zoomIn();
      else if (e.deltaY > 0) useUiStore.getState().zoomOut();
    };
    el.addEventListener("wheel", onNativeWheel, { passive: false });
    return () => el.removeEventListener("wheel", onNativeWheel);
  }, []);

  return (
    <section className="timeline" style={{ flexBasis: timelineHeight }}>
      <ResizeHandle
        direction="vertical"
        onResize={(delta) => resizeTimelineHeight(-delta)}
      />
      <div className="timeline-toolbar">
        <button className="text-btn" disabled={!selectedClipId} onClick={handleSplit}>
          {t("splitBtn")}
        </button>
        <button
          className={`text-btn${rippleEnabled ? " active" : ""}`}
          title={t("rippleTooltip")}
          onClick={() => setRippleEnabled(!rippleEnabled)}
        >
          {t("rippleBtn")}
        </button>
        {selectedClipIds.length > 1 && (
          <button className="text-btn" onClick={deleteSelectedClips}>
            {t("deleteSelectedClips").replace("{n}", String(selectedClipIds.length))}
          </button>
        )}
        <span className="playhead-time">{formatTime(playheadTime)}</span>
        <div className="zoom-controls">
          <button className="text-btn zoom-btn" onClick={zoomOut} title={t("zoomOutTooltip")}>
            −
          </button>
          <span className="zoom-level">{Math.round(zoom * 100)}%</span>
          <button className="text-btn zoom-btn" onClick={zoomIn} title={t("zoomInTooltip")}>
            +
          </button>
        </div>
      </div>
      <div className="timeline-scroll" ref={scrollRef}>
        <div className="timeline-inner" style={{ width: width + 90 }}>
          <div className="timeline-ruler-row">
            <span className="track-label ruler-spacer" />
            <TimelineRuler width={width} duration={totalDuration} pixelsPerSecond={pixelsPerSecond} />
          </div>
          {tracks.map((track) => (
            <TimelineTrackRow
              key={track.id}
              track={track}
              width={width}
              pixelsPerSecond={pixelsPerSecond}
            />
          ))}
          <div
            className="playhead-line"
            style={{ left: 90 + playheadTime * pixelsPerSecond }}
          />
        </div>
      </div>
      <p className="timeline-hint">{t("dragToTimeline")}</p>
    </section>
  );
}
