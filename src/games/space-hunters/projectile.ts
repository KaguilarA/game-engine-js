import { signalValue } from 'reactive-values';

import GameContext from '../../engine/context';
import GameLoader from '../../engine/loader';
import Sprite from '../../engine/sprite';
import { SpriteEntity } from '../../engine/sprite-entity';
import { getSpriteSheet } from '../../engine/sprite-sheets';

/**
 * Pooled animated projectile that travels vertically through the playfield.
 * @class Projectile
 */
export class Projectile extends SpriteEntity {
  /**
   * Stores the direction state.
   * @property {number} direction
   * @private
   */
  private direction = -1;
  /**
   * Stores the speed state.
   * @property {number} speed
   * @private
   * @readonly
   */
  private readonly speed = 620;

  /**
   * Stores the is free state.
   * @property {Signal} isFree
   * @public
   * @readonly
   */
  public readonly isFree = signalValue(true);

  /**
   * Creates an inactive projectile using the shared animated bullet sheet.
   * @public
   * @return {void}
   */
  public constructor() {
    const sheet = getSpriteSheet('enemyProjectile');
    super(new Sprite(
      GameLoader.getImage('enemyProjectile'),
      14,
      28,
      0,
      0,
      0,
      0,
      0,
      0,
      sheet.frameWidth,
      sheet.frameHeight,
      sheet.animationFrames,
      12
    ));
    this.sprite.playClip(0, 0, sheet.animationFrames, 12, true);
  }

  public override draw(): void {
    if (!this.isFree()) {
      super.draw();
    }
  }

  /**
   * Activates the projectile at a position and vertical direction.
   * @public
   * @return {void}
   */
  public start(x: number, y: number, direction = -1): void {
    this.direction = direction;
    this.sprite.dimensions.setPosition(
      x - this.width * 0.5,
      y
    );
    this.isFree.set(false);
  }

  /**
   * Returns the projectile to the inactive pool.
   * @public
   * @return {void}
   */
  public stop(): void {
    this.isFree.set(true);
  }

  /**
   * Moves the projectile and releases it after leaving the viewport.
   * @public
   * @return {void}
   */
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
