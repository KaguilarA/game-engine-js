import type { PhysicsBody } from '../../../engine/core/physics';

export interface Shot {
  motion: PhysicsBody;
  readonly direction: -1 | 1;
}
