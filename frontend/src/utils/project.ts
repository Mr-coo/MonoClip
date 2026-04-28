import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import { useMediaStore } from "../store/media.store";
import { useTimelineStore } from "../store/timeline.store";
import { useEditorStore } from "../store/editor.store";
import { useCaptionStore, CaptionSegment } from "../store/caption.store";
import type { MediaAsset } from "../types/mediaAsset";

const PROJECT_VERSION = 1;

interface ProjectFile {
  version: number;
  savedAt: string;
  projectName: string;
  media: { assets: MediaAsset[] };
  timeline: { assets: MediaAsset[]; currentTime: number };
  editor: { pixelPerSecond: number; layerHeight: number; timelineHeight: number };
  caption: { segments: CaptionSegment[] };
}

export async function saveProject(projectName: string): Promise<boolean> {
  const outputPath = await save({
    defaultPath: `${projectName}.mr`,
    filters: [{ name: "MonoClip Project", extensions: ["mr"] }],
  });
  if (!outputPath) return false;

  const { assets: mediaAssets } = useMediaStore.getState();
  const { assets: timelineAssets, currentTime } = useTimelineStore.getState();
  const { pixelPerSecond, layerHeight, timelineHeight } = useEditorStore.getState();
  const { segments } = useCaptionStore.getState();

  const project: ProjectFile = {
    version: PROJECT_VERSION,
    savedAt: new Date().toISOString(),
    projectName,
    media: { assets: mediaAssets },
    timeline: { assets: timelineAssets, currentTime },
    editor: { pixelPerSecond, layerHeight, timelineHeight },
    caption: { segments },
  };

  await invoke("write_project_file", {
    path: outputPath,
    content: JSON.stringify(project, null, 2),
  });

  return true;
}

export async function loadProject(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    filters: [{ name: "MonoClip Project", extensions: ["mr"] }],
  }) as string | null;

  if (!selected) return null;

  const content = await invoke<string>("read_project_file", { path: selected });
  const project = JSON.parse(content) as ProjectFile;

  if (project.version !== PROJECT_VERSION) {
    throw new Error(`Unsupported project version: ${project.version}`);
  }

  useMediaStore.setState({ assets: project.media.assets });
  useTimelineStore.setState({
    assets: project.timeline.assets,
    currentTime: project.timeline.currentTime,
    isPlaying: false,
    selectedAssetId: null,
    preview: null,
  });
  useEditorStore.setState({
    pixelPerSecond: project.editor.pixelPerSecond,
    layerHeight: project.editor.layerHeight,
    timelineHeight: project.editor.timelineHeight,
  });
  useCaptionStore.setState({ segments: project.caption.segments });

  return project.projectName;
}
