import type { Rect } from './rect';

export interface Wall extends Rect {
  health: number;
  destructible: boolean;
}
