import { create } from "zustand";
import { decodeWaveformPeaks } from "../lib/waveform";

interface WaveformState {
  peaksByAsset: Record<string, number[] | null>;
  loading: Set<string>;
  ensurePeaks: (assetId: string, fileUrl: string) => void;
}

export const useWaveformStore = create<WaveformState>((set, get) => ({
  peaksByAsset: {},
  loading: new Set(),
  ensurePeaks: (assetId, fileUrl) => {
    const state = get();
    if (assetId in state.peaksByAsset || state.loading.has(assetId)) return;
    state.loading.add(assetId);
    decodeWaveformPeaks(fileUrl).then((peaks) => {
      set((s) => {
        const loading = new Set(s.loading);
        loading.delete(assetId);
        return { peaksByAsset: { ...s.peaksByAsset, [assetId]: peaks }, loading };
      });
    });
  },
}));
