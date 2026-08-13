export type TrackType = "video" | "audio" | "text" | "image";
export type MediaKind = "video" | "audio" | "image";

export interface MediaAsset {
  id: string;
  kind: MediaKind;
  name: string;
  filePath: string;
  fileUrl: string;
  duration: number | null;
  thumbnailUrl: string | null;
}

export type EffectType = "brightness-contrast" | "fade-in" | "fade-out";

export interface Effect {
  id: string;
  type: EffectType;
  params: Record<string, number>;
}

export type TransitionType = "fade" | "dissolve" | "wipe";

export interface Transition {
  id: string;
  type: TransitionType;
  duration: number;
  afterClipId: string;
}

export interface Clip {
  id: string;
  assetId: string | null;
  trackId: string;
  timelineStart: number;
  timelineEnd: number;
  trimIn: number;
  trimOut: number;
  label: string;
  effects: Effect[];
  text?: {
    content: string;
    fontFamily: string;
    fontSize: number;
    color: string;
    x: number;
    y: number;
    shadowEnabled?: boolean;
    shadowColor?: string;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    shadowBlur?: number;
    outlineEnabled?: boolean;
    outlineColor?: string;
    outlineWidth?: number;
  };
  transform?: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
  volume?: number;
}

export interface Track {
  id: string;
  type: TrackType;
  name: string;
  clips: Clip[];
}

export type ExportFormat = "mp4" | "mov" | "webm";
export type ExportResolution = "720p" | "1080p" | "4k";

export interface ExportSettings {
  format: ExportFormat;
  resolution: ExportResolution;
  fps: number;
}

export interface Project {
  id: string;
  name: string;
  resolution: { width: number; height: number };
  fps: number;
  mediaLibrary: MediaAsset[];
  tracks: Track[];
  transitions: Transition[];
}
