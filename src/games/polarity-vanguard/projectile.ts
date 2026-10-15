import GameContext from '../../engine/context';
import { PhysicsBody } from '../../engine/physics';

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
  private readonly motion = new PhysicsBody();
  /**
   * Stores the y state.
   * @property {number} y
   * @public
   */
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

  /** Current horizontal world coordinate. */
  public get x(): number {
    return this.motion.x();
  }

  /** Current vertical world coordinate. */
  public get y(): number {
    return this.motion.y();
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
    this.motion.setPosition(x, y);
    this.motion.setVelocity(0, this.direction * this.speed);
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

    this.motion.update(deltaSeconds);

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
