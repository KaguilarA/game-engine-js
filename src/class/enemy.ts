import Sprite from './sprite';
import GameLoader from '../engine/loader';
import { Health } from './health';

/**
 * A single invader in the game's enemy formation.
 */
export class Enemy {
  private readonly sprite: Sprite;
  private readonly health: Health;
  private isImpacting = false;

  public readonly points: number;
  public isAlive = true;

  public get isDefeated(): boolean {
    return this.health.isDepleted;
  }

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

  public get dimensions() {
    return this.sprite.dimensions;
  }

  constructor(
    x: number,
    y: number,
    sourceY: number,
    points: number,
    maximumHealth = 1
  ) {
    this.points = points;
    this.health = new Health(maximumHealth);
    this.sprite = new Sprite(
      GameLoader.getImage('eaglemorph'),
      72,
      64,
      x,
      y,
      0,
      0,
      0,
      sourceY,
      80,
      80,
      8
    );
  }

  public draw(): void {
    if (this.isAlive) {
      this.sprite.draw();
    }
  }

  public update(deltaSeconds: number): void {
    this.sprite.update(deltaSeconds);

    if (this.isImpacting && !this.sprite.isAnimationPlaying) {
      this.isImpacting = false;

      if (this.health.isDepleted) {
        this.isAlive = false;
      } else {
        this.sprite.setFrame(0);
      }
    }
  }

  public moveBy(x: number, y: number): void {
    this.sprite.dimensions.setPosition(this.x + x, this.y + y);
  }

  public hit(
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    if (!this.isAlive || this.health.isDepleted) {
      return false;
    }

    const intersects = (
      x < this.dimensions.right()
      && x + width > this.dimensions.left()
      && y < this.dimensions.bottom()
      && y + height > this.dimensions.top()
    );

    if (intersects) {
      const damage = this.health.receiveDamage();

      if (!damage.wasDamaged) return false;

      this.isImpacting = true;
      this.sprite.play(
        damage.isDepleted ? 4 : 1,
        damage.isDepleted ? 4 : 3,
        14
      );
    }

    return intersects;
  }
}
