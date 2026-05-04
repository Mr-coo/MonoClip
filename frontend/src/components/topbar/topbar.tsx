import { useState } from "react";
import ButtonFilled from "../buttons/button.filled";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { useTimelineStore } from "../../store/timeline.store";
import { useCaptionStore } from "../../store/caption.store";
import { useEditorStore } from "../../store/editor.store";
import { DEFAULT_MEDIA_ASSET_SETTINGS } from "../../types/mediaAsset";
import { DEFAULT_TEXT_STYLE } from "../../types/textStyle";
import { saveProject, loadProject } from "../../utils/project";
import { FiSave } from "react-icons/fi";
import { MdFolderOpen } from "react-icons/md";

const RATIO_PRESETS: Record<string, [number, number]> = {
  "16:9":  [1920, 1080],
  "9:16":  [1080, 1920],
  "1:1":   [1080, 1080],
  "4:3":   [1440, 1080],
  "21:9":  [2560, 1080],
};

export default function Topbar() {
  const { assets } = useTimelineStore();
  const { segments } = useCaptionStore();
  const { canvasWidth, canvasHeight, setCanvasDimensions } = useEditorStore();

  const [fileName, setFileName] = useState("Untitled");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportDone, setExportDone] = useState(false);
  const [projectStatus, setProjectStatus] = useState<"idle" | "saving" | "loading">("idle");
  const [projectError, setProjectError] = useState<string | null>(null);

  // Ratio picker state
  const currentKey = Object.entries(RATIO_PRESETS).find(
    ([, [w, h]]) => w === canvasWidth && h === canvasHeight
  )?.[0] ?? "custom";
  const [ratioKey, setRatioKey] = useState(currentKey);
  const [customW, setCustomW] = useState(canvasWidth);
  const [customH, setCustomH] = useState(canvasHeight);

  function handlePresetChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const key = e.target.value;
    setRatioKey(key);
    if (key !== "custom") {
      const [w, h] = RATIO_PRESETS[key];
      setCanvasDimensions(w, h);
    }
  }

  function applyCustomDimensions() {
    if (customW > 0 && customH > 0) {
      setCanvasDimensions(customW, customH);
    }
  }

  async function handleExport() {
    const outputPath = await save({
      defaultPath: `${fileName}.mp4`,
      filters: [{ name: "Video", extensions: ["mp4"] }],
    });
    if (!outputPath) return;

    setIsExporting(true);
    setExportError(null);
    setExportDone(false);

    const captionY = Math.round(canvasHeight - canvasHeight * 0.139);
    const captionFontSize = Math.round(canvasHeight * 0.059);

    const captionAssets = segments.map((seg) => ({
      ...DEFAULT_MEDIA_ASSET_SETTINGS,
      id: `caption-export-${seg.id}`,
      type: "text",
      layer: 999,
      name: "Caption",
      startTime: 0,
      endTime: seg.end - seg.start,
      startInTimeLine: seg.start,
      x: 0,
      y: captionY,
      width: canvasWidth,
      height: Math.round(canvasHeight * 0.139),
      textStyle: {
        ...DEFAULT_TEXT_STYLE,
        content: seg.text,
        fontSize: captionFontSize,
        fontWeight: 700,
        textAlign: "center" as const,
        color: "#ffffff",
        strokeColor: "#000000",
        strokeWidth: 2,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        shadowOpacity: 0.9,
        shadowColor: "#000000",
        bgOpacity: 0,
      },
    }));

    try {
      await invoke("export_video", {
        mediaAssets: [...assets, ...captionAssets],
        outputPath,
        canvasWidth,
        canvasHeight,
      });
      setExportDone(true);
    } catch (e) {
      setExportError(String(e));
    } finally {
      setIsExporting(false);
    }
  }

  async function handleSave() {
    setProjectStatus("saving");
    setProjectError(null);
    try {
      await saveProject(fileName);
    } catch (e) {
      setProjectError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setProjectStatus("idle");
    }
  }

  async function handleOpen() {
    setProjectStatus("loading");
    setProjectError(null);
    try {
      const name = await loadProject();
      if (name) setFileName(name);
    } catch (e) {
      setProjectError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setProjectStatus("idle");
    }
  }

  return (
    <div className="bg-mid py-3 px-8 flex justify-between items-center gap-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          className="p-2 bg-transparent border-b border-white/20 text-typography outline-none"
        />
        <button
          onClick={handleSave}
          disabled={projectStatus !== "idle"}
          title="Save project"
          className="flex items-center gap-1.5 text-xs text-typography/70 hover:text-typography disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-2 py-1"
        >
          <FiSave size={15} />
          {projectStatus === "saving" ? "Saving…" : "Save"}
        </button>
        <button
          onClick={handleOpen}
          disabled={projectStatus !== "idle"}
          title="Open project"
          className="flex items-center gap-1.5 text-xs text-typography/70 hover:text-typography disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-2 py-1"
        >
          <MdFolderOpen size={15} />
          {projectStatus === "loading" ? "Loading…" : "Open"}
        </button>

        {/* Canvas ratio picker */}
        <div className="flex items-center gap-2 border-l border-white/10 pl-3 ml-1">
          <span className="text-xs text-typography/50">Canvas</span>
          <select
            value={ratioKey}
            onChange={handlePresetChange}
            className="bg-base text-typography text-xs px-2 py-1 rounded border border-shadow/50 outline-none cursor-pointer hover:border-shadow transition-colors"
          >
            {Object.keys(RATIO_PRESETS).map((k) => (
              <option key={k} value={k} className="bg-dark text-typography">{k}</option>
            ))}
            <option value="custom" className="bg-dark text-typography">Custom</option>
          </select>
          {ratioKey === "custom" && (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={customW}
                min={1}
                onChange={(e) => setCustomW(Number(e.target.value))}
                className="w-16 bg-base border border-shadow/50 text-typography text-xs px-2 py-1 rounded outline-none focus:border-primary transition-colors"
                placeholder="W"
              />
              <span className="text-typography/50 text-xs">×</span>
              <input
                type="number"
                value={customH}
                min={1}
                onChange={(e) => setCustomH(Number(e.target.value))}
                className="w-16 bg-base border border-shadow/50 text-typography text-xs px-2 py-1 rounded outline-none focus:border-primary transition-colors"
                placeholder="H"
              />
              <button
                onClick={applyCustomDimensions}
                className="text-xs px-2 py-1 bg-primary hover:bg-primary/80 rounded transition-colors text-typography"
              >
                Apply
              </button>
            </div>
          )}
          <span className="text-xs text-typography/30">{canvasWidth}×{canvasHeight}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {projectError && (
          <span className="text-red-400 text-xs max-w-48 truncate" title={projectError}>
            {projectError}
          </span>
        )}
        {exportError && (
          <span className="text-red-400 text-xs max-w-64 truncate" title={exportError}>
            {exportError}
          </span>
        )}
        {exportDone && !exportError && (
          <span className="text-green-400 text-xs">Export complete</span>
        )}
        <div className="w-28">
          <ButtonFilled
            label={isExporting ? "Exporting…" : "Export"}
            onClick={isExporting ? () => {} : handleExport}
          />
        </div>
      </div>
    </div>
  );
}