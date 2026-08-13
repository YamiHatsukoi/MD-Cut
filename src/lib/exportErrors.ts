import { useLangStore } from "../i18n/useLang";

interface ErrorRule {
  test: RegExp;
  vi: string;
  en: string;
}

const RULES: ErrorRule[] = [
  {
    test: /No such file or directory|does not exist/i,
    vi: "Không tìm thấy một file nguồn (video/ảnh/âm thanh). File có thể đã bị xoá hoặc di chuyển.",
    en: "A source file (video/image/audio) could not be found. It may have been deleted or moved.",
  },
  {
    test: /Permission denied/i,
    vi: "Không có quyền ghi vào thư mục xuất. Hãy thử chọn thư mục khác hoặc đóng file đang mở bằng chương trình khác.",
    en: "Permission denied writing the output file. Try a different folder, or close the file if it's open elsewhere.",
  },
  {
    test: /No space left on device/i,
    vi: "Ổ đĩa đã hết dung lượng trống.",
    en: "The disk is out of free space.",
  },
  {
    test: /Cannot load font|fontfile|freetype/i,
    vi: "Không tải được font chữ. Kiểm tra lại font đã chọn trong thư mục fonts/ cạnh app.",
    en: "The selected font could not be loaded. Check the font file in the fonts/ folder next to the app.",
  },
  {
    test: /Invalid data found when processing input|moov atom not found|Error while decoding/i,
    vi: "Một file media bị hỏng hoặc không đúng định dạng, không thể đọc được.",
    en: "A media file is corrupted or in an unsupported format and could not be read.",
  },
  {
    test: /ffmpeg binary not found/i,
    vi: "Không tìm thấy chương trình xử lý video (ffmpeg) đi kèm app. Hãy thử cài đặt lại app.",
    en: "The bundled video processor (ffmpeg) could not be found. Try reinstalling the app.",
  },
  {
    test: /Unrecognized option|Invalid argument/i,
    vi: "Cấu hình xuất video không hợp lệ (định dạng/độ phân giải/fps).",
    en: "Invalid export settings (format/resolution/fps).",
  },
];

/** Translates a raw error (typically ffmpeg stderr, or an IPC error message)
 * into a short, friendly sentence for common, recognizable failure causes.
 * Falls back to a generic message with the raw text attached for anything
 * unrecognized, so nothing is ever silently hidden from the user. */
export function friendlyExportError(raw: string): string {
  const lang = useLangStore.getState().lang;
  for (const rule of RULES) {
    if (rule.test.test(raw)) {
      return lang === "vi" ? rule.vi : rule.en;
    }
  }
  const genericPrefix =
    lang === "vi" ? "Xuất video thất bại. Chi tiết lỗi:" : "Export failed. Error details:";
  return `${genericPrefix}\n${raw.slice(0, 500)}`;
}
