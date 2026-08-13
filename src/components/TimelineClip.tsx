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
}

export function TimelineClip({ clip, track }: { clip: Clip; track: Track }) {
  const selectedClipId = useProjectStore((s) => s.selectedClipId);
  const selectClip = useProjectStore((s) => s.selectClip);
  const updateClip = useProjectStore((s) => s.updateClip);
  const mediaLibrary = useProjectStore((s) => s.project.mediaLibrary);
  const zoom = useUiStore((s) => s.zoom);
  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoom;
  const dragRef = useRef<DragState | null>(null);

  const asset = mediaLibrary.find((a) => a.id === clip.assetId) ?? null;

  function startDrag(mode: DragMode, e: ReactMouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      mode,
      startClientX: e.clientX,
      original: clip,
      moved: false,
      snapshotted: false,
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
      updateClip(track.id, clip.id, () => ({
        ...drag.original,
        timelineStart: result.timelineStart + shift,
        timelineEnd: result.timelineEnd + shift,
      }));
    } else if (drag.mode === "trim-left") {
      const result = clampTrimLeft(drag.original, siblings, deltaSeconds);
      const snapped = snapToTargets(result.timelineStart, snapTargets, snapThreshold);
      const shift = snapped - result.timelineStart;
      updateClip(track.id, clip.id, () => ({
        ...drag.original,
        timelineStart: result.timelineStart + shift,
        trimIn: result.trimIn + shift,
      }));
    } else {
      const result = clampTrimRight(
        drag.original,
        siblings,
        deltaSeconds,
        asset?.duration ?? null
      );
      const snapped = snapToTargets(result.timelineEnd, snapTargets, snapThreshold);
      const shift = snapped - result.timelineEnd;
      updateClip(track.id, clip.id, () => ({
        ...drag.original,
        timelineEnd: result.timelineEnd + shift,
        trimOut: result.trimOut + shift,
      }));
    }
  }

  function onMouseUp() {
    const drag = dragRef.current;
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
    if (drag && !drag.moved) {
      selectClip(clip.id);
    }
    dragRef.current = null;
  }

  const left = clip.timelineStart * pixelsPerSecond;
  const width = (clip.timelineEnd - clip.timelineStart) * pixelsPerSecond;

  return (
    <div
      className={`timeline-clip${clip.id === selectedClipId ? " selected" : ""}`}
      style={{ left, width }}
      onMouseDown={(e) => startDrag("move", e)}
    >
      <div className="clip-handle clip-handle-left" onMouseDown={(e) => startDrag("trim-left", e)} />
      {(track.type === "audio" || track.type === "video") && asset && (
        <AudioWaveform asset={asset} trimIn={clip.trimIn} trimOut={clip.trimOut} />
      )}
      <span className="clip-label">{clip.label}</span>
      <div className="clip-handle clip-handle-right" onMouseDown={(e) => startDrag("trim-right", e)} />
    </div>
  );
}
