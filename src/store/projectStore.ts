import { create } from "zustand";
import type { Clip, MediaAsset, Project, Track, Transition } from "../types";
import { splitClip, clampMove } from "../lib/timelineMath";

const MAX_HISTORY = 50;
const DEFAULT_TRANSITION_DURATION = 0.5;

function emptyProject(): Project {
  return {
    id: `project-${Date.now()}`,
    name: "Untitled Project",
    resolution: { width: 1920, height: 1080 },
    fps: 30,
    mediaLibrary: [],
    transitions: [],
    tracks: [
      { id: "track-video-1", type: "video", name: "Video", clips: [] },
      { id: "track-audio-1", type: "audio", name: "Audio", clips: [] },
      { id: "track-text-1", type: "text", name: "Text", clips: [] },
      { id: "track-image-1", type: "image", name: "Image", clips: [] },
    ],
  };
}

function pushHistoryEntry(past: Project[], project: Project): Project[] {
  return [...past, project].slice(-MAX_HISTORY);
}

interface ProjectState {
  project: Project;
  past: Project[];
  future: Project[];
  playheadTime: number;
  selectedClipId: string | null;
  selectedAssetId: string | null;
  clipboardClip: Clip | null;
  isPlaying: boolean;
  setPlayheadTime: (t: number) => void;
  setIsPlaying: (playing: boolean) => void;
  selectClip: (id: string | null) => void;
  selectAsset: (id: string | null) => void;
  updateTrack: (trackId: string, updater: (track: Track) => Track) => void;
  updateClip: (
    trackId: string,
    clipId: string,
    updater: (clip: Clip) => Clip
  ) => void;
  addMediaAssets: (assets: MediaAsset[]) => void;
  deleteMediaAsset: (assetId: string) => void;
  addClipToTrack: (trackId: string, clip: Clip) => void;
  splitClipAt: (trackId: string, clipId: string, atTime: number) => void;
  deleteClip: (trackId: string, clipId: string) => void;
  copyClip: (clip: Clip) => void;
  pasteClip: () => void;
  toggleTransition: (afterClipId: string) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  loadProject: (project: Project) => void;
  resetProject: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  project: emptyProject(),
  past: [],
  future: [],
  playheadTime: 0,
  selectedClipId: null,
  selectedAssetId: null,
  clipboardClip: null,
  isPlaying: false,
  setPlayheadTime: (t) => set({ playheadTime: t }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  selectClip: (id) => set({ selectedClipId: id, selectedAssetId: null }),
  selectAsset: (id) => set({ selectedAssetId: id, selectedClipId: null }),

  // Continuous mutators (drag, live text edit) — do NOT push history themselves.
  // Callers are responsible for calling pushHistory() once at the start of a gesture.
  updateTrack: (trackId, updater) =>
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((t) =>
          t.id === trackId ? updater(t) : t
        ),
      },
    })),
  updateClip: (trackId, clipId, updater) =>
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((t) =>
          t.id !== trackId
            ? t
            : {
                ...t,
                clips: t.clips.map((c) => (c.id === clipId ? updater(c) : c)),
              }
        ),
      },
    })),

  // Discrete one-shot mutators — push their own history entry.
  addMediaAssets: (assets) =>
    set((state) => ({
      project: {
        ...state.project,
        mediaLibrary: [...state.project.mediaLibrary, ...assets],
      },
      past: pushHistoryEntry(state.past, state.project),
      future: [],
    })),
  deleteMediaAsset: (assetId) =>
    set((state) => ({
      project: {
        ...state.project,
        mediaLibrary: state.project.mediaLibrary.filter((a) => a.id !== assetId),
        tracks: state.project.tracks.map((t) => ({
          ...t,
          clips: t.clips.filter((c) => c.assetId !== assetId),
        })),
      },
      past: pushHistoryEntry(state.past, state.project),
      future: [],
      selectedAssetId: state.selectedAssetId === assetId ? null : state.selectedAssetId,
      selectedClipId:
        state.project.tracks
          .flatMap((t) => t.clips)
          .find((c) => c.id === state.selectedClipId)?.assetId === assetId
          ? null
          : state.selectedClipId,
    })),
  addClipToTrack: (trackId, clip) =>
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((t) =>
          t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t
        ),
      },
      past: pushHistoryEntry(state.past, state.project),
      future: [],
    })),
  splitClipAt: (trackId, clipId, atTime) =>
    set((state) => {
      const track = state.project.tracks.find((t) => t.id === trackId);
      const clip = track?.clips.find((c) => c.id === clipId);
      if (!track || !clip) return state;
      const newId = `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const result = splitClip(clip, atTime, newId);
      if (!result) return state;
      const [left, right] = result;
      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map((t) =>
            t.id !== trackId
              ? t
              : {
                  ...t,
                  clips: t.clips.flatMap((c) =>
                    c.id === clipId ? [left, right] : [c]
                  ),
                }
          ),
          // the geometry around this boundary changed — any transition
          // hinging on it no longer makes sense
          transitions: state.project.transitions.filter((t) => t.afterClipId !== clipId),
        },
        past: pushHistoryEntry(state.past, state.project),
        future: [],
        selectedClipId: right.id,
      };
    }),
  deleteClip: (trackId, clipId) =>
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((t) =>
          t.id !== trackId
            ? t
            : { ...t, clips: t.clips.filter((c) => c.id !== clipId) }
        ),
        transitions: state.project.transitions.filter((t) => t.afterClipId !== clipId),
      },
      past: pushHistoryEntry(state.past, state.project),
      future: [],
      selectedClipId: null,
    })),
  copyClip: (clip) => set({ clipboardClip: clip }),
  pasteClip: () =>
    set((state) => {
      const clip = state.clipboardClip;
      if (!clip) return state;
      const track = state.project.tracks.find((t) => t.id === clip.trackId);
      if (!track) return state;
      const duration = clip.timelineEnd - clip.timelineStart;
      const desiredStart = state.playheadTime;
      const virtual: Clip = {
        ...clip,
        id: "__paste__",
        timelineStart: desiredStart,
        timelineEnd: desiredStart + duration,
      };
      const { timelineStart, timelineEnd } = clampMove(virtual, track.clips, 0);
      const newId = `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newClip: Clip = { ...clip, id: newId, timelineStart, timelineEnd };
      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map((t) =>
            t.id === track.id ? { ...t, clips: [...t.clips, newClip] } : t
          ),
        },
        past: pushHistoryEntry(state.past, state.project),
        future: [],
        selectedClipId: newId,
      };
    }),

  toggleTransition: (afterClipId) =>
    set((state) => {
      const exists = state.project.transitions.some((t) => t.afterClipId === afterClipId);
      const transitions: Transition[] = exists
        ? state.project.transitions.filter((t) => t.afterClipId !== afterClipId)
        : [
            ...state.project.transitions,
            {
              id: `trans-${afterClipId}`,
              type: "dissolve",
              duration: DEFAULT_TRANSITION_DURATION,
              afterClipId,
            },
          ];
      return {
        project: { ...state.project, transitions },
        past: pushHistoryEntry(state.past, state.project),
        future: [],
      };
    }),
  pushHistory: () =>
    set((state) => ({
      past: pushHistoryEntry(state.past, state.project),
      future: [],
    })),
  undo: () =>
    set((state) => {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        project: previous,
        past: state.past.slice(0, -1),
        future: [state.project, ...state.future],
        selectedClipId: null,
      };
    }),
  redo: () =>
    set((state) => {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        project: next,
        past: pushHistoryEntry(state.past, state.project),
        future: state.future.slice(1),
        selectedClipId: null,
      };
    }),

  loadProject: (project) =>
    set({ project, selectedClipId: null, playheadTime: 0, past: [], future: [] }),
  resetProject: () =>
    set({
      project: emptyProject(),
      selectedClipId: null,
      playheadTime: 0,
      past: [],
      future: [],
    }),
}));
