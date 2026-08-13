import { useProjectStore } from "../store/projectStore";
import { useFontStore } from "../store/fontStore";
import { useT } from "../i18n/useLang";
import {
  getFadeInDuration,
  getFadeOutDuration,
  getFadeOutHoldDuration,
  withFadeDuration,
  withFadeOutHold,
  getColorAdjust,
  withColorAdjust,
} from "../lib/effects";
import type { Clip, TextAnimation } from "../types";

const GENERIC_FONTS = ["sans-serif", "serif", "monospace"];

function pushHistoryOnFocus() {
  useProjectStore.getState().pushHistory();
}

export function PropertiesPanel() {
  const t = useT();
  const selectedClipId = useProjectStore((s) => s.selectedClipId);
  const tracks = useProjectStore((s) => s.project.tracks);
  const updateClip = useProjectStore((s) => s.updateClip);
  const customFontNames = useFontStore((s) => s.customFontNames);
  const fontOptions = [...customFontNames, ...GENERIC_FONTS];

  let selectedClip: Clip | null = null;
  let selectedTrackId = "";
  for (const track of tracks) {
    const found = track.clips.find((c) => c.id === selectedClipId);
    if (found) {
      selectedClip = found;
      selectedTrackId = track.id;
      break;
    }
  }

  if (!selectedClip) {
    return (
      <aside className="properties-panel">
        <h3>{t("properties")}</h3>
        <p className="hint">{t("propertiesHint")}</p>
      </aside>
    );
  }

  const clip = selectedClip;
  const trackId = selectedTrackId;

  function patchClip(updater: (c: Clip) => Clip) {
    updateClip(trackId, clip.id, updater);
  }

  const fadeIn = getFadeInDuration(clip);
  const fadeOut = getFadeOutDuration(clip);
  const fadeOutHold = getFadeOutHoldDuration(clip);
  const colorAdjust = getColorAdjust(clip);

  return (
    <aside className="properties-panel">
      <h3>{t("properties")}</h3>
      <div className="properties-content">
        <div className="prop-row">
          <span className="prop-label">{t("propLabel")}</span>
          <span>{clip.label}</span>
        </div>
        <div className="prop-row">
          <span className="prop-label">{t("propDuration")}</span>
          <span>{(clip.timelineEnd - clip.timelineStart).toFixed(1)}s</span>
        </div>

        {clip.text && (
          <>
            <label className="field">
              <span>{t("textContent")}</span>
              <input
                type="text"
                value={clip.text.content}
                onFocus={pushHistoryOnFocus}
                onChange={(e) =>
                  patchClip((c) => ({ ...c, text: { ...c.text!, content: e.target.value } }))
                }
              />
            </label>
            <label className="field">
              <span>{t("fontLabel")}</span>
              <select
                value={clip.text.fontFamily}
                onFocus={pushHistoryOnFocus}
                onChange={(e) =>
                  patchClip((c) => ({ ...c, text: { ...c.text!, fontFamily: e.target.value } }))
                }
              >
                {!fontOptions.includes(clip.text.fontFamily) && (
                  <option value={clip.text.fontFamily}>{clip.text.fontFamily}</option>
                )}
                {fontOptions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            {customFontNames.length === 0 && (
              <p className="hint">{t("customFontHint")}</p>
            )}
            <div className="field-row">
              <label className="field">
                <span>{t("sizeLabel")}</span>
                <input
                  type="number"
                  min={8}
                  max={200}
                  value={clip.text.fontSize}
                  onFocus={pushHistoryOnFocus}
                  onChange={(e) =>
                    patchClip((c) => ({
                      ...c,
                      text: { ...c.text!, fontSize: Number(e.target.value) || 1 },
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>{t("colorLabel")}</span>
                <input
                  type="color"
                  value={clip.text.color}
                  onFocus={pushHistoryOnFocus}
                  onChange={(e) =>
                    patchClip((c) => ({ ...c, text: { ...c.text!, color: e.target.value } }))
                  }
                />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>{t("xPctLabel")}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={Math.round(clip.text.x)}
                  onFocus={pushHistoryOnFocus}
                  onChange={(e) =>
                    patchClip((c) => ({ ...c, text: { ...c.text!, x: Number(e.target.value) } }))
                  }
                />
              </label>
              <label className="field">
                <span>{t("yPctLabel")}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={Math.round(clip.text.y)}
                  onFocus={pushHistoryOnFocus}
                  onChange={(e) =>
                    patchClip((c) => ({ ...c, text: { ...c.text!, y: Number(e.target.value) } }))
                  }
                />
              </label>
            </div>
            <label className="field">
              <span>{t("textAnimationLabel")}</span>
              <select
                value={clip.text.animation ?? "none"}
                onFocus={pushHistoryOnFocus}
                onChange={(e) =>
                  patchClip((c) => ({
                    ...c,
                    text: { ...c.text!, animation: e.target.value as TextAnimation },
                  }))
                }
              >
                <option value="none">{t("animNone")}</option>
                <option value="slide">{t("animSlide")}</option>
                <option value="zoom">{t("animZoom")}</option>
              </select>
            </label>
            {(clip.text.animation ?? "none") !== "none" && (
              <label className="field">
                <span>{t("animDurationLabel")}</span>
                <input
                  type="number"
                  min={0.1}
                  max={5}
                  step={0.1}
                  value={clip.text.animationDuration ?? 0.4}
                  onFocus={pushHistoryOnFocus}
                  onChange={(e) =>
                    patchClip((c) => ({
                      ...c,
                      text: { ...c.text!, animationDuration: Number(e.target.value) || 0.1 },
                    }))
                  }
                />
              </label>
            )}
            <label className="field checkbox-field">
              <input
                type="checkbox"
                checked={clip.text.shadowEnabled ?? false}
                onFocus={pushHistoryOnFocus}
                onChange={(e) =>
                  patchClip((c) => ({
                    ...c,
                    text: { ...c.text!, shadowEnabled: e.target.checked },
                  }))
                }
              />
              <span>{t("shadowLabel")}</span>
            </label>
            {clip.text.shadowEnabled && (
              <div className="field-row">
                <label className="field">
                  <span>{t("shadowColorLabel")}</span>
                  <input
                    type="color"
                    value={clip.text.shadowColor ?? "#000000"}
                    onFocus={pushHistoryOnFocus}
                    onChange={(e) =>
                      patchClip((c) => ({ ...c, text: { ...c.text!, shadowColor: e.target.value } }))
                    }
                  />
                </label>
                <label className="field">
                  <span>{t("offsetXLabel")}</span>
                  <input
                    type="number"
                    value={clip.text.shadowOffsetX ?? 2}
                    onFocus={pushHistoryOnFocus}
                    onChange={(e) =>
                      patchClip((c) => ({
                        ...c,
                        text: { ...c.text!, shadowOffsetX: Number(e.target.value) },
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>{t("offsetYLabel")}</span>
                  <input
                    type="number"
                    value={clip.text.shadowOffsetY ?? 2}
                    onFocus={pushHistoryOnFocus}
                    onChange={(e) =>
                      patchClip((c) => ({
                        ...c,
                        text: { ...c.text!, shadowOffsetY: Number(e.target.value) },
                      }))
                    }
                  />
                </label>
              </div>
            )}

            <label className="field checkbox-field">
              <input
                type="checkbox"
                checked={clip.text.outlineEnabled ?? false}
                onFocus={pushHistoryOnFocus}
                onChange={(e) =>
                  patchClip((c) => ({
                    ...c,
                    text: { ...c.text!, outlineEnabled: e.target.checked },
                  }))
                }
              />
              <span>{t("outlineLabel")}</span>
            </label>
            {clip.text.outlineEnabled && (
              <div className="field-row">
                <label className="field">
                  <span>{t("outlineColorLabel")}</span>
                  <input
                    type="color"
                    value={clip.text.outlineColor ?? "#000000"}
                    onFocus={pushHistoryOnFocus}
                    onChange={(e) =>
                      patchClip((c) => ({ ...c, text: { ...c.text!, outlineColor: e.target.value } }))
                    }
                  />
                </label>
                <label className="field">
                  <span>{t("outlineWidthLabel")}</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={clip.text.outlineWidth ?? 3}
                    onFocus={pushHistoryOnFocus}
                    onChange={(e) =>
                      patchClip((c) => ({
                        ...c,
                        text: { ...c.text!, outlineWidth: Number(e.target.value) },
                      }))
                    }
                  />
                </label>
              </div>
            )}

            <p className="hint">{t("dragTextHint")}</p>
          </>
        )}

        {(trackId.startsWith("track-image") || trackId.startsWith("track-video")) && (
          <>
            <div className="field-row">
              <label className="field">
                <span>{t("scaleLabel")}</span>
                <input
                  type="number"
                  min={0.1}
                  max={5}
                  step={0.1}
                  value={clip.transform?.scale ?? 1}
                  onFocus={pushHistoryOnFocus}
                  onChange={(e) =>
                    patchClip((c) => ({
                      ...c,
                      transform: {
                        x: c.transform?.x ?? 50,
                        y: c.transform?.y ?? 50,
                        rotation: c.transform?.rotation ?? 0,
                        scale: Number(e.target.value) || 0.1,
                      },
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>{t("rotationLabel")}</span>
                <input
                  type="number"
                  min={-180}
                  max={180}
                  step={1}
                  value={Math.round(clip.transform?.rotation ?? 0)}
                  onFocus={pushHistoryOnFocus}
                  onChange={(e) =>
                    patchClip((c) => ({
                      ...c,
                      transform: {
                        x: c.transform?.x ?? 50,
                        y: c.transform?.y ?? 50,
                        scale: c.transform?.scale ?? 1,
                        rotation: Number(e.target.value) || 0,
                      },
                    }))
                  }
                />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>{t("xPctLabel")}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={Math.round(clip.transform?.x ?? 50)}
                  onFocus={pushHistoryOnFocus}
                  onChange={(e) =>
                    patchClip((c) => ({
                      ...c,
                      transform: {
                        x: Number(e.target.value),
                        y: c.transform?.y ?? 50,
                        scale: c.transform?.scale ?? 1,
                        rotation: c.transform?.rotation ?? 0,
                      },
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>{t("yPctLabel")}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={Math.round(clip.transform?.y ?? 50)}
                  onFocus={pushHistoryOnFocus}
                  onChange={(e) =>
                    patchClip((c) => ({
                      ...c,
                      transform: {
                        x: c.transform?.x ?? 50,
                        y: Number(e.target.value),
                        scale: c.transform?.scale ?? 1,
                        rotation: c.transform?.rotation ?? 0,
                      },
                    }))
                  }
                />
              </label>
            </div>
            <p className="hint">{t("dragTransformHint")}</p>

            <div className="field">
              <span>{t("brightnessLabel")} {colorAdjust.brightness}</span>
              <input
                type="range"
                min={-100}
                max={100}
                value={colorAdjust.brightness}
                onFocus={pushHistoryOnFocus}
                onChange={(e) =>
                  patchClip((c) => ({
                    ...c,
                    effects: withColorAdjust(c, { brightness: Number(e.target.value) }),
                  }))
                }
              />
            </div>
            <div className="field">
              <span>{t("contrastLabel")} {colorAdjust.contrast}</span>
              <input
                type="range"
                min={-100}
                max={100}
                value={colorAdjust.contrast}
                onFocus={pushHistoryOnFocus}
                onChange={(e) =>
                  patchClip((c) => ({
                    ...c,
                    effects: withColorAdjust(c, { contrast: Number(e.target.value) }),
                  }))
                }
              />
            </div>
            <div className="field">
              <span>{t("saturationLabel")} {colorAdjust.saturation}</span>
              <input
                type="range"
                min={-100}
                max={100}
                value={colorAdjust.saturation}
                onFocus={pushHistoryOnFocus}
                onChange={(e) =>
                  patchClip((c) => ({
                    ...c,
                    effects: withColorAdjust(c, { saturation: Number(e.target.value) }),
                  }))
                }
              />
            </div>
          </>
        )}

        {(trackId.startsWith("track-video") || trackId.startsWith("track-audio")) && (
          <label className="field">
            <span>{t("speedLabel")} {(clip.speed ?? 1).toFixed(2)}x</span>
            <input
              type="range"
              min={0.25}
              max={4}
              step={0.05}
              value={clip.speed ?? 1}
              onFocus={pushHistoryOnFocus}
              onChange={(e) => {
                const speed = Number(e.target.value) || 1;
                patchClip((c) => {
                  const sourceDuration = c.trimOut - c.trimIn;
                  return {
                    ...c,
                    speed,
                    timelineEnd: c.timelineStart + sourceDuration / speed,
                  };
                });
              }}
            />
          </label>
        )}

        {trackId.startsWith("track-audio") && (
          <label className="field">
            <span>{t("volumeLabel")}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={clip.volume ?? 1}
              onFocus={pushHistoryOnFocus}
              onChange={(e) => patchClip((c) => ({ ...c, volume: Number(e.target.value) }))}
            />
          </label>
        )}

        {(trackId.startsWith("track-video") ||
          trackId.startsWith("track-audio") ||
          trackId.startsWith("track-image")) && (
          <div className="field-row">
            <label className="field">
              <span>{t("fadeInLabel")}</span>
              <input
                type="number"
                min={0}
                max={30}
                step={0.1}
                value={fadeIn}
                onFocus={pushHistoryOnFocus}
                onChange={(e) =>
                  patchClip((c) => ({
                    ...c,
                    effects: withFadeDuration(c, "fade-in", Number(e.target.value) || 0),
                  }))
                }
              />
            </label>
            <label className="field">
              <span>{t("fadeOutLabel")}</span>
              <input
                type="number"
                min={0}
                max={30}
                step={0.1}
                value={fadeOut}
                onFocus={pushHistoryOnFocus}
                onChange={(e) =>
                  patchClip((c) => ({
                    ...c,
                    effects: withFadeDuration(c, "fade-out", Number(e.target.value) || 0),
                  }))
                }
              />
            </label>
          </div>
        )}

        {(trackId.startsWith("track-video") ||
          trackId.startsWith("track-audio") ||
          trackId.startsWith("track-image")) &&
          fadeOut > 0 && (
            <label className="field">
              <span>{t("fadeHoldLabel")}</span>
              <input
                type="number"
                min={0}
                max={60}
                step={0.1}
                value={fadeOutHold}
                onFocus={pushHistoryOnFocus}
                onChange={(e) =>
                  patchClip((c) => ({
                    ...c,
                    effects: withFadeOutHold(c, Number(e.target.value) || 0),
                  }))
                }
              />
            </label>
          )}
      </div>
    </aside>
  );
}
