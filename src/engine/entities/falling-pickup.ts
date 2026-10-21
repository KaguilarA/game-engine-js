import { PhysicsBody } from '../core/physics';

/** Reusable falling pickup motion and centered world-space geometry. */
export class FallingPickup {
  public readonly physics: PhysicsBody;
  public readonly size: number;

  public constructor(x: number, y: number, size: number, fallSpeed = 180) {
    this.physics = new PhysicsBody(x, y);
    this.size = size;
    this.physics.setVelocity(0, fallSpeed);
  }

  public get x(): number {
    return this.physics.x();
  }

  public get y(): number {
    return this.physics.y();
  }

  public update(deltaSeconds: number): void {
    this.physics.update(deltaSeconds);
  }
}
