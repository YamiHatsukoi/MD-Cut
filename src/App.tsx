import { useEffect } from "react";
import { useProjectStore } from "./store/projectStore";
import { useUiStore, type PanelKind } from "./store/uiStore";
import { useFontStore } from "./store/fontStore";
import { useLayoutStore } from "./store/layoutStore";
import { useLangStore, useT } from "./i18n/useLang";
import { getProjectDuration } from "./lib/projectDuration";
import { MediaLibraryPanel } from "./components/MediaLibraryPanel";
import { Timeline } from "./components/Timeline";
import { PreviewPlayer } from "./components/PreviewPlayer";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { ExportDialog } from "./components/ExportDialog";
import { ResizeHandle } from "./components/ResizeHandle";
import flagVn from "./assets/flags/vn.png";
import flagGb from "./assets/flags/gb.png";
import "./App.css";

function findSelectedClipEntry() {
  const state = useProjectStore.getState();
  if (!state.selectedClipId) return null;
  for (const track of state.project.tracks) {
    const clip = track.clips.find((c) => c.id === state.selectedClipId);
    if (clip) return { track, clip };
  }
  return null;
}

const SIDEBAR_ITEMS: { id: PanelKind; labelKey: "media" | "audio" | "text" | "image" }[] = [
  { id: "media", labelKey: "media" },
  { id: "audio", labelKey: "audio" },
  { id: "text", labelKey: "text" },
  { id: "image", labelKey: "image" },
];

function App() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const activePanel = useUiStore((s) => s.activePanel);
  const setActivePanel = useUiStore((s) => s.setActivePanel);
  const setExportDialogOpen = useUiStore((s) => s.setExportDialogOpen);

  const project = useProjectStore((s) => s.project);
  const loadProject = useProjectStore((s) => s.loadProject);
  const sidebarWidth = useLayoutStore((s) => s.sidebarWidth);
  const mediaPanelWidth = useLayoutStore((s) => s.mediaPanelWidth);
  const propertiesPanelWidth = useLayoutStore((s) => s.propertiesPanelWidth);
  const setMediaPanelWidth = useLayoutStore((s) => s.setMediaPanelWidth);
  const setPropertiesPanelWidth = useLayoutStore((s) => s.setPropertiesPanelWidth);

  useEffect(() => {
    useFontStore.getState().loadCustomFonts();
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (isTyping) return;

      const isShortcutKey = e.ctrlKey || e.metaKey;

      if (e.code === "Space") {
        e.preventDefault();
        const state = useProjectStore.getState();
        const duration = getProjectDuration(state.project.tracks);
        if (duration <= 0) return;
        if (!state.isPlaying && state.playheadTime >= duration) {
          state.setPlayheadTime(0);
        }
        state.setIsPlaying(!state.isPlaying);
      } else if (isShortcutKey && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        useProjectStore.getState().undo();
      } else if (
        (isShortcutKey && e.key.toLowerCase() === "y") ||
        (isShortcutKey && e.shiftKey && e.key.toLowerCase() === "z")
      ) {
        e.preventDefault();
        useProjectStore.getState().redo();
      } else if (isShortcutKey && e.key.toLowerCase() === "c") {
        const entry = findSelectedClipEntry();
        if (!entry) return;
        e.preventDefault();
        useProjectStore.getState().copyClip(entry.clip);
      } else if (isShortcutKey && e.key.toLowerCase() === "x") {
        const entry = findSelectedClipEntry();
        if (!entry) return;
        e.preventDefault();
        const state = useProjectStore.getState();
        state.copyClip(entry.clip);
        state.deleteClip(entry.track.id, entry.clip.id);
      } else if (isShortcutKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        useProjectStore.getState().pasteClip();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        const state = useProjectStore.getState();
        if (state.selectedAssetId) {
          e.preventDefault();
          state.deleteMediaAsset(state.selectedAssetId);
          return;
        }
        const entry = findSelectedClipEntry();
        if (!entry) return;
        e.preventDefault();
        state.deleteClip(entry.track.id, entry.clip.id);
      } else if (e.key === "s" || e.key === "S") {
        const entry = findSelectedClipEntry();
        if (!entry) return;
        const state = useProjectStore.getState();
        state.splitClipAt(entry.track.id, entry.clip.id, state.playheadTime);
      } else if (isShortcutKey && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        useUiStore.getState().zoomIn();
      } else if (isShortcutKey && e.key === "-") {
        e.preventDefault();
        useUiStore.getState().zoomOut();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function handleSave() {
    const json = JSON.stringify(project, null, 2);
    const saved = await window.mdcut.saveProject(json, project.name);
    if (saved) await window.mdcut.autosaveClear();
  }

  async function handleOpen() {
    const result = await window.mdcut.openProject();
    if (!result) return;
    try {
      loadProject(JSON.parse(result.json));
      await window.mdcut.autosaveClear();
    } catch {
      // ignore invalid project file
    }
  }

  // Offer to restore an autosaved session left over from a crash / forgotten save.
  useEffect(() => {
    (async () => {
      const json = await window.mdcut.autosaveRead();
      if (!json) return;
      try {
        const parsed = JSON.parse(json);
        const hasContent =
          parsed?.tracks?.some((tr: { clips: unknown[] }) => tr.clips?.length > 0) ||
          parsed?.mediaLibrary?.length > 0;
        if (!hasContent) return;
        const restore = window.confirm(
          useLangStore.getState().lang === "vi"
            ? "Phát hiện phiên làm việc trước chưa lưu (có thể do app bị tắt đột ngột). Khôi phục lại?"
            : "Found an unsaved session from before (the app may have closed unexpectedly). Restore it?"
        );
        if (restore) {
          loadProject(parsed);
        } else {
          await window.mdcut.autosaveClear();
        }
      } catch {
        // corrupt autosave file — ignore
      }
    })();
  }, []);

  // Debounced autosave: write ~2s after the project settles (avoids hammering
  // disk during active drags, since those mutate `project` on every frame).
  useEffect(() => {
    const hasContent = project.tracks.some((tr) => tr.clips.length > 0) || project.mediaLibrary.length > 0;
    if (!hasContent) return;
    const timer = setTimeout(() => {
      window.mdcut.autosaveWrite(JSON.stringify(project));
    }, 2000);
    return () => clearTimeout(timer);
  }, [project]);

  return (
    <div className="app">
      <header className="topbar">
        <span className="app-title">{t("appTitle")}</span>
        <div className="topbar-actions">
          <button className="text-btn" onClick={handleOpen}>
            {t("fileMenuOpen")}
          </button>
          <button className="text-btn" onClick={handleSave}>
            {t("fileMenuSave")}
          </button>
          <button
            className="text-btn lang-toggle"
            onClick={() => setLang(lang === "vi" ? "en" : "vi")}
            title={lang === "vi" ? "Tiếng Việt" : "English"}
          >
            <img
              className="flag-icon"
              src={lang === "vi" ? flagVn : flagGb}
              alt={lang === "vi" ? "VI" : "EN"}
            />
            {lang === "vi" ? "VI" : "EN"}
          </button>
          <button className="export-btn" onClick={() => setExportDialogOpen(true)}>
            {t("export")}
          </button>
        </div>
      </header>

      <div
        className="workspace"
        style={{
          gridTemplateColumns: `${sidebarWidth}px ${mediaPanelWidth}px 5px 1fr 5px ${propertiesPanelWidth}px`,
        }}
      >
        <aside className="sidebar">
          {SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`sidebar-item${activePanel === item.id ? " active" : ""}`}
              onClick={() => setActivePanel(item.id)}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </aside>

        <MediaLibraryPanel />

        <ResizeHandle
          direction="horizontal"
          onResize={(delta) => setMediaPanelWidth(mediaPanelWidth + delta)}
        />

        <PreviewPlayer />

        <ResizeHandle
          direction="horizontal"
          onResize={(delta) => setPropertiesPanelWidth(propertiesPanelWidth - delta)}
        />

        <PropertiesPanel />
      </div>

      <Timeline />
      <ExportDialog />
    </div>
  );
}

export default App;
