/**
 * Integrates two-dimensional position and velocity with optional gravity.
 */
export class PhysicsBody {
  public readonly x: ReturnType<typeof signalValue<number>>;
  public readonly y: ReturnType<typeof signalValue<number>>;
  public readonly velocityX = signalValue(0);
  public readonly velocityY = signalValue(0);

  public constructor(x = 0, y = 0) {
    this.x = signalValue(x);
    this.y = signalValue(y);
  }

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
