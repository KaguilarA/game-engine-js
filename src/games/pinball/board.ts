import GameContext from '../../engine/core/context';
import GameLoader from '../../engine/assets/loader';
import Sprite from '../../engine/animations/sprites/sprite';
import { Collision2D } from '../../engine/core/collision2d';
import type { CollisionRect } from '../../engine/core/collision2d';
import { CircleBody } from '../../engine/entities/circle-body';
import { PinballBall } from './ball';

export interface PinballBounds { x: number; y: number; width: number; height: number; }
export interface PinballBumper { x: number; y: number; radius: number; }

/** Space-Cadet-inspired table layout, launcher lane, scoring targets, and rails. */
export class PinballBoard {
  private boundsCache: PinballBounds | undefined;
  private cachedViewportWidth = -1;
  private cachedViewportHeight = -1;
  private bumpersCache: readonly PinballBumper[] = [];
  private targetsCache: readonly CollisionRect[] = [];
  private wallCache: readonly CollisionRect[] = [];
  private readonly bumperVisuals: readonly Sprite[];

  public constructor() {
    const symbols = ['beetlemorph', 'eaglemorph', 'squidmorph'] as const;
    this.bumperVisuals = symbols.map((symbol) => {
      const sprite = new Sprite(GameLoader.getImage(symbol), 80, 80, 0, 0, 0.5, 0.5);
      sprite.playAtlasClip(GameLoader.getAtlas(symbol).getAnimation('idle'));
      return sprite;
    });
  }

  public get bounds(): PinballBounds {
    const viewport = GameContext.gameDimensionsModel;
    const viewportWidth = viewport.getWidth();
    const viewportHeight = viewport.getHeight();
    if (
      this.boundsCache === undefined
      || this.cachedViewportWidth !== viewportWidth
      || this.cachedViewportHeight !== viewportHeight
    ) {
      const width = Math.min(viewportWidth * 0.62, 440);
      const height = Math.min(viewportHeight * 0.78, 680);
      this.boundsCache = {
        x: (viewportWidth - width) * 0.5,
        y: Math.max(94, (viewportHeight - height) * 0.5),
        width,
        height
      };
      this.cachedViewportWidth = viewportWidth;
      this.cachedViewportHeight = viewportHeight;
      this.bumpersCache = this.createBumpers(this.boundsCache);
      this.targetsCache = this.createTargets(this.boundsCache);
      this.wallCache = this.createWalls(this.boundsCache);
    }
    return this.boundsCache;
  }

  public get shooterDividerX(): number {
    const bounds = this.bounds;
    return bounds.x + bounds.width * 0.82;
  }

  public get shooterExitY(): number {
    const bounds = this.bounds;
    return bounds.y + bounds.height * 0.2;
  }

  public get bumpers(): readonly PinballBumper[] {
    this.bounds;
    return this.bumpersCache;
  }

  public update(deltaSeconds: number): void {
    for (let index = 0; index < this.bumperVisuals.length; index++) {
      this.bumperVisuals[index].update(deltaSeconds);
    }
  }

  private createBumpers(bounds: PinballBounds): readonly PinballBumper[] {
    const radius = Math.max(18, Math.min(31, bounds.width * 0.06));
    return [
      { x: bounds.x + bounds.width * 0.36, y: bounds.y + bounds.height * 0.25, radius },
      { x: bounds.x + bounds.width * 0.57, y: bounds.y + bounds.height * 0.22, radius },
      { x: bounds.x + bounds.width * 0.46, y: bounds.y + bounds.height * 0.39, radius: radius * 1.08 }
    ];
  }

  public ballRadius(): number { return Math.max(8, Math.min(12, this.bounds.width * 0.024)); }

  public launchPosition(): { x: number; y: number } {
    const bounds = this.bounds;
    return { x: bounds.x + bounds.width * 0.91, y: bounds.y + bounds.height * 0.86 };
  }

  /** Returns bumper and target hits as a bitmask. */
  public resolve(body: CircleBody): number {
    const bounds = this.bounds;
    for (let index = 0; index < this.wallCache.length; index++) {
      Collision2D.resolveCircleAgainstRect(body, this.wallCache[index], index === 2 ? 0.72 : 0.76);
    }

    let hitMask = 0;
    const bumpers = this.bumpers;
    for (let index = 0; index < bumpers.length; index++) {
      const bumper = bumpers[index];
      if (Collision2D.resolveCircleAgainstCircle(body, bumper.x, bumper.y, bumper.radius, 1)) {
        hitMask |= 1 << index;
      }
    }

    const targets = this.targetsCache;
    for (let index = 0; index < targets.length; index++) {
      if (Collision2D.resolveCircleAgainstRect(body, targets[index], 0.86)) hitMask |= 1 << (index + 3);
    }
    this.resolveSlingshots(body, bounds);
    return hitMask;
  }

  /** Curves the ball into the playfield at the open end of the shooter lane. */
  public releaseFromShooter(ball: PinballBall): boolean {
    const body = ball.body;
    if (body.x <= this.shooterDividerX || body.y > this.shooterExitY + body.radius || body.velocityY >= 0) {
      return false;
    }
    const horizontalSpeed = Math.max(360, Math.min(520, Math.abs(body.velocityY) * 0.42));
    return ball.leaveShooter(-horizontalSpeed, 0);
  }

  public draw(): void {
    const bounds = this.bounds;
    const { x, y, width, height } = bounds;
    const dividerX = this.shooterDividerX;
    const exitY = this.shooterExitY;
    const context = GameContext.context;
    context.save();
    context.shadowColor = 'rgba(0, 0, 0, 0.55)';
    context.shadowBlur = 18;
    context.fillStyle = '#071027';
    context.beginPath();
    context.roundRect(x - 12, y - 12, width + 24, height + 24, 18);
    context.fill();
    context.restore();
    const railGradient = context.createLinearGradient(x, y, x + width, y + height);
    railGradient.addColorStop(0, '#71f4ee');
    railGradient.addColorStop(0.5, '#3199d4');
    railGradient.addColorStop(1, '#ffcb62');
    context.fillStyle = '#06152b';
    context.beginPath();
    context.roundRect(x - 7, y - 7, width + 14, height + 14, 15);
    context.fill();
    context.fillStyle = railGradient;
    context.beginPath();
    context.roundRect(x - 4, y - 4, width + 8, height + 8, 12);
    context.fill();

    const playfieldGradient = context.createLinearGradient(x, y, x + width * 0.8, y + height);
    playfieldGradient.addColorStop(0, '#142b62');
    playfieldGradient.addColorStop(0.48, '#124765');
    playfieldGradient.addColorStop(1, '#0a203f');
    context.fillStyle = playfieldGradient;
    context.beginPath();
    context.roundRect(x, y, width, height, 9);
    context.fill();
    GameContext.drawRect(x + 7, y + 7, width - 14, height - 14, 'rgba(4, 16, 38, 0.28)');

    // Shooter lane and the raised divider that guides the ball into the table.
    GameContext.drawRect(dividerX + 2, exitY, width - (dividerX - x) - 8, height - (exitY - y), '#07142e');
    GameContext.drawRect(dividerX, exitY + this.ballRadius() * 5, 5,
      y + height - exitY - this.ballRadius() * 5, '#f4ca63');
    GameContext.drawRect(x, y, dividerX - x, 6, '#71e9ee');
    GameContext.drawRect(x + width - 6, y, 6, height, '#71e9ee');
    GameContext.drawRect(x, y, 6, height, '#71e9ee');

    // Inlaid rails and guide lanes give the table a shaped, readable playfield.
    context.strokeStyle = 'rgba(112, 231, 239, 0.42)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x + width * 0.08, y + height * 0.62);
    context.lineTo(x + width * 0.08, y + height * 0.88);
    context.lineTo(x + width * 0.29, y + height * 0.82);
    context.moveTo(x + width * 0.75, y + height * 0.82);
    context.lineTo(x + width * 0.8, y + height * 0.88);
    context.lineTo(x + width * 0.8, y + height * 0.2);
    context.stroke();

    const bumpers = this.bumpers;
    for (let index = 0; index < bumpers.length; index++) {
      const bumper = bumpers[index];
      const color = index === 1 ? '#51ddff' : index === 2 ? '#ffe36f' : '#ff748e';
      context.save();
      context.shadowColor = color;
      context.shadowBlur = bumper.radius * 0.6;
      GameContext.drawCircle(bumper.x, bumper.y, bumper.radius + 7, '#07153d');
      context.restore();
      GameContext.drawCircle(bumper.x, bumper.y, bumper.radius + 3, '#f5c95b');
      GameContext.drawCircle(bumper.x, bumper.y, bumper.radius, '#061d3d');
      const visual = this.bumperVisuals[index];
      visual.dimensions.setPosition(bumper.x, bumper.y);
      visual.dimensions.setSize(bumper.radius * 1.8, bumper.radius * 1.8);
      visual.draw();
    }

    const targets = this.targetsCache;
    for (let index = 0; index < targets.length; index++) {
      const target = targets[index];
      GameContext.drawRect(target.x - 3, target.y - 3, target.width + 6, target.height + 6, '#07142e');
      GameContext.drawRect(target.x, target.y, target.width, target.height, index % 2 === 0 ? '#ffcd63' : '#54e1e7');
      GameContext.drawRect(target.x + 3, target.y + 3, target.width - 6, 3, 'rgba(255, 255, 255, 0.72)');
    }
    this.drawSlingshots(bounds);

    const start = this.launchPosition();
    GameContext.drawRect(start.x - 3, start.y + this.ballRadius(), 6, height * 0.1, '#8db9db');
  }

  private createTargets(bounds: PinballBounds): readonly CollisionRect[] {
    const targets: CollisionRect[] = [];
    const targetWidth = Math.max(11, bounds.width * 0.035);
    const targetHeight = Math.max(20, bounds.height * 0.052);
    const rowY = bounds.y + bounds.height * 0.52;
    for (let index = 0; index < 4; index++) {
      targets.push({
        x: bounds.x + bounds.width * (0.25 + index * 0.11),
        y: rowY,
        width: targetWidth,
        height: targetHeight
      });
    }
    return targets;
  }

  private createWalls(bounds: PinballBounds): readonly CollisionRect[] {
    const wall = Math.max(8, bounds.width * 0.025);
    const dividerX = bounds.x + bounds.width * 0.82;
    const exitY = bounds.y + bounds.height * 0.2;
    const dividerStartY = exitY + Math.max(8, Math.min(12, bounds.width * 0.024)) * 5;
    return [
      { x: bounds.x - wall, y: bounds.y - wall, width: wall, height: bounds.height + wall },
      { x: bounds.x + bounds.width, y: bounds.y - wall, width: wall, height: bounds.height + wall },
      { x: bounds.x - wall, y: bounds.y - wall, width: dividerX - bounds.x + wall, height: wall },
      { x: dividerX, y: dividerStartY, width: wall, height: bounds.y + bounds.height - dividerStartY }
    ];
  }

  private resolveSlingshots(body: CircleBody, bounds: PinballBounds): void {
    const y = bounds.y + bounds.height * 0.68;
    const leftX = bounds.x + bounds.width * 0.1;
    const rightX = bounds.x + bounds.width * 0.72;
    const endY = y + bounds.height * 0.08;
    const thickness = Math.max(9, bounds.width * 0.025);
    if (body.velocityY > 0 && Collision2D.resolveCircleAgainstSegment(body, leftX, endY, leftX + bounds.width * 0.17, y, thickness, 1)) {
      body.addVelocity(0, -90);
    }
    if (body.velocityY > 0 && Collision2D.resolveCircleAgainstSegment(body, rightX, y, rightX + bounds.width * 0.17, endY, thickness, 1)) {
      body.addVelocity(0, -90);
    }
  }

  private drawSlingshots(bounds: PinballBounds): void {
    const y = bounds.y + bounds.height * 0.68;
    const leftX = bounds.x + bounds.width * 0.1;
    const rightX = bounds.x + bounds.width * 0.72;
    const endY = y + bounds.height * 0.08;
    const context = GameContext.context;
    context.save();
    context.lineJoin = 'round';
    context.fillStyle = '#153e70';
    context.strokeStyle = '#67e8ee';
    context.lineWidth = Math.max(3, bounds.width * 0.012);
    context.beginPath();
    context.moveTo(leftX, y - bounds.height * 0.07);
    context.lineTo(leftX + bounds.width * 0.2, y);
    context.lineTo(leftX + bounds.width * 0.19, endY);
    context.lineTo(leftX + bounds.width * 0.02, endY - bounds.height * 0.015);
    context.closePath();
    context.moveTo(rightX, y);
    context.lineTo(rightX + bounds.width * 0.18, y - bounds.height * 0.07);
    context.lineTo(rightX + bounds.width * 0.18, endY - bounds.height * 0.015);
    context.lineTo(rightX + bounds.width * 0.01, endY);
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
  }
}
