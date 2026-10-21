import { signalValue } from 'reactive-values';
import type { SignalValue } from 'reactive-values';

import GameContext from '../core/context';
import Dimensions from '../core/dimensions';
import type { ContainerOptions } from '../interfaces/container-options';
import type { Renderable } from '../interfaces/renderable';
import { MathUtils } from '../core/math-utils';
import GameEvents from '../input/events';
import type { GamePointer } from '../interfaces/game-pointer';

interface ScrollbarDrag {
  pointerId: number;
  pointerY: number;
  scrollY: number;
  draggingThumb: boolean;
  moved: boolean;
}

/** Groups related drawables under one movable, scalable, reactive transform. */
export class Container implements Renderable {
  public readonly dimensions: Dimensions;
  public readonly visible: SignalValue<boolean> = signalValue(true);
  public readonly opacity: SignalValue<number>;
  public readonly clipChildren: SignalValue<boolean>;
  public readonly scrollY: SignalValue<number>;
  private readonly targetScrollY: SignalValue<number>;
  private readonly scrollable: boolean;
  private readonly wheelSensitivity: number;
  private readonly removeWheelListener: () => void;
  private readonly removePointerDownListener: () => void;
  private readonly removePointerMoveListener: () => void;
  private readonly removePointerEndListener: () => void;
  private readonly children: SignalValue<readonly Renderable[]> = signalValue<readonly Renderable[]>([]);
  private readonly contentBottom = signalValue(0);
  private readonly scrollbarDrag = signalValue<ScrollbarDrag | undefined>(undefined);

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
    this.scrollable = options.scrollable ?? false;
    this.scrollY = signalValue(Math.max(0, options.scrollY ?? 0));
    this.targetScrollY = signalValue(this.scrollY());
    this.wheelSensitivity = Math.max(0.1, options.wheelSensitivity ?? 0.55);
    this.removeWheelListener = this.scrollable
      ? GameEvents.addWheelListener(this.handleWheel)
      : () => {};
    this.removePointerDownListener = this.scrollable
      ? GameEvents.addPointerDownListener(this.handlePointerDown)
      : () => {};
    this.removePointerMoveListener = this.scrollable
      ? GameEvents.addPointerMoveListener(this.handlePointerMove)
      : () => {};
    this.removePointerEndListener = this.scrollable
      ? GameEvents.addPointerEndListener(this.handlePointerEnd)
      : () => {};
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

  /** Maximum vertical offset implied by child bounds and this viewport. */
  public get maxScrollY(): number {
    if (!this.scrollable) return 0;
    return Math.max(0, this.contentBottom() - this.dimensions.getHeight());
  }

  public setScrollY(value: number): void {
    const next = Math.max(0, Math.min(this.maxScrollY, value));
    if (this.targetScrollY() !== next) this.targetScrollY.set(next);
    if (this.scrollY() !== next) this.scrollY.set(next);
  }

  public destroy(): void {
    this.removeWheelListener();
    this.removePointerDownListener();
    this.removePointerMoveListener();
    this.removePointerEndListener();
  }

  public update(deltaSeconds: number): void {
    if (!this.visible()) return;
    if (this.scrollable) {
      const target = Math.max(0, Math.min(this.maxScrollY, this.targetScrollY()));
      if (this.targetScrollY() !== target) this.targetScrollY.set(target);
      const difference = target - this.scrollY();
      const next = Math.abs(difference) < 0.5
        ? target
        : this.scrollY() + difference * Math.min(1, deltaSeconds * 16);
      if (this.scrollY() !== next) this.scrollY.set(next);
    }
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
    if (this.scrollable) this.clampScrollPositions();
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
    context.translate(0, -this.scrollY());
    try {
      const children = this.children();
      for (let index = 0; index < children.length; index++) {
        children[index].draw();
      }
      if (this.scrollable) {
        this.measureContentBottom(children);
        this.clampScrollPositions();
        this.drawScrollbar(width, height);
      }
    } finally {
      context.restore();
    }
  }

  private readonly handleWheel = (pointer: { x: number; y: number }, deltaY: number): boolean => {
    if (!this.visible() || !this.scrollable) return false;
    if (pointer.x < this.dimensions.left() || pointer.x > this.dimensions.right()
      || pointer.y < this.dimensions.top() || pointer.y > this.dimensions.bottom()) return false;
    if (this.maxScrollY <= 0) return false;
    const next = Math.max(0, Math.min(this.maxScrollY, this.targetScrollY() + deltaY * this.wheelSensitivity));
    if (this.targetScrollY() !== next) this.targetScrollY.set(next);
    return true;
  };

  private readonly handlePointerDown = (pointer: GamePointer): void => {
    if (!this.visible() || !this.scrollable || this.maxScrollY <= 0) return;
    const width = this.dimensions.getWidth();
    const height = this.dimensions.getHeight();
    const localX = pointer.x - this.dimensions.left();
    const localY = pointer.y - this.dimensions.top();
    if (localX < 0 || localX > width || localY < 0 || localY > height) return;

    const trackWidth = this.getScrollbarTrackWidth(width);
    const trackX = width - trackWidth - 3;
    const thumbHeight = this.getScrollbarThumbHeight(height);
    const thumbY = (height - thumbHeight) * this.scrollY() / this.maxScrollY;
    if (localX >= trackX && localX <= trackX + trackWidth) {
      if (localY >= thumbY && localY <= thumbY + thumbHeight) {
        this.scrollbarDrag.set({
          pointerId: pointer.id,
          pointerY: pointer.y,
          scrollY: this.scrollY(),
          draggingThumb: true,
          moved: false
        });
      } else {
        this.setScrollY(this.scrollY() + (localY < thumbY ? -height : height) * 0.8);
      }
      return;
    }
    this.scrollbarDrag.set({
      pointerId: pointer.id,
      pointerY: pointer.y,
      scrollY: this.scrollY(),
      draggingThumb: false,
      moved: false
    });
  };

  private readonly handlePointerMove = (pointer: GamePointer): void => {
    const drag = this.scrollbarDrag();
    if (drag === undefined || drag.pointerId !== pointer.id) return;
    const height = this.dimensions.getHeight();
    const pointerDelta = pointer.y - drag.pointerY;
    if (!drag.draggingThumb && !drag.moved && Math.abs(pointerDelta) < 6) return;
    if (!drag.moved) this.scrollbarDrag.set({ ...drag, moved: true });
    if (drag.draggingThumb) {
      const thumbHeight = this.getScrollbarThumbHeight(height);
      const trackTravel = height - thumbHeight;
      if (trackTravel <= 0) return;
      this.setScrollY(drag.scrollY + pointerDelta * this.maxScrollY / trackTravel);
      return;
    }
    this.setScrollY(drag.scrollY - pointerDelta);
  };

  private readonly handlePointerEnd = (pointer: GamePointer): void => {
    if (this.scrollbarDrag()?.pointerId === pointer.id) this.scrollbarDrag.set(undefined);
  };

  /** Caches child bounds in content space so rapid wheel events cannot drift past the end. */
  private measureContentBottom(children: readonly Renderable[]): void {
    const scaleY = Math.max(Number.EPSILON, this.dimensions.getScaleY());
    const viewportTop = this.dimensions.top();
    let contentBottom = 0;
    for (let index = 0; index < children.length; index++) {
      const childDimensions = children[index].dimensions;
      if (childDimensions === undefined) continue;
      const childBottom = (childDimensions.bottom() - viewportTop) / scaleY + this.scrollY();
      contentBottom = Math.max(contentBottom, childBottom);
    }
    if (this.contentBottom() !== contentBottom) this.contentBottom.set(contentBottom);
  }

  private clampScrollPositions(): void {
    const maxScroll = this.maxScrollY;
    const target = Math.max(0, Math.min(maxScroll, this.targetScrollY()));
    const current = Math.max(0, Math.min(maxScroll, this.scrollY()));
    if (this.targetScrollY() !== target) this.targetScrollY.set(target);
    if (this.scrollY() !== current) this.scrollY.set(current);
  }

  /** Draws a viewport-fixed thumb sized from the current content overflow. */
  private drawScrollbar(width: number, height: number): void {
    const maxScroll = this.maxScrollY;
    if (maxScroll <= 0 || height <= 0 || width <= 0) return;

    const thumbHeight = this.getScrollbarThumbHeight(height);
    const trackWidth = this.getScrollbarTrackWidth(width);
    const trackX = width - trackWidth - 3;
    const thumbY = (height - thumbHeight) * this.scrollY() / maxScroll;
    const context = GameContext.context;

    context.save();
    context.translate(0, this.scrollY());
    GameContext.drawRect(trackX, 0, trackWidth, height, 'rgba(255, 255, 255, 0.12)');
    GameContext.drawRect(trackX, thumbY, trackWidth, thumbHeight, 'rgba(220, 235, 255, 0.82)');
    context.restore();
  }

  private getScrollbarThumbHeight(height: number): number {
    const maxScroll = this.maxScrollY;
    return Math.min(height, Math.max(28, height * height / (height + maxScroll)));
  }

  private getScrollbarTrackWidth(width: number): number {
    return Math.min(6, Math.max(3, width * 0.012));
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
