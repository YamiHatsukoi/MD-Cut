import { useProjectStore } from "../store/projectStore";
import { useFontStore } from "../store/fontStore";
import { useT } from "../i18n/useLang";
import {
  getFadeInDuration,
  getFadeOutDuration,
  getFadeOutHoldDuration,
  withFadeDuration,
  withFadeOutHold,
} from "../lib/effects";
import type { Clip } from "../types";

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

  return (
    <aside className="properties-panel">
      <h3>{t("properties")}</h3>
      <div className="properties-content">
        <div className="prop-row">
          <span className="prop-label">Label</span>
          <span>{clip.label}</span>
        </div>
        <div className="prop-row">
          <span className="prop-label">Duration</span>
          <span>{(clip.timelineEnd - clip.timelineStart).toFixed(1)}s</span>
        </div>

        {clip.text && (
          <>
            <label className="field">
              <span>Text</span>
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
              <span>Font</span>
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
              <p className="hint">
                Bỏ file font (.ttf/.otf) vào thư mục "fonts" cạnh MD-Cut.exe rồi mở lại app để
                dùng font riêng.
              </p>
            )}
            <div className="field-row">
              <label className="field">
                <span>Size</span>
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
                <span>Color</span>
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
                <span>X %</span>
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
                <span>Y %</span>
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
              <span>Đổ bóng (Shadow)</span>
            </label>
            {clip.text.shadowEnabled && (
              <div className="field-row">
                <label className="field">
                  <span>Màu bóng</span>
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
                  <span>Lệch X</span>
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
                  <span>Lệch Y</span>
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
              <span>Viền chữ (Outline)</span>
            </label>
            {clip.text.outlineEnabled && (
              <div className="field-row">
                <label className="field">
                  <span>Màu viền</span>
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
                  <span>Độ dày</span>
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

            <p className="hint">Kéo chữ trực tiếp trên khung xem trước để đổi vị trí.</p>
          </>
        )}

        {(trackId.startsWith("track-image") || trackId.startsWith("track-video")) && (
          <>
            <div className="field-row">
              <label className="field">
                <span>Scale</span>
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
            </div>
            <div className="field-row">
              <label className="field">
                <span>X %</span>
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
                <span>Y %</span>
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
            <p className="hint">Kéo trực tiếp trên khung xem trước để đổi vị trí.</p>
          </>
        )}

        {trackId.startsWith("track-audio") && (
          <label className="field">
            <span>Volume</span>
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
              <span>Fade in (s)</span>
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
              <span>Fade out (s)</span>
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
              <span>Giữ đen sau khi fade (s)</span>
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
