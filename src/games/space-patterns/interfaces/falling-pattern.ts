import type { PhysicsBody } from '../../../engine';
import type { PatternFall } from './pattern-fall';

export interface FallingPattern extends PatternFall {
  readonly motion: PhysicsBody;
}
