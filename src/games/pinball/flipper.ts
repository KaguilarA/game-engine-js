import { signalValue } from 'reactive-values';

import { Collision2D } from '../../engine/core/collision2d';
import { CircleBody } from '../../engine/entities/circle-body';
import GameContext from '../../engine/core/context';
import type { PinballBounds } from './board';

export type FlipperSide = 'left' | 'right';

/** Rotating bat controlled by keyboard or a held touch button. */
export class PinballFlipper {
  private readonly side: FlipperSide;
  private readonly angle = signalValue(0);
  private readonly pivotX = signalValue(0);
  private readonly pivotY = signalValue(0);
  private readonly length = signalValue(0);
  private readonly thickness = signalValue(0);
  private readonly active = signalValue(false);

  public constructor(side: FlipperSide) {
    this.side = side;
  }

  public update(bounds: PinballBounds, pressed: boolean, deltaSeconds: number): void {
    const isLeft = this.side === 'left';
    const center = bounds.x + bounds.width * 0.5;
    this.pivotX.set(center + (isLeft ? -1 : 1) * bounds.width * 0.22);
    this.pivotY.set(bounds.y + bounds.height * 0.79);
    this.length.set(bounds.width * 0.18);
    this.thickness.set(Math.max(8, bounds.width * 0.027));
    this.active.set(pressed);
    const restAngle = isLeft ? 0.75 : Math.PI - 0.75;
    const activeAngle = isLeft ? -0.1 : Math.PI + 0.1;
    const destination = pressed ? activeAngle : restAngle;
    const blend = Math.min(1, deltaSeconds * 18);
    this.angle.set(this.angle() + (destination - this.angle()) * blend);
  }

  public collide(body: CircleBody): boolean {
    const endX = this.pivotX() + Math.cos(this.angle()) * this.length();
    const endY = this.pivotY() + Math.sin(this.angle()) * this.length();
    return Collision2D.resolveCircleAgainstSegment(
      body,
      this.pivotX(),
      this.pivotY(),
      endX,
      endY,
      this.thickness(),
      0.78
    );
  }

  public draw(): void {
    const endX = this.pivotX() + Math.cos(this.angle()) * this.length();
    const endY = this.pivotY() + Math.sin(this.angle()) * this.length();
    const context = GameContext.context;
    context.save();
    context.lineCap = 'round';
    context.lineWidth = this.thickness() + 8;
    context.strokeStyle = '#07172e';
    context.beginPath();
    context.moveTo(this.pivotX(), this.pivotY());
    context.lineTo(endX, endY);
    context.stroke();
    context.lineWidth = this.thickness();
    context.strokeStyle = this.active() ? '#54e4e9' : '#f2b958';
    context.beginPath();
    context.moveTo(this.pivotX(), this.pivotY());
    context.lineTo(endX, endY);
    context.stroke();
    context.lineWidth = Math.max(2, this.thickness() * 0.18);
    context.strokeStyle = 'rgba(255, 255, 255, 0.72)';
    context.beginPath();
    context.moveTo(this.pivotX(), this.pivotY() - this.thickness() * 0.12);
    context.lineTo(endX, endY - this.thickness() * 0.12);
    context.stroke();
    context.restore();
    GameContext.drawCircle(this.pivotX(), this.pivotY(), this.thickness() * 0.65, '#ffe4a1');
  }

}
