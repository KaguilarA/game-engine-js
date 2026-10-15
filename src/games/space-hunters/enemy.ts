import Sprite from '../../engine/sprite';
import GameLoader from '../../engine/loader';
import { Health } from '../../engine/health';
import { SpriteEntity } from '../../engine/sprite-entity';
import { getSpriteSheet } from '../../engine/sprite-sheets';

/**
 * A single invader in the game's enemy formation.
 * @class Enemy
 */
export class Enemy extends SpriteEntity {
  /**
   * Stores the health state.
   * @property {Health} health
   * @private
   * @readonly
   */
  private readonly health: Health;
  /**
   * Stores the is impacting state.
   * @property {boolean} isImpacting
   * @private
   */
  private isImpacting = false;
  /**
   * Stores the source y state.
   * @property {number} sourceY
   * @private
   * @readonly
   */
  private readonly sourceY: number;

  /**
   * Stores the points state.
   * @property {number} points
   * @public
   * @readonly
   */
  public readonly points: number;
  /**
   * Stores the is alive state.
   * @property {boolean} isAlive
   * @public
   */
  public isAlive = true;

  /**
   * Reports whether the enemy's health has been depleted.
   * @public
   * @return {boolean}
   */
  public get isDefeated(): boolean {
    return this.health.isDepleted;
  }

  /**
   * Creates an invader using the selected sprite row and combat stats.
   * @public
   * @return {void}
   */
  constructor(
    x: number,
    y: number,
    sourceY: number,
    points: number,
    maximumHealth = 1,
    width = 72,
    height = 64
  ) {
    const sheet = getSpriteSheet('eaglemorph');
    super(new Sprite(
      GameLoader.getImage('eaglemorph'),
      width,
      height,
      x,
      y,
      0,
      0,
      0,
      sourceY,
      sheet.frameWidth,
      sheet.frameHeight,
      sheet.animationFrames
    ));
    this.sourceY = sourceY;
    this.points = points;
    this.health = new Health(maximumHealth);
    this.sprite.playClip(0, sourceY, sheet.animationFrames, 7, true);
  }

  public override draw(): void {
    if (this.isAlive) {
      this.sprite.draw();
    }
  }

  /**
   * Advances the idle or impact animation and resolves its completion.
   * @public
   * @return {void}
   */
  public update(deltaSeconds: number): void {
    this.updateSprite(deltaSeconds);

    if (this.isImpacting && !this.sprite.isAnimationPlaying) {
      this.isImpacting = false;

      if (this.health.isDepleted) {
        this.isAlive = false;
      } else {
        this.sprite.playClip(0, this.sourceY, 4, 7, true);
      }
    }
  }

  /**
   * Applies a rectangular projectile hit and starts the impact animation.
   * @public
   * @return {boolean} Whether the projectile overlapped the enemy.
   */
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
      const sheet = getSpriteSheet('eaglemorph');
      this.sprite.playClip(
        sheet.explosionX ?? 320,
        this.sourceY,
        sheet.explosionFrames ?? 5,
        14
      );
    }

    return intersects;
  }
}
