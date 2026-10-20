import type { PhysicsBody } from '../../../engine/core/physics';
import type { PatternFall } from './pattern-fall';

export interface FallingPattern extends PatternFall {
  readonly motion: PhysicsBody;
}
