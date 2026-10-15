/**
 * Integrates two-dimensional position and velocity with optional gravity.
 * @class PhysicsBody
 */
export class PhysicsBody {
  /**
   * Stores the x state.
   * @property {ReturnType<typeof signalValue<number>>} x
   * @public
   * @readonly
   */
  public readonly x: ReturnType<typeof signalValue<number>>;
  /**
   * Stores the y state.
   * @property {ReturnType<typeof signalValue<number>>} y
   * @public
   * @readonly
   */
  public readonly y: ReturnType<typeof signalValue<number>>;
  /**
   * Stores the velocity x state.
   * @property {Signal} velocityX
   * @public
   * @readonly
   */
  public readonly velocityX = signalValue(0);
  /**
   * Stores the velocity y state.
   * @property {Signal} velocityY
   * @public
   * @readonly
   */
  public readonly velocityY = signalValue(0);

  /**
   * Creates a body at the supplied position with zero initial velocity.
   * @param x - Initial horizontal position.
   * @param y - Initial vertical position.
   * @public
   * @return {void}
   */
  public constructor(x = 0, y = 0) {
    this.x = signalValue(x);
    this.y = signalValue(y);
  }

  /**
   * Integrates velocity and optional vertical gravity for one frame.
   * @param deltaSeconds - Elapsed frame time in seconds.
   * @param gravityY - Vertical acceleration in world units per second squared.
   * @public
   * @return {void}
   */
  public update(deltaSeconds: number, gravityY = 0): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError('Delta seconds must be a finite non-negative number.');
    }

    if (!Number.isFinite(gravityY)) {
      throw new RangeError('Gravity must be finite.');
    }

    this.y.set(
      this.y() + this.velocityY() * deltaSeconds
      + gravityY * deltaSeconds ** 2 * 0.5
    );
    this.x.set(this.x() + this.velocityX() * deltaSeconds);
    this.velocityY.set(this.velocityY() + gravityY * deltaSeconds);
  }
}
import { signalValue } from 'reactive-values';
