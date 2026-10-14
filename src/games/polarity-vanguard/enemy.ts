import GameLoader from '../../engine/loader';
import Sprite from '../../engine/sprite';

import type { Polarity } from './polarity';

export class PolarityVanguardEnemy {
  private readonly sprite: Sprite;
  private readonly phase: number;
  private elapsed = 0;
  public alive = true;

  public get x(): number {
    return this.sprite.dimensions.getX();
  }

  public get y(): number {
    return this.sprite.dimensions.getY();
  }

  public get width(): number {
    return this.sprite.dimensions.getWidth();
  }

  public get height(): number {
    return this.sprite.dimensions.getHeight();
  }

  public constructor(x: number, y: number, polarity: Polarity, phase: number) {
    this.polarity = polarity;
    this.phase = phase;
    this.sprite = new Sprite(
      GameLoader.getImage('eaglemorph'),
      72,
      64,
      x,
      y,
      0.5,
      0.5,
      0,
      0,
      80,
      80,
      8
    );
  }

  public readonly polarity: Polarity;

  public update(deltaSeconds: number): void {
    this.elapsed += deltaSeconds;
    this.sprite.dimensions.setPosition(
      this.x + Math.sin(this.elapsed * 2 + this.phase) * 48 * deltaSeconds,
      this.y + 20 * deltaSeconds
    );
  }

  public draw(): void {
    if (this.alive) {
      this.sprite.draw();
    }
  }
}
