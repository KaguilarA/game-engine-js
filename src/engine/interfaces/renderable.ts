import type Dimensions from '../core/dimensions';

/** A drawable engine object that may also advance its own animation state. */
export interface Renderable {
  /** Optional reactive bounds used by layout and scrollable containers. */
  dimensions?: Dimensions;
  draw(): void;
  update?(deltaSeconds: number): void;
}

/** A scene drawable; updates are registered separately to avoid coupling layers to game-specific update signatures. */
export type SceneDrawable = Pick<Renderable, 'dimensions' | 'draw'>;
