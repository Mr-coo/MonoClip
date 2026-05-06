const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export interface CaptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResponse {
  language: string;
  segments: CaptionSegment[];
}

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TrackFrame {
  frame_index: number;
  timestamp: number;
  bbox: BBox;
  success: boolean;
}

export interface TrackingResponse {
  output_video_path: string;
  frames: TrackFrame[];
}

async function checkResponse(res: Response): Promise<void> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
}

export async function transcribe(file: File): Promise<TranscriptionResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/transcribe`, { method: "POST", body: form });
  await checkResponse(res);
  return res.json() as Promise<TranscriptionResponse>;
}

export async function filterBadwords(
  payload: TranscriptionResponse,
): Promise<TranscriptionResponse> {
  const res = await fetch(`${API_BASE}/caption/filter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await checkResponse(res);
  return res.json() as Promise<TranscriptionResponse>;
}

export async function trackObject(
  file: File,
  x: number,
  y: number,
  w: number,
  h: number,
  zoomFactor = 1.5,
): Promise<TrackingResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("x", String(x));
  form.append("y", String(y));
  form.append("w", String(w));
  form.append("h", String(h));
  form.append("zoom_factor", String(zoomFactor));
  const res = await fetch(`${API_BASE}/track`, { method: "POST", body: form });
  await checkResponse(res);
  return res.json() as Promise<TrackingResponse>;
}
