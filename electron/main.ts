import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from "electron";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { pathToFileURL } from "node:url";
import {
  runExport,
  type ExportVideoClipInput,
  type ExportAudioOverlayInput,
  type ExportTextOverlayInput,
  type ExportImageOverlayInput,
} from "./ffmpegExport";
import type { ExportFormat, ExportResolution } from "../src/types";

process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

let win: BrowserWindow | null = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: "#18181b",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

Menu.setApplicationMenu(null);

const FONT_EXTENSIONS = [".ttf", ".otf", ".woff", ".woff2"];

function getFontsDir(): string {
  const dir = app.isPackaged
    ? path.join(path.dirname(app.getPath("exe")), "fonts")
    : path.join(process.env.APP_ROOT!, "fonts");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}
getFontsDir();

const WINDOWS_FONT_MAP: Record<string, string> = {
  arial: "arial.ttf",
  "times new roman": "times.ttf",
  "segoe ui": "segoeui.ttf",
  tahoma: "tahoma.ttf",
  verdana: "verdana.ttf",
  calibri: "calibri.ttf",
  georgia: "georgia.ttf",
  "courier new": "cour.ttf",
  "comic sans ms": "comic.ttf",
  impact: "impact.ttf",
  "sans-serif": "arial.ttf",
  serif: "times.ttf",
  monospace: "cour.ttf",
};

/** Resolves a font family name (as picked in the Properties panel) to a real
 * .ttf/.otf file on disk, since ffmpeg's drawtext needs an actual file path
 * rather than a font name. Custom fonts (from the fonts/ folder) win; common
 * presets fall back to their usual Windows system font file; anything else
 * falls back to Arial. */
function resolveFontFile(fontFamily: string): string {
  const normalized = fontFamily.trim().toLowerCase();
  const dir = getFontsDir();
  try {
    const files = fs
      .readdirSync(dir)
      .filter((f) => FONT_EXTENSIONS.includes(path.extname(f).toLowerCase()));
    for (const f of files) {
      const derivedName = path
        .basename(f, path.extname(f))
        .replace(/[-_]+/g, " ")
        .trim()
        .toLowerCase();
      if (derivedName === normalized) return path.join(dir, f);
    }
  } catch {
    // ignore, fall through to system fonts
  }
  const winFontsDir = path.join(process.env.WINDIR || "C:\\Windows", "Fonts");
  const mapped = WINDOWS_FONT_MAP[normalized];
  if (mapped) {
    const p = path.join(winFontsDir, mapped);
    if (fs.existsSync(p)) return p;
  }
  return path.join(winFontsDir, "arial.ttf");
}

ipcMain.handle("fonts:list", () => {
  const dir = getFontsDir();
  const files = fs
    .readdirSync(dir)
    .filter((f) => FONT_EXTENSIONS.includes(path.extname(f).toLowerCase()));
  return files.map((f) => ({
    name: path.basename(f, path.extname(f)).replace(/[-_]+/g, " ").trim(),
    fileUrl: pathToFileURL(path.join(dir, f)).href,
  }));
});

ipcMain.handle("ping", () => "pong");

ipcMain.handle("path:toFileUrl", (_event, filePath: string) => pathToFileURL(filePath).href);

ipcMain.handle("dialog:openMedia", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile", "multiSelections"],
    filters: [
      { name: "Media", extensions: ["mp4", "mov", "webm", "mkv", "mp3", "wav", "aac", "m4a", "png", "jpg", "jpeg", "webp"] },
      { name: "Video", extensions: ["mp4", "mov", "webm", "mkv"] },
      { name: "Audio", extensions: ["mp3", "wav", "aac", "m4a"] },
      { name: "Image", extensions: ["png", "jpg", "jpeg", "webp"] },
    ],
  });
  if (result.canceled) return [];
  return result.filePaths.map((filePath) => ({
    filePath,
    fileUrl: pathToFileURL(filePath).href,
    name: path.basename(filePath),
    ext: path.extname(filePath).toLowerCase().replace(".", ""),
  }));
});

ipcMain.handle("dialog:saveProject", async (_event, json: string, defaultName: string) => {
  const result = await dialog.showSaveDialog({
    defaultPath: `${defaultName}.mdcut.json`,
    filters: [{ name: "MD-Cut Project", extensions: ["mdcut.json", "json"] }],
  });
  if (result.canceled || !result.filePath) return null;
  fs.writeFileSync(result.filePath, json, "utf-8");
  return result.filePath;
});

ipcMain.handle("dialog:openProject", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "MD-Cut Project", extensions: ["json"] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  const json = fs.readFileSync(filePath, "utf-8");
  return { filePath, json };
});

interface RawTextOverlay {
  content: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  xPct: number;
  yPct: number;
  timelineStart: number;
  timelineEnd: number;
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  outlineEnabled?: boolean;
  outlineColor?: string;
  outlineWidth?: number;
  animation?: "none" | "slide" | "zoom";
  animationDuration?: number;
}

ipcMain.handle(
  "export:run",
  async (
    event,
    videoClips: ExportVideoClipInput[],
    audioOverlays: ExportAudioOverlayInput[],
    rawTextOverlays: RawTextOverlay[],
    imageOverlays: ExportImageOverlayInput[],
    settings: {
      format: ExportFormat;
      resolution: ExportResolution;
      fps: number;
      totalDuration: number;
    }
  ) => {
    const result = await dialog.showSaveDialog({
      defaultPath: `export.${settings.format}`,
      filters: [{ name: settings.format.toUpperCase(), extensions: [settings.format] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true as const };

    // Write each caption to its own temp file so the actual text content
    // never has to be escaped into the ffmpeg filtergraph string.
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mdcut-export-"));
    const textOverlays: ExportTextOverlayInput[] = rawTextOverlays.map((t, i) => {
      const textFilePath = path.join(tmpDir, `caption-${i}.txt`);
      fs.writeFileSync(textFilePath, t.content, "utf-8");
      return {
        fontFile: resolveFontFile(t.fontFamily),
        textFilePath,
        fontSize: t.fontSize,
        color: t.color,
        xPct: t.xPct,
        yPct: t.yPct,
        timelineStart: t.timelineStart,
        timelineEnd: t.timelineEnd,
        shadowEnabled: t.shadowEnabled,
        shadowColor: t.shadowColor,
        shadowOffsetX: t.shadowOffsetX,
        shadowOffsetY: t.shadowOffsetY,
        outlineEnabled: t.outlineEnabled,
        outlineColor: t.outlineColor,
        outlineWidth: t.outlineWidth,
        animation: t.animation,
        animationDuration: t.animationDuration,
      };
    });

    const sender = event.sender;
    const controller = new AbortController();
    // If the window is closed/reloaded mid-export, stop ffmpeg.
    const abortExport = () => controller.abort();
    sender.once("destroyed", abortExport);

    try {
      await runExport(
        videoClips,
        audioOverlays,
        textOverlays,
        imageOverlays,
        { ...settings, outputPath: result.filePath },
        (ratio) => {
          if (!sender.isDestroyed()) {
            sender.send("export:progress", ratio);
          }
        },
        controller.signal
      );
    } finally {
      if (!sender.isDestroyed()) sender.removeListener("destroyed", abortExport);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    shell.showItemInFolder(result.filePath);
    return { canceled: false as const, outputPath: result.filePath };
  }
);

ipcMain.handle("shell:showItemInFolder", (_event, filePath: string) => {
  shell.showItemInFolder(filePath);
});

ipcMain.handle("files:checkExist", (_event, filePaths: string[]) =>
  filePaths.filter((p) => !fs.existsSync(p))
);

const RECENT_PROJECTS_PATH = path.join(app.getPath("userData"), "recent-projects.json");
const MAX_RECENT_PROJECTS = 10;

interface RecentProjectEntry {
  filePath: string;
  name: string;
  openedAt: number;
}

function readRecentProjects(): RecentProjectEntry[] {
  if (!fs.existsSync(RECENT_PROJECTS_PATH)) return [];
  try {
    const list = JSON.parse(fs.readFileSync(RECENT_PROJECTS_PATH, "utf-8")) as RecentProjectEntry[];
    return list.filter((e) => fs.existsSync(e.filePath));
  } catch {
    return [];
  }
}

ipcMain.handle("recentProjects:list", () => readRecentProjects());

ipcMain.handle("recentProjects:add", (_event, filePath: string, name: string) => {
  const existing = readRecentProjects().filter((e) => e.filePath !== filePath);
  const updated = [{ filePath, name, openedAt: Date.now() }, ...existing].slice(
    0,
    MAX_RECENT_PROJECTS
  );
  fs.writeFileSync(RECENT_PROJECTS_PATH, JSON.stringify(updated), "utf-8");
});

ipcMain.handle("recentProjects:open", (_event, filePath: string) => {
  if (!fs.existsSync(filePath)) return null;
  try {
    return { filePath, json: fs.readFileSync(filePath, "utf-8") };
  } catch {
    return null;
  }
});

const AUTOSAVE_PATH = path.join(app.getPath("userData"), "autosave.mdcut.json");

ipcMain.handle("autosave:write", (_event, json: string) => {
  fs.writeFileSync(AUTOSAVE_PATH, json, "utf-8");
});

ipcMain.handle("autosave:read", () => {
  if (!fs.existsSync(AUTOSAVE_PATH)) return null;
  try {
    return fs.readFileSync(AUTOSAVE_PATH, "utf-8");
  } catch {
    return null;
  }
});

ipcMain.handle("autosave:clear", () => {
  if (fs.existsSync(AUTOSAVE_PATH)) {
    fs.unlinkSync(AUTOSAVE_PATH);
  }
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
