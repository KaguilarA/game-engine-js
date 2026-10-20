import type { GamePointer } from './game-pointer';

export interface ButtonOptions {
  onClick: () => void;
  onPress?: (pointerId: number) => void;
  onRelease?: (pointerId: number) => void;
  shape?: 'rectangle' | 'circle';
  dimensions?: {
    x: number;
    y: number;
    width: number;
    height: number;
    pivotX?: number;
    pivotY?: number;
  };
}
