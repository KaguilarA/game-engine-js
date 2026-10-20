import type { TouchControlCircle } from './touch-control-circle';

export interface TouchControlsLayout {
  left: TouchControlCircle;
  right: TouchControlCircle;
  up: TouchControlCircle;
  down: TouchControlCircle;
  shoot: TouchControlCircle;
  reservedBottom: number;
}
