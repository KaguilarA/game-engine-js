import { signalValue } from 'reactive-values';

/**
 * Shared two-dimensional position, velocity, and acceleration integrator.
 * @class PhysicsBody
 */
export class PhysicsBody {
  /**
   * Horizontal world position.
   * @property {Signal<number>} x
   * @public
   * @readonly
   */
  public readonly x = signalValue(0);
  /**
   * Vertical world position.
   * @property {Signal<number>} y
   * @public
   * @readonly
   */
  public readonly y = signalValue(0);
  /**
   * Horizontal velocity in world units per second.
   * @property {Signal<number>} velocityX
   * @public
   * @readonly
   */
  public readonly velocityX = signalValue(0);
  /**
   * Vertical velocity in world units per second.
   * @property {Signal<number>} velocityY
   * @public
   * @readonly
   */
  public readonly velocityY = signalValue(0);
  /**
   * Horizontal acceleration in world units per second squared.
   * @property {Signal<number>} accelerationX
   * @public
   * @readonly
   */
  public readonly accelerationX = signalValue(0);
  /**
   * Vertical acceleration in world units per second squared.
   * @property {Signal<number>} accelerationY
   * @public
   * @readonly
   */
  public readonly accelerationY = signalValue(0);

  /**
   * Creates a body at the supplied position with no initial motion.
   * @param x - Initial horizontal coordinate.
   * @param y - Initial vertical coordinate.
   * @public
   * @return {void}
   */
  public constructor(x = 0, y = 0) {
    this.setPosition(x, y);
  }

  /**
   * Integrates velocity and acceleration for one frame.
   * @param deltaSeconds - Elapsed time since the previous frame.
   * @param verticalAcceleration - Optional vertical acceleration override.
   * @public
   * @return {void}
   */
  public update(deltaSeconds: number, verticalAcceleration?: number): void {
    this.assertFinite(deltaSeconds, 'Delta seconds');
    if (deltaSeconds < 0) {
      throw new RangeError('Delta seconds must be non-negative.');
    }

    const accelerationX = this.accelerationX();
    const accelerationY = verticalAcceleration ?? this.accelerationY();
    this.assertFinite(this.velocityX(), 'Horizontal velocity');
    this.assertFinite(this.velocityY(), 'Vertical velocity');
    this.assertFinite(accelerationX, 'Horizontal acceleration');
    this.assertFinite(accelerationY, 'Vertical acceleration');

    this.x.set(
      this.x() + this.velocityX() * deltaSeconds
      + accelerationX * deltaSeconds ** 2 * 0.5
    );
    this.y.set(
      this.y() + this.velocityY() * deltaSeconds
      + accelerationY * deltaSeconds ** 2 * 0.5
    );
    this.velocityX.set(this.velocityX() + accelerationX * deltaSeconds);
    this.velocityY.set(this.velocityY() + accelerationY * deltaSeconds);
  }

  /**
   * Sets the body's position without changing its motion.
   * @param x - Horizontal world coordinate.
   * @param y - Vertical world coordinate.
   * @public
   * @return {void}
   */
  public setPosition(x: number, y: number): void {
    this.assertFinite(x, 'x');
    this.assertFinite(y, 'y');
    this.x.set(x);
    this.y.set(y);
  }

  /**
   * Sets both velocity components in world units per second.
   * @param x - Horizontal velocity.
   * @param y - Vertical velocity.
   * @public
   * @return {void}
   */
  public setVelocity(x: number, y: number): void {
    this.assertFinite(x, 'velocityX');
    this.assertFinite(y, 'velocityY');
    this.velocityX.set(x);
    this.velocityY.set(y);
  }

  /**
   * Applies an immediate positional displacement.
   * @param x - Horizontal displacement.
   * @param y - Vertical displacement.
   * @public
   * @return {void}
   */
  public translate(x: number, y: number): void {
    this.setPosition(this.x() + x, this.y() + y);
  }

  /**
   * Clears velocity and acceleration without changing position.
   * @public
   * @return {void}
   */
  public stop(): void {
    this.setVelocity(0, 0);
    this.accelerationX.set(0);
    this.accelerationY.set(0);
  }

  /** Rejects invalid coordinates, timing, and motion values. */
  private assertFinite(value: number, label: string): void {
    if (!Number.isFinite(value)) {
      throw new RangeError(`${label} must be finite.`);
    }
  }
}
