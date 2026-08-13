<div align="center">

# 🎬 MD-Cut

**A lightweight, CapCut-inspired video editor for Windows desktop.**

Cut clips, drop in text/music/images on a real multi-track timeline, and export — all running locally, no upload, no subscription.

Built with Electron · React · TypeScript · FFmpeg

</div>

---

## ✨ Features

- **Multi-track timeline** — separate Video / Audio / Text / Image tracks with drag-to-move, drag-to-trim, split (`S`), and drag-and-drop straight from your file explorer
- **Real-time preview** — video, audio, text overlays and image overlays composited live as you scrub or play
- **Text & image overlays** — drag position directly on the preview canvas, adjust font/size/color/scale from the properties panel
- **Fade in/out** — per-clip fade effects, reflected in both preview and final export
- **Undo/redo, copy/cut/paste** — standard editing shortcuts (`Ctrl+Z/Y/C/X/V`, `Delete`) that actually work like you'd expect
- **Custom fonts** — drop `.ttf`/`.otf` files into the `fonts/` folder next to the app and they show up automatically
- **Bilingual UI** — Vietnamese / English, switchable anytime
- **Save/load projects** — `.mdcut.json` project files you can reopen and keep editing
- **Export** — MP4/MOV/WebM, up to 4K, configurable frame rate, real FFmpeg pipeline with a live progress bar

## 🛠 Tech stack

| Layer | Choice |
|---|---|
| Shell | [Electron](https://www.electronjs.org/) |
| UI | [React](https://react.dev/) + TypeScript + [Vite](https://vitejs.dev/) |
| State | [Zustand](https://github.com/pmndrs/zustand) |
| Video processing | [FFmpeg](https://ffmpeg.org/) (via `ffmpeg-static`) |
| Packaging | [electron-builder](https://www.electron.build/) |

## 🚀 Getting started

```bash
npm install
npm run dev          # launch the app in development mode
```

### Build a portable Windows app

```bash
npm run build
npm run electron:build:portable
```

The runnable app is produced at `release/win-unpacked/MD-Cut.exe` (copy the whole `win-unpacked` folder if you move it — the `.exe` needs its neighboring files).

## ⌨️ Shortcuts

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `S` | Split selected clip at playhead |
| `Delete` / `Backspace` | Delete selected clip or media asset |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Ctrl+C` / `Ctrl+X` / `Ctrl+V` | Copy / Cut / Paste clip |

## 🗺 Roadmap

This project is built incrementally — see [PLAN.md](PLAN.md) for the full phase-by-phase breakdown and what's still ahead (transitions between clips, richer effects, etc).

## 📄 License

Personal project — not currently licensed for redistribution.
