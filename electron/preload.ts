import { contextBridge, ipcRenderer, webUtils } from "electron";
import type { ExportFormat, ExportResolution } from "../src/types";

export interface OpenedMediaFile {
  filePath: string;
  fileUrl: string;
  name: string;
  ext: string;
}

export interface ExportVideoClipInput {
  filePath: string;
  trimIn: number;
  trimOut: number;
  timelineStart: number;
  fadeIn?: number;
  fadeOut?: number;
  fadeOutHold?: number;
  transitionOutDuration?: number;
  scale?: number;
  xPct?: number;
  yPct?: number;
  rotation?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  speed?: number;
  muted?: boolean;
}

export interface ExportAudioOverlayInput {
  filePath: string;
  trimIn: number;
  trimOut: number;
  timelineStart: number;
  volume?: number;
  fadeIn?: number;
  fadeOut?: number;
  fadeOutHold?: number;
  speed?: number;
}

export interface ExportTextOverlayInput {
  content: string;
  fontFamily: string;
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
  animation?: "none" | "slide" | "zoom";
  animationDuration?: number;
}

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
  rotation?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
}

export interface ExportSettingsInput {
  format: ExportFormat;
  resolution: ExportResolution;
  fps: number;
  totalDuration: number;
}

export interface ExportResult {
  canceled: boolean;
  outputPath?: string;
}

export interface CustomFont {
  name: string;
  fileUrl: string;
}

export interface RecentProjectEntry {
  filePath: string;
  name: string;
  openedAt: number;
}

const api = {
  ping: (): Promise<string> => ipcRenderer.invoke("ping"),
  openMediaFiles: (): Promise<OpenedMediaFile[]> =>
    ipcRenderer.invoke("dialog:openMedia"),
  saveProject: (json: string, defaultName: string): Promise<string | null> =>
    ipcRenderer.invoke("dialog:saveProject", json, defaultName),
  openProject: (): Promise<{ filePath: string; json: string } | null> =>
    ipcRenderer.invoke("dialog:openProject"),
  exportVideo: (
    videoClips: ExportVideoClipInput[],
    audioOverlays: ExportAudioOverlayInput[],
    textOverlays: ExportTextOverlayInput[],
    imageOverlays: ExportImageOverlayInput[],
    settings: ExportSettingsInput
  ): Promise<ExportResult> =>
    ipcRenderer.invoke(
      "export:run",
      videoClips,
      audioOverlays,
      textOverlays,
      imageOverlays,
      settings
    ),
  onExportProgress: (cb: (ratio: number) => void) => {
    const listener = (_event: unknown, ratio: number) => cb(ratio);
    ipcRenderer.on("export:progress", listener);
    return () => {
      ipcRenderer.removeListener("export:progress", listener);
    };
  },
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),
  resolveFileUrl: (filePath: string): Promise<string> =>
    ipcRenderer.invoke("path:toFileUrl", filePath),
  listCustomFonts: (): Promise<CustomFont[]> => ipcRenderer.invoke("fonts:list"),
  showItemInFolder: (filePath: string): Promise<void> =>
    ipcRenderer.invoke("shell:showItemInFolder", filePath),
  autosaveWrite: (json: string): Promise<void> => ipcRenderer.invoke("autosave:write", json),
  autosaveRead: (): Promise<string | null> => ipcRenderer.invoke("autosave:read"),
  autosaveClear: (): Promise<void> => ipcRenderer.invoke("autosave:clear"),
  checkFilesExist: (filePaths: string[]): Promise<string[]> =>
    ipcRenderer.invoke("files:checkExist", filePaths),
  recentProjectsList: (): Promise<RecentProjectEntry[]> =>
    ipcRenderer.invoke("recentProjects:list"),
  recentProjectsAdd: (filePath: string, name: string): Promise<void> =>
    ipcRenderer.invoke("recentProjects:add", filePath, name),
  recentProjectsOpen: (filePath: string): Promise<{ filePath: string; json: string } | null> =>
    ipcRenderer.invoke("recentProjects:open", filePath),
};

export type MdCutApi = typeof api;

contextBridge.exposeInMainWorld("mdcut", api);
