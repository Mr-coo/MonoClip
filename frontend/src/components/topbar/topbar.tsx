import { useState } from "react"
import ButtonFilled from "../buttons/button.filled"
import { invoke } from "@tauri-apps/api/core"
import { save } from "@tauri-apps/plugin-dialog"
import { useTimelineStore } from "../../store/timeline.store"

export default function Topbar() {
  const { assets } = useTimelineStore()
  const [fileName, setFileName] = useState("Untitled")
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportDone, setExportDone] = useState(false)

  async function handleExport() {
    const outputPath = await save({
      defaultPath: `${fileName}.mp4`,
      filters: [{ name: "Video", extensions: ["mp4"] }],
    })
    if (!outputPath) return

    setIsExporting(true)
    setExportError(null)
    setExportDone(false)

    try {
      await invoke("export_video", { mediaAssets: assets, outputPath })
      setExportDone(true)
    } catch (e) {
      setExportError(String(e))
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="bg-mid py-3 px-8 flex justify-between items-center gap-4">
      <input
        type="text"
        value={fileName}
        onChange={e => setFileName(e.target.value)}
        className="p-2 bg-transparent border-b border-white/20 text-typography outline-none"
      />

      <div className="flex items-center gap-3">
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
  )
}
