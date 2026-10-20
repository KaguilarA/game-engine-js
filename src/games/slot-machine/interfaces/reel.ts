import type { SignalValue } from 'reactive-values';
import type { PhysicsBody } from '../../../engine/core/physics';
import type Sprite from '../../../engine/animations/sprites/sprite';

export interface Reel {
  result: SignalValue<number>;
  cursor: SignalValue<number>;
  startCursor: SignalValue<number>;
  elapsed: SignalValue<number>;
  motion: PhysicsBody;
  targetDistance: SignalValue<number>;
  brakingAcceleration: SignalValue<number>;
  duration: SignalValue<number>;
  moving: SignalValue<boolean>;
  bouncing: SignalValue<boolean>;
  bounceElapsed: SignalValue<number>;
  bounceOffset: SignalValue<number>;
  sprites: Sprite[];
}
