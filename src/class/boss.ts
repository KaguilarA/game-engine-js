import GameLoader from '../engine/loader';
import { Health } from './health';
import Sprite from './sprite';

export type BossType = 1 | 2 | 3;

export interface BossShotOrigin {
  x: number;
  y: number;
}

/**
 * A boss with a distinct movement, vulnerability, and attack pattern.
 */
export class Boss {
  private readonly sprite: Sprite;
  private readonly health: Health;
  private elapsed = 0;
  private direction = 1;
  private destructionPlaying = false;

  public readonly type: BossType;
  public isAlive = true;

  public get points(): number {
    return this.health.maximum * 25;
  }

  public get name(): string {
    if (this.type === 1) return 'HIVE MOTHER';
    if (this.type === 2) return 'AEGIS CORE';
    return 'VOID EMPRESS';
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

  public get healthRatio(): number {
    return this.health.current / this.health.maximum;
  }

  public get isVulnerable(): boolean {
    if (!this.isAlive || this.health.isDepleted) return false;

    if (this.type === 2) {
      return Math.floor(this.elapsed / 2) % 2 === 0;
    }

    if (this.type === 3) {
      return this.elapsed % 3 >= 1.2;
    }

    return true;
  }

  public get isShielded(): boolean {
    return this.type === 2 && !this.isVulnerable;
  }

  constructor(
    type: BossType,
    x: number,
    y: number
  ) {
    this.type = type;
    this.health = new Health(type === 1 ? 12 : type === 2 ? 18 : 24);

    const imageName = type === 1 ? 'boss' : 'boss8';
    const sourceY = type === 3 ? 800 : 0;

    this.sprite = new Sprite(
      GameLoader.getImage(imageName),
      type === 1 ? 190 : 180,
      type === 1 ? 170 : 180,
      x,
      y,
      0.5,
      0.5,
      0,
      sourceY,
      220,
      200,
      10
    );
  }

  public update(deltaSeconds: number, gameWidth: number): void {
    if (!this.isAlive) return;

    this.elapsed += deltaSeconds;
    this.sprite.update(deltaSeconds);

    if (this.destructionPlaying && !this.sprite.isAnimationPlaying) {
      this.isAlive = false;
      return;
    }

    if (this.destructionPlaying) return;

    const speed = this.type === 3 ? 180 : this.type === 2 ? 90 : 125;
    let nextX = this.x + this.direction * speed * deltaSeconds;

    if (nextX - this.width * 0.5 <= 24) {
      this.direction = 1;
      nextX = this.width * 0.5 + 24;
    } else if (nextX + this.width * 0.5 >= gameWidth - 24) {
      this.direction = -1;
      nextX = gameWidth - this.width * 0.5 - 24;
    }

    const nextY = this.type === 3
      ? 220 + Math.sin(this.elapsed * 2.5) * 70
      : this.y;

    this.sprite.dimensions.setPosition(nextX, nextY);
  }

  public draw(): void {
    if (this.isAlive) {
      this.sprite.draw();
    }
  }

  public hit(
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    if (!this.isVulnerable) return false;

    const intersects = (
      x < this.sprite.dimensions.right()
      && x + width > this.sprite.dimensions.left()
      && y < this.sprite.dimensions.bottom()
      && y + height > this.sprite.dimensions.top()
    );

    if (!intersects) return false;

    const damage = this.health.receiveDamage();

    if (!damage.wasDamaged) return false;

    if (damage.isDepleted) {
      this.destructionPlaying = true;
      this.sprite.play(6, 4, 14);
    }

    return damage.wasDamaged;
  }

  public getShotOrigins(): BossShotOrigin[] {
    if (this.type === 2) {
      return [
        { x: this.x - this.width * 0.35, y: this.y + this.height * 0.4 },
        { x: this.x, y: this.y + this.height * 0.4 },
        { x: this.x + this.width * 0.35, y: this.y + this.height * 0.4 }
      ];
    }

    if (this.type === 3) {
      return [
        { x: this.x - this.width * 0.4, y: this.y + this.height * 0.4 },
        { x: this.x + this.width * 0.4, y: this.y + this.height * 0.4 }
      ];
    }

    return [{ x: this.x, y: this.y + this.height * 0.4 }];
  }
}
