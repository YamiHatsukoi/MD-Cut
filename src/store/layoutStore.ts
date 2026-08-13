import { create } from "zustand";

const SIDEBAR_WIDTH = 88;

const MIN_MEDIA_PANEL_WIDTH = 160;
const MAX_MEDIA_PANEL_WIDTH = 480;
const MIN_PROPERTIES_PANEL_WIDTH = 180;
const MAX_PROPERTIES_PANEL_WIDTH = 480;
const MIN_TIMELINE_HEIGHT = 140;
const MAX_TIMELINE_HEIGHT = 560;

interface LayoutState {
  sidebarWidth: number;
  mediaPanelWidth: number;
  propertiesPanelWidth: number;
  timelineHeight: number;
  setMediaPanelWidth: (w: number) => void;
  setPropertiesPanelWidth: (w: number) => void;
  setTimelineHeight: (h: number) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarWidth: SIDEBAR_WIDTH,
  mediaPanelWidth: 240,
  propertiesPanelWidth: 260,
  timelineHeight: 240,
  setMediaPanelWidth: (w) =>
    set({ mediaPanelWidth: Math.min(MAX_MEDIA_PANEL_WIDTH, Math.max(MIN_MEDIA_PANEL_WIDTH, w)) }),
  setPropertiesPanelWidth: (w) =>
    set({
      propertiesPanelWidth: Math.min(MAX_PROPERTIES_PANEL_WIDTH, Math.max(MIN_PROPERTIES_PANEL_WIDTH, w)),
    }),
  setTimelineHeight: (h) =>
    set({ timelineHeight: Math.min(MAX_TIMELINE_HEIGHT, Math.max(MIN_TIMELINE_HEIGHT, h)) }),
}));
