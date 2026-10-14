/**
 * Integrates two-dimensional position and velocity with optional gravity.
 */
export class PhysicsBody {
  public x: number;
  public y: number;
  public velocityX = 0;
  public velocityY = 0;

  public constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  public update(deltaSeconds: number, gravityY = 0): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError('Delta seconds must be a finite non-negative number.');
    }

    if (!Number.isFinite(gravityY)) {
      throw new RangeError('Gravity must be finite.');
    }

    this.y += this.velocityY * deltaSeconds + gravityY * deltaSeconds ** 2 * 0.5;
    this.x += this.velocityX * deltaSeconds;
    this.velocityY += gravityY * deltaSeconds;
  }
}
