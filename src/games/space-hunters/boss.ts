import GameLoader from '../../engine/loader';
import { Health } from '../../engine/health';
import Sprite from '../../engine/sprite';
import { SpriteEntity } from '../../engine/sprite-entity';
import { getSpriteSheet } from '../../engine/sprite-sheets';

/**
 * Available boss encounters, each with its own health and attack phases.
 */
export type BossType = 1 | 2 | 3;

/**
 * Canvas position from which the boss may launch a projectile.
 */
export interface BossShotOrigin {
  /**
   * Horizontal projectile start coordinate.
   * @property {number} x
   * @public
   */
  x: number;
  /**
   * Vertical projectile start coordinate.
   * @property {number} y
   * @public
   */
  y: number;
}

/**
 * A boss with a distinct movement, vulnerability, and attack pattern.
 * @class Boss
 */
export class Boss extends SpriteEntity {
  /**
   * Stores the health state.
   * @property {Health} health
   * @private
   * @readonly
   */
  private readonly health: Health;
  /**
   * Stores the elapsed state.
   * @property {number} elapsed
   * @private
   */
  private elapsed = 0;
  /**
   * Stores the direction state.
   * @property {number} direction
   * @private
   */
  private direction = 1;
  /**
   * Stores the destruction playing state.
   * @property {boolean} destructionPlaying
   * @private
   */
  private destructionPlaying = false;

  /**
   * Stores the type state.
   * @property {BossType} type
   * @public
   * @readonly
   */
  public readonly type: BossType;
  /**
   * Stores the is alive state.
   * @property {boolean} isAlive
   * @public
   */
  public isAlive = true;

  /**
   * Returns the score awarded when this boss is defeated.
   * @public
   * @return {number}
   */
  public get points(): number {
    return this.health.maximum * 25;
  }

  /**
   * Returns the display name for the selected boss type.
   * @public
   * @return {string}
   */
  public get name(): string {
    if (this.type === 1) return 'HIVE MOTHER';
    if (this.type === 2) return 'AEGIS CORE';
    return 'VOID EMPRESS';
  }

  /**
   * Returns remaining health as a value from zero to one.
   * @public
   * @return {number}
   */
  public get healthRatio(): number {
    return this.health.current / this.health.maximum;
  }

  /**
   * Reports whether the boss can currently take projectile damage.
   * @public
   * @return {boolean}
   */
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

  /**
   * Reports whether the boss's timed shield is currently active.
   * @public
   * @return {boolean}
   */
  public get isShielded(): boolean {
    return this.type === 2 && !this.isVulnerable;
  }

  /**
   * Creates a boss with type-specific health, movement, and animations.
   * @public
   * @return {void}
   */
  constructor(
    type: BossType,
    x: number,
    y: number,
    width?: number,
    height?: number
  ) {
    const imageName = 'boss8';
    const sourceY = type === 1 ? 0 : type === 2 ? 400 : 800;
    const sheet = getSpriteSheet(imageName);
    const defaultWidth = type === 1 ? 190 : 180;
    const defaultHeight = defaultWidth;

    super(new Sprite(
      GameLoader.getImage(imageName),
      width ?? defaultWidth,
      height ?? defaultHeight,
      x,
      y,
      0.5,
      0.5,
      0,
      sourceY,
      sheet.frameWidth,
      sheet.frameHeight,
      sheet.animationFrames + (sheet.explosionFrames ?? 0)
    ));
    this.type = type;
    this.health = new Health(type === 1 ? 12 : type === 2 ? 18 : 24);
    this.sprite.playClip(0, sourceY, sheet.animationFrames, 7, true);
  }

  /**
   * Advances boss movement, vulnerability phases, and defeat animation.
   * @public
   * @return {void}
   */
  public update(deltaSeconds: number, gameWidth: number): void {
    if (!this.isAlive) return;

    this.elapsed += deltaSeconds;
    this.updateSprite(deltaSeconds);

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

  public override draw(): void {
    if (this.isAlive) {
      this.sprite.draw();
    }
  }

  /**
   * Applies a rectangular hit if the boss is currently vulnerable.
   * @public
   * @return {boolean} Whether the hit damaged the boss.
   */
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
      const sheet = getSpriteSheet('boss8');
      this.sprite.playClip(
        sheet.explosionX ?? sheet.frameWidth * sheet.animationFrames,
        this.type === 3 ? 800 : 0,
        sheet.explosionFrames ?? 4,
        14
      );
    }

    return damage.wasDamaged;
  }

  /**
   * Returns projectile origins for the boss's configured attack pattern.
   * @public
   * @return {BossShotOrigin[]}
   */
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
