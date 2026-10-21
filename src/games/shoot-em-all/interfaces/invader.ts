import type { SignalValue } from 'reactive-values';
import type { InvaderEnemy, InvaderKind } from '../invader-enemy';

export interface Invader {
  entity: InvaderEnemy;
  speed: SignalValue<number>;
  drift: SignalValue<number>;
  driftSpeed: SignalValue<number>;
  readonly kind: InvaderKind;
  fireTimer: SignalValue<number>;
}
