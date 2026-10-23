import GameContext from '../core/context';
import { signalValue } from 'reactive-values';
import type { SignalValue } from 'reactive-values';
import type Dimensions from '../core/dimensions';

export interface Camera2DOptions {
  x?: number;
  y?: number;
  zoom?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  smoothing?: number;
}

/** Applies a world-to-screen transform and converts coordinates between spaces. */
export class Camera2D {
  public readonly x: SignalValue<number> = signalValue(0);
  public readonly y: SignalValue<number> = signalValue(0);
  public readonly zoom: SignalValue<number> = signalValue(1);
  private readonly viewportWidth: SignalValue<number> = signalValue(0);
  private readonly viewportHeight: SignalValue<number> = signalValue(0);
  private target: Dimensions | undefined;
  private smoothing: number;
  private readonly autoCenterX: boolean;
  private readonly autoCenterY: boolean;

  public constructor(options: Camera2DOptions = {}) {
    this.autoCenterX = options.x === undefined;
    this.autoCenterY = options.y === undefined;
    this.x.set(options.x ?? GameContext.gameDimensionsModel.getWidth() / 2);
    this.y.set(options.y ?? GameContext.gameDimensionsModel.getHeight() / 2);
    this.zoom.set(options.zoom ?? 1);
    this.viewportWidth.set(options.viewportWidth ?? GameContext.gameDimensionsModel.getWidth());
    this.viewportHeight.set(options.viewportHeight ?? GameContext.gameDimensionsModel.getHeight());
    this.smoothing = options.smoothing ?? 1;
    this.validate();
  }

  public follow(target: Dimensions, smoothing = this.smoothing): void {
    this.target = target;
    this.setSmoothing(smoothing);
  }

  public stopFollowing(): void {
    this.target = undefined;
  }

  public setSmoothing(value: number): void {
    if (!Number.isFinite(value) || value <= 0 || value > 1) {
      throw new RangeError('Camera smoothing must be greater than 0 and at most 1.');
    }
    this.smoothing = value;
  }

  public update(deltaSeconds: number): void {
    const width = GameContext.gameDimensionsModel.getWidth();
    const height = GameContext.gameDimensionsModel.getHeight();
    if (this.viewportWidth() !== width) {
      this.viewportWidth.set(width);
      if (this.autoCenterX && !this.target) this.x.set(width / 2);
    }
    if (this.viewportHeight() !== height) {
      this.viewportHeight.set(height);
      if (this.autoCenterY && !this.target) this.y.set(height / 2);
    }
    if (!this.target) return;
    const targetX = this.target.getX();
    const targetY = this.target.getY();
    const alpha = this.smoothing >= 1
      ? 1
      : 1 - Math.pow(1 - this.smoothing, Math.max(0, deltaSeconds) * 60);
    this.x.set(this.x() + (targetX - this.x()) * alpha);
    this.y.set(this.y() + (targetY - this.y()) * alpha);
  }

  public worldToScreen(x: number, y: number): { x: number; y: number } {
    return {
      x: (x - this.x()) * this.zoom() + this.viewportWidth() / 2,
      y: (y - this.y()) * this.zoom() + this.viewportHeight() / 2
    };
  }

  public screenToWorld(x: number, y: number): { x: number; y: number } {
    return {
      x: (x - this.viewportWidth() / 2) / this.zoom() + this.x(),
      y: (y - this.viewportHeight() / 2) / this.zoom() + this.y()
    };
  }

  public withTransform(draw: () => void, parallaxX = 1, parallaxY = 1): void {
    const context = GameContext.context;
    context.save();
    context.translate(this.viewportWidth() / 2, this.viewportHeight() / 2);
    context.scale(this.zoom(), this.zoom());
    context.translate(-this.x() * parallaxX, -this.y() * parallaxY);
    try {
      draw();
    } finally {
      context.restore();
    }
  }

  private validate(): void {
    if (!Number.isFinite(this.x()) || !Number.isFinite(this.y())) {
      throw new RangeError('Camera position must be finite.');
    }
    if (!Number.isFinite(this.zoom()) || this.zoom() <= 0) {
      throw new RangeError('Camera zoom must be greater than zero.');
    }
    if (!Number.isFinite(this.viewportWidth()) || this.viewportWidth() < 0
      || !Number.isFinite(this.viewportHeight()) || this.viewportHeight() < 0) {
      throw new RangeError('Camera viewport dimensions must be finite and non-negative.');
    }
  }
}
