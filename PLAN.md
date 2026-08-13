# Kế hoạch: App chỉnh sửa video kiểu CapCut (bản cơ bản)

## 1. Mục tiêu & phạm vi

Xây dựng app chỉnh sửa video với 4 tính năng lõi:
- Cắt/trim/tách (split) video
- Chèn chữ (text overlay) lên video
- Chèn âm thanh (audio track riêng, mix với âm thanh gốc)
- Chèn hình ảnh (image overlay) vào timeline

Giao diện lấy cảm hứng từ CapCut: sidebar công cụ bên trái, preview player ở giữa, panel thuộc tính bên phải, timeline đa track ở dưới. **Không** làm ở v1: AI auto-caption, hiệu ứng/transition nâng cao, color grading, keyframe animation phức tạp, cloud sync, collaboration.

## 2. Lựa chọn nền tảng — đã phân tích 3 phương án

| Phương án | Mô tả | Ưu điểm | Nhược điểm |
|---|---|---|---|
| A. Desktop (Electron) | React/TS UI chạy trong Electron, xử lý video bằng FFmpeg native (binary thật, không phải wasm) | Hiệu năng tốt nhất, export nhanh, truy cập file hệ thống trực tiếp, trải nghiệm gần CapCut desktop nhất | Cần đóng gói cài đặt (electron-builder), dung lượng app lớn hơn |
| B. Web app + backend | React frontend + Node.js backend, FFmpeg chạy trên server | Không cần cài đặt, dùng qua trình duyệt | Cần server xử lý (tốn tài nguyên/tiền hosting), upload/download file tốn thời gian |
| C. Web app thuần client (FFmpeg.wasm) | Toàn bộ chạy trong trình duyệt, không cần backend | Deploy cực đơn giản (static site), không cần server | Chậm hơn nhiều so với FFmpeg native, giới hạn bộ nhớ trình duyệt, khó xử lý video dài/nặng |

**Đề xuất: Phương án A — Electron desktop app.** Lý do: xử lý video (encode/decode, mix audio, overlay) đòi hỏi hiệu năng, FFmpeg native nhanh hơn wasm rất nhiều, và trải nghiệm desktop giống CapCut thật hơn. Tôi sẽ triển khai theo hướng này mặc định — bạn xác nhận lại ở câu hỏi cuối nếu muốn đổi sang web.

## 3. Kiến trúc kỹ thuật

- **UI**: React + TypeScript + Vite
- **Shell**: Electron (main process xử lý file system + gọi FFmpeg; renderer process là UI)
- **State management**: Zustand (đơn giản, đủ dùng cho timeline state)
- **Video xử lý/export**: `ffmpeg-static` (binary bundled) + `fluent-ffmpeg`, chạy trong main process qua IPC
- **Preview real-time**: thẻ `<video>` HTML5 làm nguồn, vẽ đè text/ảnh bằng `<canvas>` đồng bộ theo `currentTime`
- **Waveform audio**: `wavesurfer.js` hoặc tự decode bằng Web Audio API
- **Kéo thả timeline**: `dnd-kit`
- **Đóng gói**: `electron-builder` (xuất .exe cho Windows)

## 4. Mô hình dữ liệu (data model)

```
Project { id, name, resolution, fps, tracks: Track[] }
Track   { id, type: 'video' | 'audio' | 'text' | 'image', clips: Clip[] }
Clip    {
  id, sourceId, trackId,
  timelineStart, timelineEnd,   // vị trí trên timeline
  trimIn, trimOut,              // phần cắt trong source gốc
  // riêng cho text: content, font, size, color, position(x,y), animation
  // riêng cho image: position(x,y), scale, rotation
  // riêng cho audio: volume, fadeIn, fadeOut
}
```

Project lưu dưới dạng file `.json` (chỉ lưu tham chiếu đến file gốc, không copy media) → cho phép save/load lại để sửa tiếp.

## 5. Giao diện (layout kiểu CapCut)

```
┌─────────────────────────────────────────────────────────┐
│ Menu bar                                    [ Export ▶ ] │
├───────────┬───────────────────────────────┬──────────────┤
│  Sidebar  │                               │  Properties  │
│  - Media  │        Preview Player         │  panel       │
│  - Audio  │        (canvas + controls)    │  (thuộc tính │
│  - Text   │                               │  clip đang   │
│  - Image  │                               │  chọn)       │
├───────────┴───────────────────────────────┴──────────────┤
│  Timeline (đa track, zoom, playhead, split tool)          │
│  [Video track] [Audio track] [Text track] [Image track]   │
└─────────────────────────────────────────────────────────┘
```

## 6. Danh sách tính năng chi tiết

1. **Import media**: kéo thả hoặc chọn file video/audio/ảnh vào thư viện media
2. **Timeline đa track**: kéo clip từ thư viện vào track, di chuyển, kéo cạnh để trim
3. **Cắt video (Split)**: đặt playhead tại vị trí cần cắt, nhấn phím tắt (S) hoặc nút Split → tách clip thành 2
4. **Chèn text**: thêm text track, chỉnh nội dung/font/size/màu/vị trí/thời gian bắt đầu-kết thúc, fade in/out cơ bản
5. **Chèn audio**: thêm audio track, hiển thị waveform, chỉnh volume, trim, fade in/out
6. **Chèn hình ảnh**: overlay ảnh lên track riêng, resize/di chuyển vị trí, set thời gian hiển thị
7. **Preview tổng hợp**: xem trước tất cả track cùng lúc, đồng bộ thời gian
8. **Export**: ghép toàn bộ timeline qua FFmpeg filter_complex, xuất MP4, có progress bar

## 7. Lộ trình triển khai (phases)

| Phase | Nội dung | Kết quả |
|---|---|---|
| 0 | Setup Electron + React + TS + Vite, cấu trúc thư mục | Chạy được app rỗng |
| 1 | Import video + preview player (play/pause/seek) | Xem được video import vào |
| 2 | Timeline 1 track video: hiển thị clip, trim, split | Cắt được video cơ bản |
| 3 | Multi-track: thêm audio/text/image track vào state + UI | Timeline có nhiều loại track |
| 4 | Text overlay: thêm/sửa/render lên canvas preview | Text hiện trên preview đúng thời điểm |
| 5 | Audio track: import, waveform, volume, trim | Nghe được audio thêm vào, mix với gốc |
| 6 | Image overlay: import, resize/position trên canvas | Ảnh hiện đúng vị trí/thời gian |
| 7 | Export: build FFmpeg filter_complex từ toàn bộ timeline | Xuất được file MP4 hoàn chỉnh |
| 8 | Polish: dark theme giống CapCut, phím tắt, undo/redo | App dùng mượt, giống CapCut hơn |

## 8. Rủi ro kỹ thuật cần lưu ý

- **FFmpeg filter_complex** phức tạp dần khi có nhiều track (video + overlay ảnh + text + mix audio) — cần thiết kế hàm build filter graph từ data model ngay từ Phase 3, tránh vá chắp.
- **Đồng bộ preview**: canvas vẽ đè lên `<video>` cần đồng bộ theo `currentTime` bằng `requestAnimationFrame`, dễ bị lệch nếu không cẩn thận.
- **Undo/redo**: nên dùng cấu trúc state immutable (Zustand + Immer) và command pattern ngay từ đầu, thêm sau sẽ tốn công refactor.

## 9. Quyết định đã chốt (2026-08-13)

1. **Nền tảng**: Desktop (Electron) — chốt.
2. **Hệ điều hành target**: chỉ Windows.
3. **Ngôn ngữ giao diện**: hỗ trợ cả tiếng Việt và tiếng Anh (i18n, toggle trong app).
4. **Save/load project**: có — lưu project dạng file `.json` (tham chiếu đến media gốc), mở lại để sửa tiếp.
5. **Định dạng export**: giống CapCut — hỗ trợ nhiều định dạng phổ biến (MP4/H.264, MOV, WebM). UI export phải có đầy đủ lựa chọn (định dạng, độ phân giải, fps) + progress bar khi đang xuất.
6. **Giới hạn kỹ thuật**: cho phép export tối đa **4K**, người dùng chọn được **fps** (24/25/30/60...).
7. **Import asset kiểu CapCut**: có 1 tab "Media Library" chứa asset đã import (video/audio/ảnh), kéo-thả từ đó vào timeline — không import thẳng file rồi tự nhảy vào track.
8. **Effect & Transition cơ bản**: cần hỗ trợ một số transition đơn giản giữa 2 đoạn cắt liền nhau trên timeline (fade, dissolve, wipe...) và một vài effect cơ bản áp lên clip (brightness/contrast, fade in/out...).

## 10. Cập nhật kiến trúc/data model theo quyết định trên

- **i18n**: dictionary đơn giản `vi`/`en` dạng key-value, lưu ngôn ngữ đang chọn trong local state (sau này persist vào settings file).
- **MediaAsset**: model riêng cho item trong Media Library (khác với Clip trên timeline) — 1 asset có thể được kéo vào timeline nhiều lần thành nhiều Clip khác nhau.
- **Transition**: gắn vào điểm nối giữa 2 clip liền kề trên cùng track (video), có `type` (fade/dissolve/wipe) và `duration`.
- **Effect**: mảng effect gắn trên từng Clip (video/image), mỗi effect có `type` và `params`.
- **Export settings**: `{ format: 'mp4'|'mov'|'webm', resolution: '720p'|'1080p'|'4k', fps: number }`, build lệnh FFmpeg tương ứng.
- **Project file**: `.mdcut.json` chứa toàn bộ `Project` (tracks, clips, mediaLibrary, transitions) — Save/Load qua Electron `dialog` + `fs`.

## 11. Lộ trình triển khai — cập nhật (2026-08-13, sau vòng hoàn thiện lớn)

| Phase | Nội dung |
|---|---|
| 0 | ✅ Setup Electron + React + TS + Vite |
| 1 | ✅ Media Library panel + import, i18n, Save/Load project, Export dialog UI |
| 2 | ✅ Kéo-thả asset vào timeline (tự nhận đúng track), di chuyển/trim clip, Split, ruler + playhead, **zoom timeline** |
| 3 | ✅ Preview player thật + canvas overlay text/image, Play/Pause, **kéo chỉnh vị trí text/ảnh trực tiếp trên preview** |
| 4 | ✅ Text overlay đầy đủ: font (tự chọn từ system + folder `fonts/` tự thêm), size, color, vị trí X/Y |
| 5 | ✅ Audio track: **waveform hiển thị trên timeline** (cả clip audio lẫn video), volume, fade in/out |
| 6 | ✅ Image overlay: scale + vị trí X/Y chỉnh qua Properties panel hoặc kéo trên preview |
| 7 | ✅ Transition dissolve giữa 2 clip video liền kề (nút "+" giữa 2 clip trên timeline), dùng ffmpeg `xfade` |
| 8 | ✅ Export engine viết lại theo mô hình "định vị đúng theo timeline": giữ đúng **gap** (nền đen thay vì nối liền), mix **audio track riêng** đúng vị trí, đưa **text + image** vào file xuất, tự phát hiện clip không có audio |
| 9 | ✅ Undo/redo đầy đủ (stress-tested), Copy/Cut/Paste, **Autosave + khôi phục sau crash**, mở thư mục sau khi export, UI tách biệt màu sắc rõ ràng |

### Còn lại / giới hạn đã biết
- **Transition chỉ hỗ trợ dissolve**, chỉ áp dụng được giữa 2 clip **liền kề không có gap** trên track Video (chưa có wipe/fade khác).
- **Effect brightness/contrast** (đã định nghĩa trong data model `Effect`) chưa có UI chỉnh và chưa áp dụng vào export — mới có fade in/out.
- Build **installer NSIS** (.exe cài đặt) bị chặn bởi giới hạn quyền symlink của Windows trên máy dev hiện tại — chỉ có bản portable (`release/win-unpacked`).
- Chỉ build cho **Windows**, chưa hỗ trợ macOS/Linux.

Ghi chú: toàn bộ export engine (gap-correctness, audio track mixing, text/image overlay, transition dissolve) đã được verify bằng test đo số liệu thực tế (độ sáng trung bình khung hình, mức âm lượng theo mốc thời gian) và trích xuất ảnh thật để xem trực quan — không chỉ dựa vào "không báo lỗi".
