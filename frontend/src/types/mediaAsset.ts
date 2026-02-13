export interface MediaAsset {
  id: string;
  type: string;
  layer: number;
  path: string;
  name: string;
  startTime: number;
  endTime: number;
  startInTimeLine: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const DEFAULT_MEDIA_ASSET_SETTINGS: MediaAsset = {
  layer: 1,
  startInTimeLine: 0,
  startTime: 0,
  x: 0,
  y: 0,
  id: "",
  type: "",
  path: "",
  name: "",
  endTime: 0,
  width: 0,
  height: 0
};