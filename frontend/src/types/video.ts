export interface Video {
  id: string;
  path: string;
  name: string;
  startTime: number;
  endTime: number;
  startInTimeLine: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
}