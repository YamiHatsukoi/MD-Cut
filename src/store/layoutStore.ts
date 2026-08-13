import { create } from "zustand";

const SIDEBAR_WIDTH = 88;

const MIN_MEDIA_PANEL_WIDTH = 160;
const MAX_MEDIA_PANEL_WIDTH = 480;
const MIN_PROPERTIES_PANEL_WIDTH = 180;
const MAX_PROPERTIES_PANEL_WIDTH = 480;
const MIN_TIMELINE_HEIGHT = 140;
const MAX_TIMELINE_HEIGHT = 560;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface LayoutState {
  sidebarWidth: number;
  mediaPanelWidth: number;
  propertiesPanelWidth: number;
  timelineHeight: number;
  setMediaPanelWidth: (w: number) => void;
  setPropertiesPanelWidth: (w: number) => void;
  setTimelineHeight: (h: number) => void;
  /** Delta-based resizers for drag handles: read the current value from the
   * store itself (via `set`'s updater) instead of a value passed in by the
   * caller. A `ResizeHandle` drag attaches its mousemove listener once and
   * keeps calling the same closure for the whole gesture, so a setter that
   * relies on a width/height captured from React props at drag-start would
   * stay stale for the rest of the drag — each tick would recompute from
   * that frozen starting value instead of accumulating, undoing the
   * previous tick's movement. */
  resizeMediaPanelWidth: (deltaPx: number) => void;
  resizePropertiesPanelWidth: (deltaPx: number) => void;
  resizeTimelineHeight: (deltaPx: number) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarWidth: SIDEBAR_WIDTH,
  mediaPanelWidth: 240,
  propertiesPanelWidth: 260,
  timelineHeight: 240,
  setMediaPanelWidth: (w) =>
    set({ mediaPanelWidth: clamp(w, MIN_MEDIA_PANEL_WIDTH, MAX_MEDIA_PANEL_WIDTH) }),
  setPropertiesPanelWidth: (w) =>
    set({
      propertiesPanelWidth: clamp(w, MIN_PROPERTIES_PANEL_WIDTH, MAX_PROPERTIES_PANEL_WIDTH),
    }),
  setTimelineHeight: (h) =>
    set({ timelineHeight: clamp(h, MIN_TIMELINE_HEIGHT, MAX_TIMELINE_HEIGHT) }),
  resizeMediaPanelWidth: (deltaPx) =>
    set((state) => ({
      mediaPanelWidth: clamp(state.mediaPanelWidth + deltaPx, MIN_MEDIA_PANEL_WIDTH, MAX_MEDIA_PANEL_WIDTH),
    })),
  resizePropertiesPanelWidth: (deltaPx) =>
    set((state) => ({
      propertiesPanelWidth: clamp(
        state.propertiesPanelWidth + deltaPx,
        MIN_PROPERTIES_PANEL_WIDTH,
        MAX_PROPERTIES_PANEL_WIDTH
      ),
    })),
  resizeTimelineHeight: (deltaPx) =>
    set((state) => ({
      timelineHeight: clamp(state.timelineHeight + deltaPx, MIN_TIMELINE_HEIGHT, MAX_TIMELINE_HEIGHT),
    })),
}));
