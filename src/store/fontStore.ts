import { create } from "zustand";

interface FontState {
  customFontNames: string[];
  loadCustomFonts: () => Promise<void>;
}

export const useFontStore = create<FontState>((set) => ({
  customFontNames: [],
  loadCustomFonts: async () => {
    const fonts = await window.mdcut.listCustomFonts();
    const loadedNames: string[] = [];
    for (const font of fonts) {
      try {
        const face = new FontFace(font.name, `url("${font.fileUrl}")`);
        await face.load();
        document.fonts.add(face);
        loadedNames.push(font.name);
      } catch {
        // Skip files that fail to parse/load (corrupt file, unsupported format, duplicate name, ...)
      }
    }
    set({ customFontNames: loadedNames });
  },
}));
