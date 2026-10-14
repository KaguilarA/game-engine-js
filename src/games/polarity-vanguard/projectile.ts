import GameContext from '../../engine/context';

import type { Polarity } from './polarity';
import { POLARITY_COLORS } from './polarity';

export class PolarityProjectile {
  public active = false;
  public x = 0;
  public y = 0;
  public readonly radius: number;
  private readonly speed: number;
  private polarity: Polarity;
  private direction = -1;

  public constructor(speed: number, polarity: Polarity, radius: number) {
    this.speed = speed;
    this.polarity = polarity;
    this.radius = radius;
  }

  public start(
    x: number,
    y: number,
    direction: -1 | 1,
    polarity = this.polarity
  ): void {
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.polarity = polarity;
    this.active = true;
  }

  public update(deltaSeconds: number): void {
    if (!this.active) return;

    this.y += this.direction * this.speed * deltaSeconds;

    const height = GameContext.gameDimensionsModel.getHeight();
    if (this.y < -this.radius || this.y > height + this.radius) {
      this.active = false;
    }
  }

  public draw(): void {
    if (!this.active) return;

    GameContext.drawCircle(
      this.x,
      this.y,
      this.radius,
      POLARITY_COLORS[this.polarity]
    );
  }

  public getPolarity(): Polarity {
    return this.polarity;
  }
}
