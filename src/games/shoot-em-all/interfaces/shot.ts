import type { PhysicsBody } from '../../../engine';

export interface Shot {
  motion: PhysicsBody;
  readonly direction: -1 | 1;
}
