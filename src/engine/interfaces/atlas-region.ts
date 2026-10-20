export interface AtlasRegion {
  name: string;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotated?: boolean;
  offsetX?: number;
  offsetY?: number;
  originalWidth?: number;
  originalHeight?: number;
}
