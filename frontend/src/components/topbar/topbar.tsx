import { useState } from "react";
import ButtonFilled from "../buttons/button.filled";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { useTimelineStore } from "../../store/timeline.store";
import { useCaptionStore } from "../../store/caption.store";
import { DEFAULT_MEDIA_ASSET_SETTINGS } from "../../types/mediaAsset";
import { DEFAULT_TEXT_STYLE } from "../../types/textStyle";
import { saveProject, loadProject } from "../../utils/project";
import { FiSave } from "react-icons/fi";
import { MdFolderOpen } from "react-icons/md";

export default function Topbar() {
  const { assets } = useTimelineStore();
  const { segments } = useCaptionStore();
  const [fileName, setFileName] = useState("Untitled");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportDone, setExportDone] = useState(false);
  const [projectStatus, setProjectStatus] = useState<"idle" | "saving" | "loading">("idle");
  const [projectError, setProjectError] = useState<string | null>(null);

  async function handleExport() {
    const outputPath = await save({
      defaultPath: `${fileName}.mp4`,
      filters: [{ name: "Video", extensions: ["mp4"] }],
    });
    if (!outputPath) return;

    setIsExporting(true);
    setExportError(null);
    setExportDone(false);

    // Convert caption segments to text MediaAssets so the Rust backend
    // renders them as drawtext overlays at layer 999 (always on top).
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
      y: 930,
      width: 1920,
      height: 150,
      textStyle: {
        ...DEFAULT_TEXT_STYLE,
        content: seg.text,
        fontSize: 64,
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
      </div>

      <div className="flex items-center gap-3">
        {projectError && (
          <span className="text-red-400 text-xs max-w-48 truncate" title={projectError}>
            {projectError}
          </span>
        )}
        {exportError && (
          <span
            className="text-red-400 text-xs max-w-64 truncate"
            title={exportError}
          >
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