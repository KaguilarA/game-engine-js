import { signalValue } from 'reactive-values';
import type { SignalValue } from 'reactive-values';

import GameContext from '../core/context';
import Dimensions from '../core/dimensions';
import type { ContainerOptions } from '../interfaces/container-options';
import type { Renderable } from '../interfaces/renderable';
import { MathUtils } from '../core/math-utils';

/** Groups related drawables under one movable, scalable, reactive transform. */
export class Container implements Renderable {
  public readonly dimensions: Dimensions;
  public readonly visible: SignalValue<boolean> = signalValue(true);
  public readonly opacity: SignalValue<number>;
  public readonly clipChildren: SignalValue<boolean>;
  private readonly children: SignalValue<readonly Renderable[]> = signalValue<readonly Renderable[]>([]);

  public constructor(options: ContainerOptions = {}) {
    this.dimensions = new Dimensions(
      options.width ?? 0,
      options.height ?? 0,
      options.x ?? 0,
      options.y ?? 0,
      options.pivotX ?? 0,
      options.pivotY ?? 0
    );
    this.dimensions.setScale(options.scaleX ?? 1, options.scaleY ?? options.scaleX ?? 1);
    this.opacity = signalValue(Container.clampOpacity(options.opacity ?? 1));
    this.clipChildren = signalValue(options.clipChildren ?? false);
  }

  public add(child: Renderable): void {
    if (child === this || (child instanceof Container && child.containsContainer(this))) {
      throw new Error('A Container cannot contain itself or an ancestor.');
    }
    if (this.children().includes(child)) return;
    this.children.set([...this.children(), child]);
  }

  public remove(child: Renderable): boolean {
    const children = this.children();
    const index = children.indexOf(child);
    if (index < 0) return false;
    this.children.set(children.filter((candidate) => candidate !== child));
    return true;
  }

  public clear(): void {
    if (this.children().length > 0) this.children.set([]);
  }

  public setChildren(children: readonly Renderable[]): void {
    const current = this.children();
    if (current.length === children.length && current.every((child, index) => child === children[index])) return;
    if (children.some((child) => child === this || (child instanceof Container && child.containsContainer(this)))) {
      throw new Error('A Container cannot contain itself or an ancestor.');
    }
    this.children.set([...children]);
  }

  public getChildren(): readonly Renderable[] {
    return this.children();
  }

  public update(deltaSeconds: number): void {
    if (!this.visible()) return;
    const children = this.children();
    for (let index = 0; index < children.length; index++) {
      children[index].update?.(deltaSeconds);
    }
  }

  public draw(): void {
    const opacity = this.opacity();
    if (!this.visible() || opacity <= 0) return;

    const context = GameContext.context;
    const dimensions = this.dimensions;
    const width = dimensions.getWidth();
    const height = dimensions.getHeight();
    context.save();
    context.translate(dimensions.getX(), dimensions.getY());
    context.scale(dimensions.getScaleX(), dimensions.getScaleY());
    context.translate(-width * dimensions.getPivotX(), -height * dimensions.getPivotY());
    context.globalAlpha *= opacity;
    if (this.clipChildren() && width > 0 && height > 0) {
      context.beginPath();
      context.rect(0, 0, width, height);
      context.clip();
    }
    try {
      const children = this.children();
      for (let index = 0; index < children.length; index++) {
        children[index].draw();
      }
    } finally {
      context.restore();
    }
  }

  private containsContainer(target: Container): boolean {
    return this === target || this.children().some(
      (child) => child instanceof Container && child.containsContainer(target)
    );
  }

  private static clampOpacity(opacity: number): number {
    if (!Number.isFinite(opacity)) throw new RangeError('Container opacity must be finite.');
    return MathUtils.clamp(opacity, 0, 1);
  }
}
