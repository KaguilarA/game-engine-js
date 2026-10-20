import type { SignalValue } from 'reactive-values';
import type { Enemy } from '../../space-hunters/enemy';
import type { EnemyKind } from '../../space-hunters/enemy';

export interface Invader {
  entity: Enemy;
  speed: SignalValue<number>;
  drift: SignalValue<number>;
  driftSpeed: SignalValue<number>;
  readonly kind: EnemyKind;
  fireTimer: SignalValue<number>;
}
