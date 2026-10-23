import type { Renderable } from '../interfaces/renderable';
import { Component } from './component';

/** Renders an existing Sprite, Texture, or other Renderable on its Entity. */
export class SpriteRendererComponent extends Component {
  public readonly renderable: Renderable;

  public constructor(renderable: Renderable) {
    super();
    this.renderable = renderable;
  }

  public override update(deltaSeconds: number): void {
    this.renderable.update?.(deltaSeconds);
  }

  public override draw(): void {
    const entity = this.entity;
    const target = this.renderable.dimensions;
    if (entity && target) {
      const source = entity.dimensions;
      target.setPosition(source.getX(), source.getY());
      target.setSize(source.getWidth(), source.getHeight());
      target.setScale(source.getScaleX(), source.getScaleY());
      target.setPivot(source.getPivotX(), source.getPivotY());
    }
    this.renderable.draw();
  }
}
