import { signalValue } from 'reactive-values';

import GameContext from '../../engine/context';
import GameLoader from '../../engine/loader';
import Sprite from '../../engine/sprite';

export class Projectile {
  private readonly sprite = new Sprite(
    GameLoader.getImage('enemyProjectile'),
    14,
    28,
    0,
    0,
    0,
    0,
    0,
    0,
    50,
    70,
    4,
    12
  );
  private direction = -1;
  private readonly speed = 620;

  public readonly isFree = signalValue(true);

  public get height(): number {
    return this.sprite.dimensions.getHeight();
  }

  public get width(): number {
    return this.sprite.dimensions.getWidth();
  }

  public get x(): number {
    return this.sprite.dimensions.getX();
  }

  public get y(): number {
    return this.sprite.dimensions.getY();
  }

  public get dimensions() {
    return this.sprite.dimensions;
  }

  public draw(): void {
    if (!this.isFree()) {
      this.sprite.draw();
    }
  }

  public start(x: number, y: number, direction = -1): void {
    this.direction = direction;
    this.sprite.dimensions.setPosition(
      x - this.width * 0.5,
      y
    );
    this.isFree.set(false);
  }

  public stop(): void {
    this.isFree.set(true);
  }

  public update(deltaSeconds: number): void {
    if (this.isFree()) return;

    this.sprite.update(deltaSeconds);
    const nextY = this.y + this.speed * this.direction * deltaSeconds;
    const gameHeight = GameContext.gameDimensionsModel.getHeight();

    if (nextY < -this.height || nextY > gameHeight + this.height) {
      this.stop();
      return;
    }

    this.sprite.dimensions.setPosition(this.x, nextY);
  }
}
