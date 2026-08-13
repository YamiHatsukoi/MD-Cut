import { useRef, type MouseEvent as ReactMouseEvent } from "react";
import { useProjectStore } from "../store/projectStore";
import { useUiStore, BASE_PIXELS_PER_SECOND } from "../store/uiStore";
import {
  clampMove,
  clampTrimLeft,
  clampTrimRight,
  snapToTargets,
  collectSnapTargets,
} from "../lib/timelineMath";
import { AudioWaveform } from "./AudioWaveform";
import type { Clip, Track } from "../types";

const SNAP_PIXELS = 8;

type DragMode = "move" | "trim-left" | "trim-right";

interface DragState {
  mode: DragMode;
  startClientX: number;
  original: Clip;
  moved: boolean;
  snapshotted: boolean;
  /** Other clips (elsewhere in the project) that ride along with this drag:
   * co-selected clips during a multi-select move, or later same-track clips
   * during a ripple trim-right. Snapshotted at drag start so deltas apply
   * against a fixed origin instead of compounding frame over frame. */
  group: { trackId: string; clip: Clip }[];
}

export function TimelineClip({ clip, track }: { clip: Clip; track: Track }) {
  const selectedClipId = useProjectStore((s) => s.selectedClipId);
  const selectedClipIds = useProjectStore((s) => s.selectedClipIds);
  const selectClip = useProjectStore((s) => s.selectClip);
  const updateClip = useProjectStore((s) => s.updateClip);
  const mediaLibrary = useProjectStore((s) => s.project.mediaLibrary);
  const zoom = useUiStore((s) => s.zoom);
  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoom;
  const dragRef = useRef<DragState | null>(null);

  const asset = mediaLibrary.find((a) => a.id === clip.assetId) ?? null;
  const speed = clip.speed ?? 1;

  function startDrag(mode: DragMode, e: ReactMouseEvent) {
    if (track.locked) return;
    e.preventDefault();
    e.stopPropagation();
    const state = useProjectStore.getState();
    let group: { trackId: string; clip: Clip }[] = [];
    if (mode === "move" && state.selectedClipIds.includes(clip.id) && state.selectedClipIds.length > 1) {
      group = state.project.tracks.flatMap((tr) =>
        tr.clips
          .filter((c) => c.id !== clip.id && state.selectedClipIds.includes(c.id))
          .map((c) => ({ trackId: tr.id, clip: c }))
      );
    } else if (mode === "trim-right" && state.rippleEnabled) {
      group = track.clips
        .filter((c) => c.id !== clip.id && c.timelineStart >= clip.timelineEnd - 0.001)
        .map((c) => ({ trackId: track.id, clip: c }));
    }
    dragRef.current = {
      mode,
      startClientX: e.clientX,
      original: clip,
      moved: false,
      snapshotted: false,
      group,
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function onMouseMove(e: MouseEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const deltaPx = e.clientX - drag.startClientX;
    if (Math.abs(deltaPx) > 3) drag.moved = true;
    if (!drag.snapshotted) {
      drag.snapshotted = true;
      useProjectStore.getState().pushHistory();
    }
    const pps = BASE_PIXELS_PER_SECOND * useUiStore.getState().zoom;
    const deltaSeconds = deltaPx / pps;
    const snapThreshold = SNAP_PIXELS / pps;
    const siblings = track.clips;
    const snapTargets = collectSnapTargets(drag.original, siblings);

    if (drag.mode === "move") {
      const result = clampMove(drag.original, siblings, deltaSeconds);
      const snapped = snapToTargets(result.timelineStart, snapTargets, snapThreshold);
      const shift = snapped - result.timelineStart;
      const netDelta = result.timelineStart + shift - drag.original.timelineStart;
      updateClip(track.id, clip.id, () => ({
        ...drag.original,
        timelineStart: result.timelineStart + shift,
        timelineEnd: result.timelineEnd + shift,
      }));
      for (const g of drag.group) {
        updateClip(g.trackId, g.clip.id, () => ({
          ...g.clip,
          timelineStart: g.clip.timelineStart + netDelta,
          timelineEnd: g.clip.timelineEnd + netDelta,
        }));
      }
    } else if (drag.mode === "trim-left") {
      const result = clampTrimLeft(drag.original, siblings, deltaSeconds, speed);
      const snapped = snapToTargets(result.timelineStart, snapTargets, snapThreshold);
      const shift = snapped - result.timelineStart;
      updateClip(track.id, clip.id, () => ({
        ...drag.original,
        timelineStart: result.timelineStart + shift,
        trimIn: result.trimIn + shift * speed,
      }));
    } else {
      const result = clampTrimRight(
        drag.original,
        siblings,
        deltaSeconds,
        asset?.duration ?? null,
        speed
      );
      const snapped = snapToTargets(result.timelineEnd, snapTargets, snapThreshold);
      const shift = snapped - result.timelineEnd;
      const netDelta = result.timelineEnd + shift - drag.original.timelineEnd;
      updateClip(track.id, clip.id, () => ({
        ...drag.original,
        timelineEnd: result.timelineEnd + shift,
        trimOut: result.trimOut + shift * speed,
      }));
      for (const g of drag.group) {
        updateClip(g.trackId, g.clip.id, () => ({
          ...g.clip,
          timelineStart: g.clip.timelineStart + netDelta,
          timelineEnd: g.clip.timelineEnd + netDelta,
        }));
      }
    }
  }

  function onMouseUp(e: MouseEvent) {
    const drag = dragRef.current;
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
    if (drag && !drag.moved) {
      selectClip(clip.id, { additive: e.ctrlKey || e.metaKey || e.shiftKey });
    }
    dragRef.current = null;
  }

  const left = clip.timelineStart * pixelsPerSecond;
  const width = (clip.timelineEnd - clip.timelineStart) * pixelsPerSecond;
  const isSelected = clip.id === selectedClipId || selectedClipIds.includes(clip.id);

  return (
    <div
      className={`timeline-clip${isSelected ? " selected" : ""}${track.locked ? " locked" : ""}`}
      style={{ left, width }}
      onMouseDown={(e) => startDrag("move", e)}
    >
      <div className="clip-handle clip-handle-left" onMouseDown={(e) => startDrag("trim-left", e)} />
      {(track.type === "audio" || track.type === "video") && asset && (
        <AudioWaveform asset={asset} trimIn={clip.trimIn} trimOut={clip.trimOut} />
      )}
      <span className="clip-label">
        {clip.label}
        {speed !== 1 ? ` (${speed}x)` : ""}
      </span>
      <div className="clip-handle clip-handle-right" onMouseDown={(e) => startDrag("trim-right", e)} />
    </div>
  );
}
