<div align="center">

# 🎬 MD-Cut

**A lightweight, CapCut-inspired video editor for Windows desktop.**

🇻🇳 [Tiếng Việt](#-tiếng-việt) &nbsp;|&nbsp; 🇬🇧 [English](#-english)

### 📥 Tải về / Download

**VI:** Vào trang [Releases](https://github.com/YamiHatsukoi/MD-Cut/releases/tag/Release), tải file `MD-Cut Portable x.x.x.zip` mới nhất, giải nén ra rồi chạy `MD-Cut.exe` bên trong — không cần cài đặt gì thêm. Nhớ giữ nguyên cả thư mục sau khi giải nén (đừng tách riêng file `.exe` ra), vì nó cần các file đi kèm bên cạnh.

**EN:** Go to the [Releases](https://github.com/YamiHatsukoi/MD-Cut/releases/tag/Release) page, download the latest `MD-Cut Portable x.x.x.zip`, extract it, and run `MD-Cut.exe` inside — no installation needed. Keep the whole extracted folder together (don't move the `.exe` out on its own) since it needs its neighboring files.

</div>

---

## 🇻🇳 Tiếng Việt

<div align="center">

Cắt/ghép video, chèn chữ/nhạc/ảnh trên timeline nhiều track thực sự, rồi xuất file — chạy hoàn toàn trên máy, không upload, không mất phí.

Xây dựng bằng Electron · React · TypeScript · FFmpeg

</div>

### ✨ Tính năng

- **Timeline nhiều track** — các track Video / Audio / Text / Ảnh riêng biệt, kéo để di chuyển, kéo để cắt (trim), tách clip (`S`), và kéo-thả trực tiếp từ trình quản lý file
- **Xem trước thời gian thực** — video, âm thanh, chữ và ảnh chèn được ghép hiển thị ngay khi tua hoặc phát
- **Chèn chữ & ảnh** — kéo vị trí trực tiếp trên khung xem trước, chỉnh font/cỡ chữ/màu/tỉ lệ ở bảng thuộc tính
- **Fade in/out** — hiệu ứng mờ dần cho từng clip, áp dụng cả ở bản xem trước lẫn khi xuất file
- **Undo/redo, copy/cut/paste** — các phím tắt chỉnh sửa quen thuộc (`Ctrl+Z/Y/C/X/V`, `Delete`) hoạt động đúng như mong đợi
- **Font tùy chỉnh** — bỏ file `.ttf`/`.otf` vào thư mục `fonts/` cạnh app là tự động nhận
- **Giao diện song ngữ** — Việt / Anh, đổi được bất cứ lúc nào
- **Lưu/mở project** — file project `.mdcut.json` có thể mở lại và chỉnh sửa tiếp
- **Xuất video** — MP4/MOV/WebM, tối đa 4K, tùy chỉnh khung hình/giây, xử lý bằng FFmpeg thật với thanh tiến trình trực quan

### 🛠 Công nghệ sử dụng

| Thành phần | Lựa chọn |
|---|---|
| Nền tảng | [Electron](https://www.electronjs.org/) |
| Giao diện | [React](https://react.dev/) + TypeScript + [Vite](https://vitejs.dev/) |
| Quản lý state | [Zustand](https://github.com/pmndrs/zustand) |
| Xử lý video | [FFmpeg](https://ffmpeg.org/) (qua `ffmpeg-static`) |
| Đóng gói | [electron-builder](https://www.electron.build/) |

### 🚀 Bắt đầu

```bash
npm install
npm run dev          # chạy app ở chế độ phát triển
```

#### Đóng gói bản portable cho Windows

```bash
npm run build
npm run electron:build:portable
```

File chạy được nằm ở `release/win-unpacked/MD-Cut.exe` (nếu di chuyển thì copy nguyên thư mục `win-unpacked` — file `.exe` cần các file đi kèm bên cạnh).

### ⌨️ Phím tắt

| Phím | Chức năng |
|---|---|
| `Space` | Phát / Tạm dừng |
| `S` | Tách clip đang chọn tại vị trí playhead |
| `Delete` / `Backspace` | Xoá clip hoặc media asset đang chọn |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Ctrl+C` / `Ctrl+X` / `Ctrl+V` | Copy / Cut / Paste clip |

### 🗺 Lộ trình phát triển

Dự án được xây dựng dần theo từng giai đoạn — xem [PLAN.md](PLAN.md) để biết chi tiết từng phase và những gì còn phía trước (transition giữa các clip, hiệu ứng nâng cao hơn, v.v.).

### 📄 Giấy phép

Dự án cá nhân — hiện chưa cấp phép để phân phối lại.

<div align="right">

[⬆ Về đầu trang](#-md-cut)

</div>

---

## 🇬🇧 English

<div align="center">

Cut clips, drop in text/music/images on a real multi-track timeline, and export — all running locally, no upload, no subscription.

Built with Electron · React · TypeScript · FFmpeg

</div>

### ✨ Features

- **Multi-track timeline** — separate Video / Audio / Text / Image tracks with drag-to-move, drag-to-trim, split (`S`), and drag-and-drop straight from your file explorer
- **Real-time preview** — video, audio, text overlays and image overlays composited live as you scrub or play
- **Text & image overlays** — drag position directly on the preview canvas, adjust font/size/color/scale from the properties panel
- **Fade in/out** — per-clip fade effects, reflected in both preview and final export
- **Undo/redo, copy/cut/paste** — standard editing shortcuts (`Ctrl+Z/Y/C/X/V`, `Delete`) that actually work like you'd expect
- **Custom fonts** — drop `.ttf`/`.otf` files into the `fonts/` folder next to the app and they show up automatically
- **Bilingual UI** — Vietnamese / English, switchable anytime
- **Save/load projects** — `.mdcut.json` project files you can reopen and keep editing
- **Export** — MP4/MOV/WebM, up to 4K, configurable frame rate, real FFmpeg pipeline with a live progress bar

### 🛠 Tech stack

| Layer | Choice |
|---|---|
| Shell | [Electron](https://www.electronjs.org/) |
| UI | [React](https://react.dev/) + TypeScript + [Vite](https://vitejs.dev/) |
| State | [Zustand](https://github.com/pmndrs/zustand) |
| Video processing | [FFmpeg](https://ffmpeg.org/) (via `ffmpeg-static`) |
| Packaging | [electron-builder](https://www.electron.build/) |

### 🚀 Getting started

```bash
npm install
npm run dev          # launch the app in development mode
```

#### Build a portable Windows app

```bash
npm run build
npm run electron:build:portable
```

The runnable app is produced at `release/win-unpacked/MD-Cut.exe` (copy the whole `win-unpacked` folder if you move it — the `.exe` needs its neighboring files).

### ⌨️ Shortcuts

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `S` | Split selected clip at playhead |
| `Delete` / `Backspace` | Delete selected clip or media asset |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Ctrl+C` / `Ctrl+X` / `Ctrl+V` | Copy / Cut / Paste clip |

### 🗺 Roadmap

This project is built incrementally — see [PLAN.md](PLAN.md) for the full phase-by-phase breakdown and what's still ahead (transitions between clips, richer effects, etc).

### 📄 License

Personal project — not currently licensed for redistribution.

<div align="right">

[⬆ Back to top](#-md-cut)

</div>
