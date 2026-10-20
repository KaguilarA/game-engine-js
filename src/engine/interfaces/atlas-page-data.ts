import type { ParsedAtlasRegion } from './parsed-atlas-region';

export interface AtlasPageData {
  pageName: string;
  width: number;
  height: number;
  regions: ParsedAtlasRegion[];
}
