import { create } from "zustand";
import { translations, type Lang, type TranslationKey } from "./translations";

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLangStore = create<LangState>((set) => ({
  lang: "vi",
  setLang: (lang) => set({ lang }),
}));

export function useT() {
  const lang = useLangStore((s) => s.lang);
  return (key: TranslationKey) => translations[lang][key];
}
