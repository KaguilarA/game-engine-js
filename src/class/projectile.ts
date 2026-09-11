import { signalValue } from 'reactive-values';
import { Dimensions } from '../engine/dimensions';
import type { GameContext } from '../engine/context';

export class Projectile {
  private context: GameContext;
  private dimensions = new Dimensions(8, 20, 0, 0);
  private speed = signalValue(20);
  public isFree = signalValue(true);

  public get height() {
    return this.dimensions.size().height;
  }

  public get width() {
    return this.dimensions.size().width;
  }

  public get x() {
    return this.dimensions.position().x;
  }

  public get y() {
    return this.dimensions.position().y;
  }

  constructor(context: GameContext) {
    this.context = context;
  }

  public draw(): void {
    if (!this.isFree()) {
      this.context.drawRect(
        this.x,
        this.y,
        this.width,
        this.height,
        'green'
      );
    }
  }

  public start(x: number, y: number): void {
    this.dimensions.setPosition((x - this.width * 0.5), y);
    this.isFree.set(false);
  }

  public stop(): void {
    this.isFree.set(true);
  }

  public update(): void {
    if (!this.isFree()) {
      this.dimensions.setPosition(this.x, this.y - this.speed());

      if (this.y < -this.height) this.stop();
    }
  }
}