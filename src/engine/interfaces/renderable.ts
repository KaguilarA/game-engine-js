import type Dimensions from '../core/dimensions';

/** A drawable engine object that may also advance its own animation state. */
export interface Renderable {
  /** Optional reactive bounds used by layout and scrollable containers. */
  dimensions?: Dimensions;
  draw(): void;
  update?(deltaSeconds: number): void;
}
