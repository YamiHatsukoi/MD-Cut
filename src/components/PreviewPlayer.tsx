import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useProjectStore } from "../store/projectStore";
import { getProjectDuration } from "../lib/projectDuration";
import { formatTime } from "../lib/format";
import { computeFadeFactor, cssColorFilter, computeAnimProgress } from "../lib/effects";
import type { Clip } from "../types";

const RESYNC_THRESHOLD = 0.25;

interface HitBox {
  trackId: string;
  clipId: string;
  kind: "text" | "image" | "video";
  xPx: number;
  yPx: number;
  wPx: number;
  hPx: number;
}

interface DragState {
  trackId: string;
  clipId: string;
  kind: "text" | "image" | "video";
  snapshotted: boolean;
}

function findActiveClip(clips: Clip[] | undefined, time: number): Clip | undefined {
  return clips?.find((c) => time >= c.timelineStart && time < c.timelineEnd);
}

export function PreviewPlayer() {
  const project = useProjectStore((s) => s.project);
  const playheadTime = useProjectStore((s) => s.playheadTime);
  const isPlaying = useProjectStore((s) => s.isPlaying);
  const setIsPlaying = useProjectStore((s) => s.setIsPlaying);
  const setPlayheadTime = useProjectStore((s) => s.setPlayheadTime);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const rafIdRef = useRef<number | null>(null);
  const hitBoxesRef = useRef<HitBox[]>([]);
  const dragRef = useRef<DragState | null>(null);
  const [, forceRedraw] = useState(0);

  const videoTrack = project.tracks.find((t) => t.type === "video");
  const audioTrack = project.tracks.find((t) => t.type === "audio");
  const textTrack = project.tracks.find((t) => t.type === "text");
  const imageTrack = project.tracks.find((t) => t.type === "image");

  const activeVideoClip = videoTrack?.hidden ? undefined : findActiveClip(videoTrack?.clips, playheadTime);
  const activeAudioClip = audioTrack?.hidden ? undefined : findActiveClip(audioTrack?.clips, playheadTime);
  const activeTextClips = textTrack?.hidden
    ? []
    : (textTrack?.clips.filter((c) => playheadTime >= c.timelineStart && playheadTime < c.timelineEnd) ?? []);
  const activeImageClips = imageTrack?.hidden
    ? []
    : (imageTrack?.clips.filter((c) => playheadTime >= c.timelineStart && playheadTime < c.timelineEnd) ?? []);

  const activeVideoAsset = activeVideoClip
    ? project.mediaLibrary.find((a) => a.id === activeVideoClip.assetId)
    : undefined;
  const activeAudioAsset = activeAudioClip
    ? project.mediaLibrary.find((a) => a.id === activeAudioClip.assetId)
    : undefined;

  const duration = getProjectDuration(project.tracks);

  const videoOpacity = activeVideoClip
    ? computeFadeFactor(
        activeVideoClip,
        playheadTime - activeVideoClip.timelineStart,
        activeVideoClip.timelineEnd - activeVideoClip.timelineStart
      )
    : 1;
  const videoScale = activeVideoClip?.transform?.scale ?? 1;
  const videoXPct = activeVideoClip?.transform?.x ?? 50;
  const videoYPct = activeVideoClip?.transform?.y ?? 50;
  const videoRotation = activeVideoClip?.transform?.rotation ?? 0;
  const videoTransform = `translate(${videoXPct - 50}%, ${videoYPct - 50}%) scale(${videoScale}) rotate(${videoRotation}deg)`;
  const videoFilter = cssColorFilter(activeVideoClip);

  // --- master clock: drives playheadTime forward while playing ---
  useEffect(() => {
    if (!isPlaying) return;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const state = useProjectStore.getState();
      const total = getProjectDuration(state.project.tracks);
      const next = state.playheadTime + dt;
      if (next >= total) {
        state.setPlayheadTime(total);
        state.setIsPlaying(false);
        return;
      }
      state.setPlayheadTime(next);
      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    };
  }, [isPlaying]);

  // --- keep <video> element in sync with the active clip / playhead ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!activeVideoClip || !activeVideoAsset) {
      video.pause();
      return;
    }
    if (video.dataset.assetId !== activeVideoAsset.id) {
      video.src = activeVideoAsset.fileUrl;
      video.dataset.assetId = activeVideoAsset.id;
    }
    const speed = activeVideoClip.speed ?? 1;
    video.playbackRate = speed;
    video.muted = videoTrack?.muted ?? false;
    const targetTime =
      (playheadTime - activeVideoClip.timelineStart) * speed + activeVideoClip.trimIn;
    if (!isPlaying || Math.abs(video.currentTime - targetTime) > RESYNC_THRESHOLD) {
      video.currentTime = targetTime;
    }
    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [playheadTime, isPlaying, activeVideoClip?.id, activeVideoAsset?.id, videoTrack?.muted]);

  // --- keep <audio> element in sync with the active audio clip / playhead ---
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!activeAudioClip || !activeAudioAsset || audioTrack?.muted) {
      audio.pause();
      return;
    }
    if (audio.dataset.assetId !== activeAudioAsset.id) {
      audio.src = activeAudioAsset.fileUrl;
      audio.dataset.assetId = activeAudioAsset.id;
    }
    const fade = computeFadeFactor(
      activeAudioClip,
      playheadTime - activeAudioClip.timelineStart,
      activeAudioClip.timelineEnd - activeAudioClip.timelineStart
    );
    audio.volume = (activeAudioClip.volume ?? 1) * fade;
    const speed = activeAudioClip.speed ?? 1;
    audio.playbackRate = speed;
    const targetTime =
      (playheadTime - activeAudioClip.timelineStart) * speed + activeAudioClip.trimIn;
    if (!isPlaying || Math.abs(audio.currentTime - targetTime) > RESYNC_THRESHOLD) {
      audio.currentTime = targetTime;
    }
    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [playheadTime, isPlaying, activeAudioClip?.id, activeAudioAsset?.id, audioTrack?.muted]);

  // --- canvas overlay: text + image clips active at the current time ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.width !== project.resolution.width || canvas.height !== project.resolution.height) {
      canvas.width = project.resolution.width;
      canvas.height = project.resolution.height;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const boxes: HitBox[] = [];

    if (activeVideoClip && videoTrack) {
      const vScale = activeVideoClip.transform?.scale ?? 1;
      const vXPct = activeVideoClip.transform?.x ?? 50;
      const vYPct = activeVideoClip.transform?.y ?? 50;
      const vw = canvas.width * vScale;
      const vh = canvas.height * vScale;
      const vcx = (vXPct / 100) * canvas.width;
      const vcy = (vYPct / 100) * canvas.height;
      boxes.push({
        trackId: videoTrack.id,
        clipId: activeVideoClip.id,
        kind: "video",
        xPx: vcx - vw / 2,
        yPx: vcy - vh / 2,
        wPx: vw,
        hPx: vh,
      });
    }

    for (const clip of activeImageClips) {
      const asset = project.mediaLibrary.find((a) => a.id === clip.assetId);
      if (!asset) continue;
      let img = imageCacheRef.current.get(asset.id);
      if (!img) {
        img = new Image();
        img.src = asset.fileUrl;
        img.onload = () => forceRedraw((v) => v + 1);
        imageCacheRef.current.set(asset.id, img);
      }
      if (img.complete && img.naturalWidth) {
        const scale = clip.transform?.scale ?? 1;
        const xPct = clip.transform?.x ?? 50;
        const yPct = clip.transform?.y ?? 50;
        const rotation = clip.transform?.rotation ?? 0;
        const w = canvas.width * 0.4 * scale;
        const h = w * (img.naturalHeight / img.naturalWidth);
        const cx = (xPct / 100) * canvas.width;
        const cy = (yPct / 100) * canvas.height;
        const fade = computeFadeFactor(
          clip,
          playheadTime - clip.timelineStart,
          clip.timelineEnd - clip.timelineStart
        );
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.filter = cssColorFilter(clip);
        ctx.translate(cx, cy);
        if (rotation) ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
        boxes.push({
          trackId: imageTrack!.id,
          clipId: clip.id,
          kind: "image",
          xPx: cx - w / 2,
          yPx: cy - h / 2,
          wPx: w,
          hPx: h,
        });
      }
    }

    for (const clip of activeTextClips) {
      if (!clip.text) continue;
      const txt = clip.text;
      ctx.font = `${txt.fontSize}px ${txt.fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const localTime = playheadTime - clip.timelineStart;
      const clipDuration = clip.timelineEnd - clip.timelineStart;
      const fade = computeFadeFactor(clip, localTime, clipDuration);
      const cx = (txt.x / 100) * canvas.width;
      const cy = (txt.y / 100) * canvas.height;

      const animType = txt.animation ?? "none";
      const animDur = txt.animationDuration ?? 0.4;
      const animProgress =
        animType === "none" ? 1 : computeAnimProgress(localTime, clipDuration, animDur);
      let localX = 0;
      let localY = 0;
      let localScale = 1;
      if (animType === "slide") {
        localY = (1 - animProgress) * canvas.height * 0.15;
      } else if (animType === "zoom") {
        localScale = 0.4 + 0.6 * animProgress;
      }

      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(cx + localX, cy + localY);
      ctx.scale(localScale, localScale);

      // Always reset shadow/stroke state first — canvas state otherwise
      // leaks between clips drawn in the same pass.
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      if (txt.shadowEnabled) {
        ctx.shadowColor = txt.shadowColor ?? "#000000";
        ctx.shadowOffsetX = txt.shadowOffsetX ?? 2;
        ctx.shadowOffsetY = txt.shadowOffsetY ?? 2;
        ctx.shadowBlur = txt.shadowBlur ?? 4;
      }

      if (txt.outlineEnabled) {
        ctx.strokeStyle = txt.outlineColor ?? "#000000";
        ctx.lineWidth = txt.outlineWidth ?? 3;
        ctx.lineJoin = "round";
        ctx.strokeText(txt.content, 0, 0);
        // shadow already rendered via the outline stroke — clear it so the
        // fill drawn on top doesn't double it up
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      ctx.fillStyle = txt.color;
      ctx.fillText(txt.content, 0, 0);
      ctx.restore();
      const textWidth = ctx.measureText(txt.content).width;
      const textHeight = txt.fontSize * 1.2;
      boxes.push({
        trackId: textTrack!.id,
        clipId: clip.id,
        kind: "text",
        xPx: cx - textWidth / 2,
        yPx: cy - textHeight / 2,
        wPx: textWidth,
        hPx: textHeight,
      });
    }

    hitBoxesRef.current = boxes;
  }, [
    playheadTime,
    activeTextClips,
    activeImageClips,
    activeVideoClip,
    videoTrack,
    project.mediaLibrary,
    project.resolution,
  ]);

  function canvasPixelFromEvent(e: { clientX: number; clientY: number }) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { xPx: (e.clientX - rect.left) * scaleX, yPx: (e.clientY - rect.top) * scaleY };
  }

  function onCanvasMouseDown(e: ReactMouseEvent) {
    const point = canvasPixelFromEvent(e);
    if (!point) return;
    const boxes = hitBoxesRef.current;
    for (let i = boxes.length - 1; i >= 0; i--) {
      const b = boxes[i];
      if (
        point.xPx >= b.xPx &&
        point.xPx <= b.xPx + b.wPx &&
        point.yPx >= b.yPx &&
        point.yPx <= b.yPx + b.hPx
      ) {
        useProjectStore.getState().selectClip(b.clipId, {
          additive: e.ctrlKey || e.metaKey || e.shiftKey,
        });
        const owningTrack = project.tracks.find((tr) => tr.id === b.trackId);
        if (owningTrack?.locked) return;
        dragRef.current = { trackId: b.trackId, clipId: b.clipId, kind: b.kind, snapshotted: false };
        window.addEventListener("mousemove", onCanvasMouseMove);
        window.addEventListener("mouseup", onCanvasMouseUp);
        return;
      }
    }
  }

  function onCanvasMouseMove(e: MouseEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const point = canvasPixelFromEvent(e);
    const canvas = canvasRef.current;
    if (!point || !canvas) return;
    if (!drag.snapshotted) {
      drag.snapshotted = true;
      useProjectStore.getState().pushHistory();
    }
    const xPct = Math.min(100, Math.max(0, (point.xPx / canvas.width) * 100));
    const yPct = Math.min(100, Math.max(0, (point.yPx / canvas.height) * 100));
    const updateClip = useProjectStore.getState().updateClip;
    if (drag.kind === "text") {
      updateClip(drag.trackId, drag.clipId, (c) => ({
        ...c,
        text: { ...c.text!, x: xPct, y: yPct },
      }));
    } else {
      updateClip(drag.trackId, drag.clipId, (c) => ({
        ...c,
        transform: {
          x: xPct,
          y: yPct,
          scale: c.transform?.scale ?? 1,
          rotation: c.transform?.rotation ?? 0,
        },
      }));
    }
  }

  function onCanvasMouseUp() {
    window.removeEventListener("mousemove", onCanvasMouseMove);
    window.removeEventListener("mouseup", onCanvasMouseUp);
    dragRef.current = null;
  }

  function togglePlay() {
    if (duration <= 0) return;
    if (!isPlaying && playheadTime >= duration) {
      setPlayheadTime(0);
    }
    setIsPlaying(!isPlaying);
  }

  const aspectRatio = `${project.resolution.width} / ${project.resolution.height}`;

  return (
    <main className="preview-area">
      <div className="preview-wrapper">
        <div className="preview-box" style={{ aspectRatio }}>
          <video
            ref={videoRef}
            className="preview-video"
            style={{ opacity: videoOpacity, transform: videoTransform, filter: videoFilter }}
            playsInline
          />
          <canvas
            ref={canvasRef}
            className="preview-canvas preview-canvas-interactive"
            onMouseDown={onCanvasMouseDown}
          />
          <audio ref={audioRef} className="preview-audio-hidden" />
        </div>
        <div className="preview-controls">
          <button className="play-btn" onClick={togglePlay} disabled={duration <= 0}>
            {isPlaying ? "⏸" : "▶"}
          </button>
          <span className="preview-time">
            {formatTime(playheadTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </main>
  );
}
