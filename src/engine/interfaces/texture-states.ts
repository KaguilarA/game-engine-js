import type Sprite from '../animations/sprites/sprite';
import type { SpineSprite } from '../animations/spine/spine-sprite';

export type TextureVisual = CanvasImageSource | Sprite | SpineSprite;
export type TextureStateName = 'idle' | 'blocked' | 'disabled' | 'hover';

export interface TextureStates {
  idle?: TextureVisual;
  blocked?: TextureVisual;
  disabled?: TextureVisual;
  hover?: TextureVisual;
}
