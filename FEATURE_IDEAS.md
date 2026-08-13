# Đề xuất cải thiện app (chờ duyệt)

**Cập nhật 2026-08-13: 13 mục đã đánh dấu (1, 3, 5, 6, 10, 11, 12, 21, 22, 23, 24, 27, 28) + mục 31 đã hoàn thành, type-check sạch, và build/đóng gói portable lại thành công.** Chi tiết/giới hạn từng mục ghi ngay dưới mục đó.

## A. Chỉnh sửa video/ảnh nâng cao

- [x] **1. Xoay clip (Rotate)** ✅ — preview (CSS transform cho video, canvas rotate cho ảnh) + export (`rotate` filter, giữ khung/canvas đen liền mạch, không lộ góc trắng). UI: ô "Xoay (°)" cạnh Scale.
- [ ] **2. Crop (cắt khung hình)** cho video/ảnh — khác với scale/offset hiện tại (thu nhỏ+di chuyển cả khung), crop là cắt bỏ phần thừa. *(vừa)*
- [x] **3. Chỉnh tốc độ clip (Speed)** ✅ — 0.25x–4x, cả hình (`setpts`) lẫn tiếng (`atempo`, tự chia nhỏ nếu ngoài khoảng 0.5–2). Đổi speed sẽ tự co giãn độ dài clip trên timeline theo tốc độ mới (không tự ripple các clip khác — cần bật Ripple riêng nếu muốn).
- [ ] **4. Thêm transition khác ngoài Dissolve** — Wipe, Slide, Zoom... *(dễ, tận dụng hạ tầng đã có)*
- [x] **5. Filter màu cơ bản** (brightness/contrast/saturation) ✅ — 3 thanh trượt trong Properties panel, preview qua CSS/canvas filter, export qua `eq` filter (áp trước khi pad/rotate nên không làm xám viền đen).
- [x] **6. Text animation** ✅ — 2 kiểu: Trượt vào/ra (từ dưới lên) và Phóng to/nhỏ, chỉnh được thời lượng hiệu ứng. Preview qua canvas transform, export qua biểu thức `t` động trong `drawtext` (x/y hoặc fontsize theo thời gian).
- [ ] **7. Chroma key (nền xanh/lục)** — tách nền cho clip quay phông xanh. *(khó hơn)*
- [ ] **8. Picture-in-picture / nhiều track video chồng nhau** *(khó — ảnh hưởng kiến trúc nhiều track cùng loại)*
- [ ] **9. Keyframe animation** cho vị trí/scale/rotation *(khó — thay đổi lớn ở data model + export)*

## B. Timeline & thao tác chỉnh sửa

- [x] **10. Chọn nhiều clip cùng lúc** ✅ — Ctrl/Shift+click để chọn thêm, kéo di chuyển cả nhóm cùng lúc, xoá hàng loạt bằng phím Delete hoặc nút trên toolbar. *(giới hạn: kéo nhóm không tự tránh chồng lấn giữa các clip trong nhóm)*
- [x] **11. Ripple delete/trim** ✅ — nút "🧲 Ripple" trên toolbar timeline để bật/tắt; khi bật, xoá clip hoặc kéo ngắn mép phải sẽ tự trượt các clip phía sau lên khít lại (cùng track).
- [x] **12. Khoá / ẩn / tắt tiếng riêng từng track** ✅ — 3 icon trên đầu mỗi track (🔒 khoá, 👁 ẩn, 🔊 tắt tiếng cho track Video/Audio). Track khoá không kéo/trim được; track ẩn không hiện trong preview lẫn export; track tắt tiếng bị loại khỏi audio mix.
- [ ] **13. Thêm/xoá track tuỳ ý** *(khó — đổi kiến trúc)*
- [ ] **14. Nút "Zoom to fit"** *(dễ)*
- [ ] **15. Marker/đánh dấu mốc** trên timeline *(dễ)*
- [ ] **16. Bảng lịch sử Undo/Redo** *(vừa)*
- [ ] **17. Snap thêm vào vị trí playhead** khi kéo clip *(dễ)*

## C. Âm thanh

- [ ] **18. Audio ducking** *(khó)*
- [ ] **19. Ghi âm giọng nói trực tiếp** (voiceover) *(vừa)*
- [ ] **20. Đường bao âm lượng dạng đồ thị (volume envelope)** *(khó)*

## D. Quản lý project & xuất file

- [x] **21. Danh sách project gần đây** ✅ — nút "Gần đây ▾" cạnh "Mở project" trên topbar, lưu tối đa 10 project (đường dẫn + tên) trong userData, tự lọc bỏ file không còn tồn tại.
- [x] **22. Export presets** ✅ — dropdown "Mẫu xuất nhanh": YouTube 1080p, YouTube 4K, TikTok/Reels/Shorts (9:16), Instagram vuông (1:1), Web nhẹ (WebM 720p). Chọn preset tự set Format/Độ phân giải/FPS, vẫn chỉnh tay được sau đó.
- [x] **23. Tỉ lệ khung hình dọc/vuông** ✅ — thêm các độ phân giải 9:16 và 1:1 (720p/1080p) vào danh sách xuất. *(giới hạn: đây là tỉ lệ khi XUẤT, canvas preview khi chỉnh sửa vẫn giữ 16:9 — không đổi kiến trúc project.resolution)*
- [x] **24. Cảnh báo khi file gốc bị mất** ✅ — trước khi xuất, app kiểm tra toàn bộ file video/ảnh/âm thanh còn tồn tại không; nếu thiếu sẽ liệt kê ra và hỏi "Vẫn xuất" (bỏ qua phần thiếu) hay Huỷ.
- [ ] **25. Nhiều bản autosave theo lịch sử** *(dễ)*

## E. Hiệu năng & trải nghiệm

- [ ] **26. Preview chất lượng thấp cho file nặng/4K** *(khó)*
- [x] **27. Thanh loading khi đang phân tích file mới import** ✅ — spinner + chữ "Đang xử lý file..." trong khi đang lấy thời lượng/tạo thumbnail (cả nhập qua nút lẫn kéo-thả).
- [x] **28. Thông báo lỗi export dễ hiểu hơn** ✅ — `src/lib/exportErrors.ts` nhận diện các lỗi ffmpeg thường gặp (thiếu file, không tải được font, hết dung lượng ổ đĩa, sai quyền ghi, file hỏng...) và dịch sang câu dễ hiểu theo đúng ngôn ngữ đang chọn; lỗi lạ vẫn hiện kèm chi tiết gốc để không giấu thông tin.
- [ ] **29. Đổi giao diện Sáng/Tối** *(vừa)*
- [ ] **30. Tuỳ chỉnh phím tắt** *(vừa)*
- [x] **31. Localize đầy đủ hơn** ✅ — quét lại toàn bộ `src/components`, chuyển hết chuỗi tiếng Việt/Anh hard-code còn sót (Properties panel, Timeline, Media Library, Export dialog) sang hệ thống `t()` với cặp khoá vi/en đầy đủ trong `src/i18n/translations.ts`.
---

**Gợi ý của tôi nếu bạn không có thời gian duyệt hết**: làm nhóm "dễ" trước (1, 4, 5, 12, 14, 15, 17, 21, 22, 24, 25, 27) — nhiều cái tận dụng lại hạ tầng đã xây rồi, tốn ít công mà tăng trải nghiệm rõ rệt; đặc biệt mục 1 và 5 là dở dang từ trước, nên hoàn thiện nốt trước tiên.
