import { signalValue, type SignalValue } from 'reactive-values';

/**
 * Shared two-dimensional position, velocity, and acceleration integrator.
 * @class PhysicsBody
 */
export default class {
  /**
   * Horizontal world position.
   * @property {SignalValue<number>} x
   * @public
   * @readonly
   */
  public readonly x: SignalValue<number> = signalValue(0);

  /**
   * Vertical world position.
   * @property {SignalValue<number>} y
   * @public
   * @readonly
   */
  public readonly y: SignalValue<number> = signalValue(0);

  /**
   * Horizontal velocity in world units per second.
   * @property {SignalValue<number>} velocityX
   * @public
   * @readonly
   */
  public readonly velocityX: SignalValue<number> = signalValue(0);

  /**
   * Vertical velocity in world units per second.
   * @property {SignalValue<number>} velocityY
   * @public
   * @readonly
   */
  public readonly velocityY: SignalValue<number> = signalValue(0);

  /**
   * Horizontal acceleration in world units per second squared.
   * @property {SignalValue<number>} accelerationX
   * @public
   * @readonly
   */
  public readonly accelerationX: SignalValue<number> = signalValue(0);

  /**
   * Vertical acceleration in world units per second squared.
   * @property {SignalValue<number>} accelerationY
   * @public
   * @readonly
   */
  public readonly accelerationY: SignalValue<number> = signalValue(0);

  /**
   * Creates a body at the supplied position with no initial motion.
   * @public
   * @return {void}
   */
  constructor(x = 0, y = 0) {
    this.setPosition(x, y);
  }

  /**
   * Rejects invalid coordinates, timing, and motion values.
   * @private
   * @return {void}
   */
  private assertFinite(value: number, label: string): void {
    if (!Number.isFinite(value)) {
      throw new RangeError(`${label} must be finite.`);
    }
  }

  /**
   * Integrates velocity and acceleration for one frame.
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
   * Sets the body position without changing its motion.
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
}
