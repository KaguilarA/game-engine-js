import type { AtlasRegion } from '../interfaces';

/** Converts normalized attachment UVs into normalized page-image UVs. */
export default function (
  region: AtlasRegion,
  pageWidth: number,
  pageHeight: number,
  u: number,
  v: number
): [number, number] {
  const originalWidth = region.originalWidth ?? region.width;
  const originalHeight = region.originalHeight ?? region.height;
  const offsetX = region.offsetX ?? 0;
  const offsetY = region.offsetY ?? 0;
  if (region.rotated) {
    const left = (region.x - (originalHeight - offsetY - region.height)) / pageWidth;
    const top = (region.y - (originalWidth - offsetX - region.width)) / pageHeight;
    return [left + v * originalHeight / pageWidth, top + (1 - u) * originalWidth / pageHeight];
  }
  const left = (region.x - offsetX) / pageWidth;
  const top = (region.y - (originalHeight - offsetY - region.height)) / pageHeight;
  return [left + u * originalWidth / pageWidth, top + v * originalHeight / pageHeight];
}
