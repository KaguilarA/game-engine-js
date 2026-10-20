import type { AtlasRegion } from './atlas-region';

export interface ParsedAtlasRegion extends AtlasRegion {
  frameRate: number;
  loop: boolean;
}
