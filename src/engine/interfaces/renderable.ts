/** A drawable engine object that may also advance its own animation state. */
export interface Renderable {
  draw(): void;
  update?(deltaSeconds: number): void;
}
