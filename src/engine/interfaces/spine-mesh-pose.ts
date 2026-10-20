import type { SpineSlotPose } from './spine-slot-pose';

export interface SpineMeshPose {
  slot: SpineSlotPose;
  vertices: number[];
  uvs: number[];
  triangles: number[];
  path: string;
  color: string;
}
