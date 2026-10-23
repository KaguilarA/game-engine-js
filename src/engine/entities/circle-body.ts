import PhysicsBody from '../core/physics';

/** Reactive circular collision body backed by the engine's 2D integrator. */
export class CircleBody {
  public readonly motion: PhysicsBody;
  public readonly radius: number;

  public constructor(x: number, y: number, radius: number) {
    if (!Number.isFinite(radius) || radius <= 0) {
      throw new RangeError('Circle radius must be a positive finite number.');
    }
    this.motion = new PhysicsBody(x, y);
    this.radius = radius;
  }

  public get x(): number { return this.motion.x(); }
  public get y(): number { return this.motion.y(); }
  public get velocityX(): number { return this.motion.velocityX(); }
  public get velocityY(): number { return this.motion.velocityY(); }

  public setPosition(x: number, y: number): void {
    this.motion.setPosition(x, y);
  }

  public setVelocity(x: number, y: number): void {
    this.motion.setVelocity(x, y);
  }

  public addVelocity(x: number, y: number): void {
    this.setVelocity(this.velocityX + x, this.velocityY + y);
  }

  public update(deltaSeconds: number, gravityY = 0): void {
    this.motion.update(deltaSeconds, gravityY);
  }
}
