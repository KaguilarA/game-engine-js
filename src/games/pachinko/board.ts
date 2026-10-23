import {
  Collision2D,
  GameContext,
  type CollisionRect
} from '../../engine';
import { PachinkoBall } from './ball';

export interface PachinkoPeg {
  x: number;
  y: number;
  radius: number;
}

export interface PachinkoBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const LANE_COUNT = 9;
const ROW_COUNT = 8;

/** Owns responsive peg geometry, board collisions, and payout-lane layout. */
export class PachinkoBoard {
  private boundsCache: PachinkoBounds | undefined;
  private pegsCache: readonly PachinkoPeg[] = [];
  private railCache: readonly CollisionRect[] = [];
  private laneWallCache: readonly CollisionRect[] = [];

  public get bounds(): PachinkoBounds {
    const viewport = GameContext.gameDimensionsModel;
    const width = Math.min(viewport.getWidth() * 0.78, 540);
    const height = Math.min(viewport.getHeight() * 0.64, 570);
    const next = {
      x: (viewport.getWidth() - width) * 0.5,
      y: Math.max(92, (viewport.getHeight() - height) * 0.5),
      width,
      height
    };
    if (
      this.boundsCache === undefined
      || this.boundsCache.x !== next.x
      || this.boundsCache.y !== next.y
      || this.boundsCache.width !== next.width
      || this.boundsCache.height !== next.height
    ) {
      this.boundsCache = next;
      this.pegsCache = this.createPegs(next);
      this.railCache = this.createRails(next);
      this.laneWallCache = this.createLaneWalls(next);
    }
    return this.boundsCache;
  }

  public get laneCount(): number { return LANE_COUNT; }
  public get laneTop(): number { return this.bounds.y + this.bounds.height - 54; }
  public get laneBottom(): number { return this.bounds.y + this.bounds.height; }

  public laneAt(x: number): number {
    const bounds = this.bounds;
    return Math.max(0, Math.min(LANE_COUNT - 1, Math.floor((x - bounds.x) / (bounds.width / LANE_COUNT))));
  }

  public laneCenter(index: number): number {
    const bounds = this.bounds;
    return bounds.x + bounds.width * (index + 0.5) / LANE_COUNT;
  }

  public launchY(radius: number): number {
    return this.bounds.y + 14 + radius;
  }

  public resolve(ball: PachinkoBall): void {
    const body = ball.body;
    const bounds = this.bounds;
    let touchingPeg = false;
    for (let index = 0; index < this.pegsCache.length; index++) {
      const peg = this.pegsCache[index];
      if (!Collision2D.resolveCircleAgainstCircle(body, peg.x, peg.y, peg.radius, 0.68)) continue;
      touchingPeg = true;
      ball.deflectFromPeg(peg.x, index);
    }
    if (!touchingPeg) ball.clearPegContact();
    for (const rail of this.railCache) Collision2D.resolveCircleAgainstRect(body, rail, 0.68);
    for (const wall of this.laneWallCache) Collision2D.resolveCircleAgainstRect(body, wall, 0.35);
    Collision2D.resolveCircleAgainstHorizontalBounds(body, bounds.x, bounds.x + bounds.width, 0.55);
  }

  public draw(selectedLane: number, payouts: readonly number[]): void {
    const bounds = this.bounds;
    const { x, y, width, height } = bounds;
    const slotTop = this.laneTop;
    GameContext.drawRect(x - 8, y - 8, width + 16, height + 16, '#e5b954');
    GameContext.drawRect(x, y, width, height, 'rgba(12, 19, 44, 0.92)');
    GameContext.drawRect(x, slotTop, width, y + height - slotTop, '#11172e');

    this.pegsCache.forEach((peg) => {
      GameContext.drawCircle(peg.x + 1, peg.y + 2, peg.radius + 1, 'rgba(0, 0, 0, 0.45)');
      GameContext.drawCircle(peg.x, peg.y, peg.radius, '#f0d88a');
      GameContext.drawCircle(peg.x - peg.radius * 0.25, peg.y - peg.radius * 0.3, peg.radius * 0.3, '#ffffff');
    });

    const laneWidth = width / LANE_COUNT;
    for (let index = 0; index <= LANE_COUNT; index++) {
      const dividerX = x + laneWidth * index;
      GameContext.drawRect(dividerX - 1.5, slotTop, 3, y + height - slotTop, '#7588aa');
    }
    payouts.forEach((multiplier, index) => {
      const laneX = x + laneWidth * index;
      if (index === selectedLane) {
        GameContext.drawRect(laneX + 2, slotTop + 2, laneWidth - 4, height - (slotTop - y) - 4, '#ab6f2f');
      }
      GameContext.drawText(
        `${multiplier}x`,
        laneX + laneWidth / 2,
        y + height - 13,
        Math.max(11, Math.min(16, laneWidth * 0.28)),
        multiplier === 0 ? '#b5bfd1' : '#fff0b0',
        'center',
        laneWidth - 3
      );
    });
  }

  private createPegs(bounds: PachinkoBounds): PachinkoPeg[] {
    const spacingX = bounds.width / 10;
    const spacingY = (bounds.height - 142) / ROW_COUNT;
    const radius = Math.max(3, Math.min(6, spacingX * 0.12));
    const pegs: PachinkoPeg[] = [];
    for (let row = 0; row < ROW_COUNT; row++) {
      for (let column = 0; column < LANE_COUNT; column++) {
        pegs.push({
          x: bounds.x + spacingX * (column + 0.5 + (row % 2) * 0.5),
          y: bounds.y + 38 + row * spacingY,
          radius
        });
      }
    }
    return pegs;
  }

  private createRails(bounds: PachinkoBounds): CollisionRect[] {
    const sideRailWidth = Math.max(6, bounds.width * 0.018);
    const railHeight = this.laneTop - bounds.y;
    return [
      { x: bounds.x - sideRailWidth, y: bounds.y, width: sideRailWidth, height: railHeight },
      { x: bounds.x + bounds.width, y: bounds.y, width: sideRailWidth, height: railHeight }
    ];
  }

  private createLaneWalls(bounds: PachinkoBounds): CollisionRect[] {
    const slotTop = bounds.y + bounds.height - 54;
    const laneWidth = bounds.width / LANE_COUNT;
    const wallWidth = Math.max(2, bounds.width * 0.004);
    const walls: CollisionRect[] = [];
    for (let index = 1; index < LANE_COUNT; index++) {
      walls.push({
        x: bounds.x + laneWidth * index - wallWidth * 0.5,
        y: slotTop,
        width: wallWidth,
        height: bounds.height - (slotTop - bounds.y)
      });
    }
    return walls;
  }
}
