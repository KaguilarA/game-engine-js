import type { AtlasRegion } from './atlas-region';

export interface AtlasAnimation {
  name: string;
  frames: AtlasRegion[];
  frameRate: number;
  loop: boolean;
}
