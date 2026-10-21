import { CircleBody } from '../../engine/entities/circle-body';
import GameContext from '../../engine/core/context';
import { signalValue } from 'reactive-values';

/** Lightweight game token that delegates motion to the engine's circle body. */
export class PachinkoBall {
  public readonly body: CircleBody;
  private readonly deflectionState = signalValue(0x6d2b79f5);
  private readonly pegContact = signalValue(-1);

  public constructor(x: number, y: number, radius: number) {
    this.body = new CircleBody(x, y, radius);
    this.body.setVelocity(0, 35);
    this.deflectionState.set((Math.floor(x * 17 + y * 31) | 0) || 0x6d2b79f5);
  }

  public update(deltaSeconds: number): void {
    this.body.update(deltaSeconds, 720);
  }

  /** Adds deterministic lateral motion to perfectly centered peg impacts. */
  public deflectFromPeg(pegX: number, pegIndex: number): void {
    if (this.pegContact() === pegIndex || Math.abs(this.body.x - pegX) > this.body.radius * 0.6) return;
    this.pegContact.set(pegIndex);
    let state = this.deflectionState();
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state |= 0;
    this.deflectionState.set(state);
    const direction = (state & 1) === 0 ? -1 : 1;
    const impulse = Math.max(70, Math.min(145, Math.abs(this.body.velocityY) * 0.3));
    const lateralVelocity = Math.max(-240, Math.min(240, this.body.velocityX + direction * impulse));
    this.body.setVelocity(lateralVelocity, this.body.velocityY);
  }

  public clearPegContact(): void {
    this.pegContact.set(-1);
  }

  public draw(): void {
    const { x, y, radius } = this.body;
    GameContext.drawCircle(x, y, radius + 2, '#ffca57');
    GameContext.drawCircle(x - radius * 0.16, y - radius * 0.18, radius * 0.62, '#fff4bf');
    GameContext.drawCircle(x, y, radius * 0.78, '#ef8e31');
  }
}
