import type { PhysicsBody } from '../../../engine/core/physics';

export interface LifePickup {
  x: number;
  y: number;
  size: number;
  physics: PhysicsBody;
}
