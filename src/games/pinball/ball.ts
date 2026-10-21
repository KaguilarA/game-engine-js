import { CircleBody } from '../../engine/entities/circle-body';
import GameContext from '../../engine/core/context';
import { signalValue } from 'reactive-values';

/** Pinball sphere with engine-backed position, velocity, and acceleration. */
export class PinballBall {
  public readonly body: CircleBody;
  private readonly inShooterLane = signalValue(true);

  public constructor(x: number, y: number, radius: number) {
    this.body = new CircleBody(x, y, radius);
  }

  public update(deltaSeconds: number): void {
    this.body.update(deltaSeconds, 680);
    const horizontalDrag = Math.pow(0.995, deltaSeconds * 60);
    this.body.setVelocity(this.body.velocityX * horizontalDrag, this.body.velocityY);
    const speed = Math.hypot(this.body.velocityX, this.body.velocityY);
    if (speed > 1100) {
      this.body.setVelocity(this.body.velocityX / speed * 1100, this.body.velocityY / speed * 1100);
    }
  }

  /** Turns the ball into the playfield once, without changing its position. */
  public leaveShooter(vx: number, vy: number): boolean {
    if (!this.inShooterLane()) return false;
    this.inShooterLane.set(false);
    this.body.setVelocity(vx, vy);
    return true;
  }

  public draw(): void {
    const { x, y, radius } = this.body;
    GameContext.drawCircle(x + 2, y + 3, radius + 1, 'rgba(0, 0, 0, 0.45)');
    GameContext.drawCircle(x, y, radius, '#d5e8ff');
    GameContext.drawCircle(x - radius * 0.27, y - radius * 0.3, radius * 0.3, '#ffffff');
    GameContext.drawCircle(x + radius * 0.22, y + radius * 0.24, radius * 0.12, '#6c83a9');
  }
}
