import { create } from "zustand";

export type PanelKind = "media" | "audio" | "text" | "image";

export const BASE_PIXELS_PER_SECOND = 40;
const MIN_ZOOM = 0.001;
const MAX_ZOOM = 4;

interface UiState {
  activePanel: PanelKind;
  setActivePanel: (panel: PanelKind) => void;
  exportDialogOpen: boolean;
  setExportDialogOpen: (open: boolean) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  activePanel: "media",
  setActivePanel: (activePanel) => set({ activePanel }),
  exportDialogOpen: false,
  setExportDialogOpen: (exportDialogOpen) => set({ exportDialogOpen }),
  zoom: 1,
  setZoom: (zoom) => set({ zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) }),
  zoomIn: () =>
    set((s) => ({ zoom: Math.min(MAX_ZOOM, Math.round(s.zoom * 1.25 * 10000) / 10000) })),
  zoomOut: () =>
    set((s) => ({ zoom: Math.max(MIN_ZOOM, Math.round((s.zoom / 1.25) * 10000) / 10000) })),
}));
