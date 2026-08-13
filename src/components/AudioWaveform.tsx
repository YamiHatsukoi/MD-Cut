import { useEffect, useRef } from "react";
import { useWaveformStore } from "../store/waveformStore";
import { useUiStore } from "../store/uiStore";
import type { MediaAsset } from "../types";

export function AudioWaveform({
  asset,
  trimIn,
  trimOut,
}: {
  asset: MediaAsset;
  trimIn: number;
  trimOut: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peaks = useWaveformStore((s) => s.peaksByAsset[asset.id]);
  const ensurePeaks = useWaveformStore((s) => s.ensurePeaks);
  const zoom = useUiStore((s) => s.zoom);

  useEffect(() => {
    ensurePeaks(asset.id, asset.fileUrl);
  }, [asset.id, asset.fileUrl, ensurePeaks]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks || !asset.duration) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w <= 0 || h <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const startFrac = Math.max(0, trimIn / asset.duration);
    const endFrac = Math.min(1, trimOut / asset.duration);
    const startIdx = Math.floor(startFrac * peaks.length);
    const endIdx = Math.max(startIdx + 1, Math.ceil(endFrac * peaks.length));
    const slice = peaks.slice(startIdx, endIdx);
    if (slice.length === 0) return;

    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    const barWidth = w / slice.length;
    const mid = h / 2;
    slice.forEach((v, i) => {
      const barH = Math.max(1, v * h);
      ctx.fillRect(i * barWidth, mid - barH / 2, Math.max(1, barWidth - 0.5), barH);
    });
  }, [peaks, trimIn, trimOut, asset.duration, zoom]);

  return <canvas ref={canvasRef} className="clip-waveform" />;
}
