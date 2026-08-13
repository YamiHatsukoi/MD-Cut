import type { MdCutApi } from "../electron/preload";

declare global {
  interface Window {
    mdcut: MdCutApi;
  }
}

export {};
