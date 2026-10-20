import type { GameControlCircle } from './game-control-circle';

export interface GameControlsLayout {
  fullscreenButton: GameControlCircle;
  pauseButton: GameControlCircle;
  resetButton: GameControlCircle;
  menuButton: GameControlCircle;
}
