import { TextStyle } from './textStyle';

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
  textStyle?: TextStyle;
  volume?: number;
  muted?: boolean;
  fadeIn?: number;
  fadeOut?: number;
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
  height: 0,
  volume: 1,
  muted: false,
  fadeIn: 0,
  fadeOut: 0,
};