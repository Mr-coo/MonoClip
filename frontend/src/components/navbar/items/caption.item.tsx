import { FaClosedCaptioning } from "react-icons/fa";
import { MdSubtitles } from "react-icons/md";
import { MdDelete } from "react-icons/md";
import { FiDownload } from "react-icons/fi";
import { MdTranslate } from "react-icons/md";
import { MdFilterAlt } from "react-icons/md";
import { useMemo, useState } from "react";
import ButtonOutlined from "../../buttons/button.outlined";
import { useMediaStore } from "../../../store/media.store";

interface CaptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

interface TranscriptionResponse {
  language: string;
  segments: CaptionSegment[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

function formatSeconds(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((safeSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const secs = (safeSeconds % 60).toString().padStart(2, "0");

  return `${hours}:${minutes}:${secs}`;
}

export default function CaptionItem(){
  const assets = useMediaStore((state) => state.assets);
  const [activeAction, setActiveAction] = useState<"auto" | "filter" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawCaptionResult, setRawCaptionResult] = useState<TranscriptionResponse | null>(null);
  const [captionResult, setCaptionResult] = useState<TranscriptionResponse | null>(null);

  const latestTranscribableAsset = useMemo(
    () => [...assets].reverse().find((asset) => asset.type === "video" || asset.type === "audio"),
    [assets],
  );

  async function handleAutoCaption(): Promise<void> {
    if (!latestTranscribableAsset) {
      setError("Upload media video/audio dulu di tab Media sebelum auto caption.");
      return;
    }

    setError(null);
    setActiveAction("auto");

    try {
      const mediaResponse = await fetch(latestTranscribableAsset.path);
      if (!mediaResponse.ok) {
        throw new Error("Gagal membaca file media lokal.");
      }

      const mediaBlob = await mediaResponse.blob();
      const file = new File([mediaBlob], latestTranscribableAsset.name, {
        type: mediaBlob.type || "application/octet-stream",
      });

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE_URL}/transcribe`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let message = "Transcription request failed.";
        try {
          const errorBody = (await response.json()) as { detail?: string };
          if (errorBody.detail) {
            message = errorBody.detail;
          }
        } catch {
          // Keep default message when error response is not JSON.
        }
        throw new Error(message);
      }

      const data = (await response.json()) as TranscriptionResponse;
      setRawCaptionResult(data);
      setCaptionResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error when generating captions.");
    } finally {
      setActiveAction(null);
    }
  }

  async function handleFilterCaption(): Promise<void> {
    const sourceCaption = rawCaptionResult ?? captionResult;

    if (!sourceCaption) {
      setError("Generate caption dulu sebelum filter badwords.");
      return;
    }

    setError(null);
    setActiveAction("filter");

    try {
      const response = await fetch(`${API_BASE_URL}/caption/filter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sourceCaption),
      });

      if (!response.ok) {
        let message = "Filter request failed.";
        try {
          const errorBody = (await response.json()) as { detail?: string };
          if (errorBody.detail) {
            message = errorBody.detail;
          }
        } catch {
          // Keep default message when error response is not JSON.
        }
        throw new Error(message);
      }

      const data = (await response.json()) as TranscriptionResponse;
      setCaptionResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error when filtering captions.");
    } finally {
      setActiveAction(null);
    }
  }

  function handleDownloadJson(): void {
    if (!captionResult) return;

    const blob = new Blob([JSON.stringify(captionResult, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "captions.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
  <div className="flex flex-col justify-start items-center w-full h-full min-h-0 p-2">
    <h2 className="text-2xl border-b-2 border-b-shadow w-full">
      Caption
    </h2>

    <div className="w-full my-4 p-2 flex justify-evenly items-start flex-wrap gap-4">
      <button
        className="text-[10px] flex flex-col justify-center items-center gap-1 bg-shadow px-4 py-2 rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleAutoCaption}
        disabled={activeAction !== null}
      >
        <FaClosedCaptioning size={20}/>
        {activeAction === "auto" ? "Running..." : "Auto"}
      </button>
      <button className="text-[10px] flex flex-col justify-center items-center gap-1 bg-shadow px-4 py-2 rounded hover:opacity-90">
        <MdSubtitles size={20}/>
        Manual
      </button>
      <button
        className="text-[10px] flex flex-col justify-center items-center gap-1 bg-shadow px-4 py-2 rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleFilterCaption}
        disabled={activeAction !== null || (!rawCaptionResult && !captionResult)}
      >
        <MdFilterAlt size={20}/>
        {activeAction === "filter" ? "Filtering..." : "Filter"}
      </button>
    </div>

    <div className="flex items-center justify-between w-full">
      <h3>Captions</h3>
      <div className="flex items-center justify-between gap-3">
        <button className="hover:bg-shadow rounded-4xl p-2"><MdTranslate/></button>
        <button
          className="hover:bg-shadow rounded-4xl p-2 disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={handleDownloadJson}
          disabled={!captionResult}
        >
          <FiDownload/>
        </button>
      </div>
    </div>
    {error && <p className="w-full text-xs text-red-400 mt-2">{error}</p>}
    {captionResult && (
      <p className="w-full text-[11px] text-typography/70 mt-2">
        Language: {captionResult.language} | Segments: {captionResult.segments.length}
      </p>
    )}
    <div className="flex-1 w-full my-5 flex justify-between items-start flex-wrap gap-4 overflow-y-auto no-scrollbar">
      {(captionResult?.segments ?? []).map((segment) => (
        <div key={segment.id} className="group w-full p-2 rounded hover:bg-shadow transition-all duration-200">
          <div className="flex justify-between items-center">
            <p className="text-[11px] mb-2 font-bold">
              {formatSeconds(segment.start)} - {formatSeconds(segment.end)}
            </p>
            <MdDelete className="hidden group-hover:block transition-all duration-200 hover:scale-105"/>
          </div>
          <p className="text-xs">{segment.text}</p>
        </div>
      ))}
      {!captionResult && (
        <p className="text-xs text-typography/60">Belum ada caption. Klik Auto untuk generate dari media terbaru.</p>
      )}
    </div>
    <ButtonOutlined label="Add Caption" onClick={()=>{}}/>
    
  </div>

  )
}