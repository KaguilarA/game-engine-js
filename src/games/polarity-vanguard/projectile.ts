import GameContext from '../../engine/context';

import type { Polarity } from './polarity';
import { POLARITY_COLORS } from './polarity';

/**
 * Vertical projectile whose color and collision state follow its polarity.
 * @class PolarityProjectile
 */
export class PolarityProjectile {
  /**
   * Stores the active state.
   * @property {boolean} active
   * @public
   */
  public active = false;
  /**
   * Stores the x state.
   * @property {number} x
   * @public
   */
  public x = 0;
  /**
   * Stores the y state.
   * @property {number} y
   * @public
   */
  public y = 0;
  /**
   * Stores the radius state.
   * @property {number} radius
   * @public
   * @readonly
   */
  public readonly radius: number;
  /**
   * Stores the speed state.
   * @property {number} speed
   * @private
   * @readonly
   */
  private readonly speed: number;
  /**
   * Stores the polarity state.
   * @property {Polarity} polarity
   * @private
   */
  private polarity: Polarity;
  /**
   * Stores the direction state.
   * @property {number} direction
   * @private
   */
  private direction = -1;

  /**
   * Creates a pooled projectile with fixed speed and rendered radius.
   * @public
   * @return {void}
   */
  public constructor(speed: number, polarity: Polarity, radius: number) {
    this.speed = speed;
    this.polarity = polarity;
    this.radius = radius;
  }

  /**
   * Activates or reuses the projectile at a position and travel direction.
   * @public
   * @return {void}
   */
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

  /**
   * Moves the projectile and deactivates it after it leaves the viewport.
   * @public
   * @return {void}
   */
  public update(deltaSeconds: number): void {
    if (!this.active) return;

    this.y += this.direction * this.speed * deltaSeconds;

    const height = GameContext.gameDimensionsModel.getHeight();
    if (this.y < -this.radius || this.y > height + this.radius) {
      this.active = false;
    }
  }

  /**
   * Draws the active projectile using its polarity color.
   * @public
   * @return {void}
   */
  public draw(): void {
    if (!this.active) return;

    GameContext.drawCircle(
      this.x,
      this.y,
      this.radius,
      POLARITY_COLORS[this.polarity]
    );
  }

  /**
   * Returns the projectile's current polarity.
   * @public
   * @return {Polarity}
   */
  public getPolarity(): Polarity {
    return this.polarity;
  }
}
