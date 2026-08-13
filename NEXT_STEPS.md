# Việc cần làm tiếp (backlog)

**Cập nhật 2026-08-13: toàn bộ 8 mục dưới đây đã hoàn thành và được test/verify (số liệu đo được + trích xuất ảnh xem trực quan).** Giữ lại file này làm tham khảo về thiết kế/quyết định đã chốt, phòng khi cần sửa lại sau.

## Đã hoàn thành

1. ✅ **Shadow/Outline cho chữ** — bật/tắt riêng từng loại, chỉnh màu/độ lệch/độ dày. Preview (canvas) + export (`drawtext` với `shadowcolor/shadowx/shadowy`, `bordercolor/borderw`) đều verify bằng ảnh trích xuất.
2. ✅ **Resizable panel** — kéo giãn được Media Library, Properties panel (kéo ngang) và Timeline (kéo dọc), lưu kích thước trong `src/store/layoutStore.ts`.
3. ✅ **Transition không ảnh hưởng video** — nguyên nhân là ngưỡng "liền kề" giữa 2 clip quá chặt (10ms). Đã nới lên 80ms + thêm snap khi kéo clip (`src/lib/timelineMath.ts`: `snapToTargets`/`collectSnapTargets`) để dễ tạo 2 clip liền khít bằng chuột.
4. ✅ **Video chỉnh được Scale/Offset** — giống hệt cơ chế đã có cho ảnh: kéo trực tiếp trên preview hoặc nhập số trong Properties panel. Export dùng kỹ thuật scale+overlay thay vì scale+pad cố định.
5. ✅ **Font không bị mất khi build lại** — chuyển nguồn font sang `MD-Cut/fonts/` (project root, không bao giờ bị `rm -rf release` đụng tới), cấu hình `electron-builder` `extraFiles` tự copy vào bản build mỗi lần đóng gói. Vị trí runtime (cạnh `MD-Cut.exe`) giữ nguyên như cũ theo yêu cầu.
6. ✅ **Fade giữ đen** — đã chốt hướng: cuối clip, fade out D1 giây rồi giữ đen/im lặng D2 giây nữa cho tới hết clip (không kéo dài thêm timeline — nằm gọn trong thời lượng clip sẵn có). UI: ô "Giữ đen sau khi fade (s)" chỉ hiện khi Fade out > 0.
7. ✅ **Thumbnail cho video** trong Media Library — chụp 1 frame ở khoảng 10% thời lượng video làm ảnh đại diện.
8. ✅ **Ctrl+lăn chuột để zoom timeline** — gắn qua native wheel listener (không dùng React onWheel vì bị passive mặc định, preventDefault không ăn).

## Giới hạn còn lại (chưa ai yêu cầu, nhưng đáng lưu ý)

- Transition (dissolve) vẫn chỉ hoạt động giữa 2 clip **video liền kề, không có gap** — chưa có wipe/fade khác ngoài dissolve.
- Effect brightness/contrast (đã có trong data model `Effect`) vẫn chưa có UI/export.
- Chỉ build Windows, chỉ bản portable (không phải installer NSIS).
