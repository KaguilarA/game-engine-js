import GameContext from '../../engine/core/context';
import GameLoader from '../../engine/assets/loader';
import Sprite from '../../engine/animations/sprites/sprite';
import type { AtlasAnimation } from '../../engine/interfaces/atlas-animation';
import { signalValue } from 'reactive-values';
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
  private railCache: readonly (readonly [number, number, number, number])[] = [];
  private readonly bumperVisuals: readonly Sprite[];
  private readonly bumperIdleVisuals: readonly Sprite[];
  private readonly bumperAnimations: readonly AtlasAnimation[];
  private readonly bumperSymbols = ['beetlemorph', 'eaglemorph', 'squidmorph'] as const;
  private readonly bumperAnimating = [signalValue(false), signalValue(false), signalValue(false)];
  private readonly bumperCooldowns = [signalValue(0), signalValue(0), signalValue(0)];
  private readonly slingshotCooldowns = [signalValue(0), signalValue(0)];

  public constructor() {
    this.bumperAnimations = this.bumperSymbols.map((symbol) => ({
      ...GameLoader.getAtlas(symbol).getAnimation('idle'),
      loop: false
    }));
    this.bumperVisuals = this.bumperSymbols.map((symbol) => {
      const sprite = new Sprite(GameLoader.getImage(symbol), 80, 80, 0, 0, 0.5, 0.5);
      return sprite;
    });
    this.bumperIdleVisuals = this.bumperSymbols.map((symbol) => {
      const frame = GameLoader.getAtlas(symbol).getAnimation('idle').frames[0];
      if (!frame) throw new Error(`Pinball bumper animation for "${symbol}" has no frames.`);
      return new Sprite(GameLoader.getImage(symbol), frame.width, frame.height, 0, 0,
        0.5, 0.5, frame.x, frame.y, frame.width, frame.height);
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
      const top = Math.max(56, viewportHeight * 0.14);
      const y = Math.min(top, Math.max(40, viewportHeight - 140));
      const height = Math.max(24, Math.min(viewportHeight * 0.72, 620, viewportHeight - y - 34));
      this.boundsCache = {
        x: (viewportWidth - width) * 0.5,
        y,
        width,
        height
      };
      this.cachedViewportWidth = viewportWidth;
      this.cachedViewportHeight = viewportHeight;
      this.bumpersCache = this.createBumpers(this.boundsCache);
      this.targetsCache = this.createTargets(this.boundsCache);
      this.wallCache = this.createWalls(this.boundsCache);
      this.railCache = this.createRails(this.boundsCache);
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
    for (const cooldown of this.slingshotCooldowns) cooldown.set(Math.max(0, cooldown() - deltaSeconds));
    for (let index = 0; index < this.bumperVisuals.length; index++) {
      this.bumperCooldowns[index].set(Math.max(0, this.bumperCooldowns[index]() - deltaSeconds));
      if (!this.bumperAnimating[index]()) continue;
      const visual = this.bumperVisuals[index];
      visual.update(deltaSeconds);
      if (!visual.isAnimationPlaying) this.bumperAnimating[index].set(false);
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
    Collision2D.resolveCircleAgainstHorizontalBounds(body, bounds.x, bounds.x + bounds.width, 0.76);
    const railThickness = Math.max(3, bounds.width * 0.012);
    for (const [startX, startY, endX, endY] of this.railCache) {
      Collision2D.resolveCircleAgainstSegment(body, startX, startY, endX, endY, railThickness, 0.78);
    }

    let hitMask = 0;
    const bumpers = this.bumpers;
    for (let index = 0; index < bumpers.length; index++) {
      const bumper = bumpers[index];
      if (Collision2D.resolveCircleAgainstCircle(body, bumper.x, bumper.y, bumper.radius, 1)) {
        hitMask |= 1 << index;
        if (this.bumperCooldowns[index]() <= 0) {
          const dx = body.x - bumper.x;
          const dy = body.y - bumper.y;
          const distance = Math.hypot(dx, dy) || 1;
          body.addVelocity(dx / distance * 420, dy / distance * 420);
          const speed = Math.hypot(body.velocityX, body.velocityY);
          if (speed > 980) body.setVelocity(body.velocityX / speed * 980, body.velocityY / speed * 980);
          this.bumperCooldowns[index].set(0.24);
          this.bumperAnimating[index].set(true);
          this.bumperVisuals[index].playAtlasClip(this.bumperAnimations[index]);
        }
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
    context.shadowColor = 'rgba(0, 0, 0, 0.72)';
    context.shadowBlur = 20;
    context.fillStyle = '#080d22';
    context.beginPath();
    context.roundRect(x - 12, y - 12, width + 24, height + 24, 22);
    context.fill();
    context.restore();

    // Layered chrome bezel and luminous outer trim.
    const bezel = context.createLinearGradient(x - 10, y, x + width + 10, y + height);
    bezel.addColorStop(0, '#8499b7'); bezel.addColorStop(0.18, '#253657');
    bezel.addColorStop(0.5, '#f6cb62'); bezel.addColorStop(0.78, '#304466'); bezel.addColorStop(1, '#9eb2c8');
    context.fillStyle = bezel;
    context.beginPath(); context.roundRect(x - 7, y - 7, width + 14, height + 14, 17); context.fill();
    context.fillStyle = '#101a37';
    context.beginPath(); context.roundRect(x - 2, y - 2, width + 4, height + 4, 13); context.fill();

    const playfieldGradient = context.createLinearGradient(x, y, x + width * 0.75, y + height);
    playfieldGradient.addColorStop(0, '#132b50'); playfieldGradient.addColorStop(0.48, '#101e3e'); playfieldGradient.addColorStop(1, '#201640');
    context.fillStyle = playfieldGradient;
    context.beginPath(); context.roundRect(x, y, width, height, 10); context.fill();
    context.save();
    context.beginPath(); context.roundRect(x + 3, y + 3, width - 6, height - 6, 8); context.clip();
    const nebula = context.createRadialGradient(x + width * 0.43, y + height * 0.47, 2, x + width * 0.43, y + height * 0.47, width * 0.55);
    nebula.addColorStop(0, 'rgba(78, 48, 137, 0.34)'); nebula.addColorStop(0.58, 'rgba(27, 80, 137, 0.17)'); nebula.addColorStop(1, 'rgba(7, 14, 36, 0)');
    context.fillStyle = nebula; context.fillRect(x, y, width, height);
    // Fixed deterministic stars: no per-frame random work or visual flicker.
    for (let index = 0; index < 46; index++) {
      const sx = x + width * (((index * 37) % 97) / 100);
      const sy = y + height * (((index * 61 + 13) % 101) / 105);
      context.globalAlpha = index % 5 === 0 ? 0.78 : 0.38;
      context.fillStyle = index % 7 === 0 ? '#80e8ff' : '#dbe9ff';
      context.beginPath(); context.arc(sx, sy, index % 9 === 0 ? 1.7 : 1, 0, Math.PI * 2); context.fill();
    }
    context.globalAlpha = 1;
    // A faint orbital map in the open field.
    context.strokeStyle = 'rgba(103, 175, 237, 0.14)'; context.lineWidth = 1.5;
    context.beginPath(); context.ellipse(x + width * 0.47, y + height * 0.48, width * 0.3, height * 0.21, -0.3, 0, Math.PI * 2); context.stroke();
    context.beginPath(); context.ellipse(x + width * 0.47, y + height * 0.48, width * 0.23, height * 0.15, 0.42, 0, Math.PI * 2); context.stroke();
    context.restore();

    // Right shooter lane; the opening at its top is where the launched ball joins play.
    const dividerStart = exitY + this.ballRadius() * 5;
    const laneX = dividerX + 5;
    const laneWidth = width - (dividerX - x) - 5;
    const laneGradient = context.createLinearGradient(laneX, 0, laneX + laneWidth, 0);
    laneGradient.addColorStop(0, '#0b1530'); laneGradient.addColorStop(1, '#070d20');
    context.fillStyle = laneGradient; context.fillRect(laneX, exitY, laneWidth, height - (exitY - y));
    GameContext.drawRect(dividerX, dividerStart, 5, y + height - dividerStart, '#f5c64f');
    GameContext.drawRect(dividerX + 7, dividerStart + 3, 2, y + height - dividerStart - 6, 'rgba(255, 239, 182, 0.8)');
    // Decorative curved orbit lane at left, with the same sampled rail segments used by physics.
    this.drawOrbitRails(bounds);
    // Perimeter rails and the open, playable drain at the bottom.
    GameContext.drawRect(x, y, dividerX - x, 4, '#50d5e8');
    GameContext.drawRect(x + width - 4, y, 4, height, '#50d5e8');
    GameContext.drawRect(x, y, 4, height, '#50d5e8');

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
      const visual = this.bumperAnimating[index]()
        ? this.bumperVisuals[index]
        : this.bumperIdleVisuals[index];
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

  private createRails(bounds: PinballBounds): readonly (readonly [number, number, number, number])[] {
    const { x, y, width, height } = bounds;
    const paths = [
      // Left orbit: runs down the outer lane then bends into the lower playfield.
      [[0.19, 0.035], [0.035, 0.05], [0.055, 0.36], [0.07, 0.60]],
      [[0.07, 0.60], [0.09, 0.73], [0.23, 0.79], [0.31, 0.84]],
      // Inner edge of the orbit keeps the ball in a real channel rather than drawing a fake rail.
      [[0.25, 0.12], [0.16, 0.18], [0.17, 0.47], [0.22, 0.63]],
      [[0.22, 0.63], [0.24, 0.71], [0.31, 0.74], [0.36, 0.78]],
      // Upper curved lane guides the ball around the bumper cluster.
      [[0.19, 0.035], [0.43, -0.025], [0.72, 0.02], [0.79, 0.18]]
    ] as const;
    const segments: [number, number, number, number][] = [];
    for (const [p0, p1, p2, p3] of paths) {
      let previousX = x + width * p0[0]; let previousY = y + height * p0[1];
      for (let step = 1; step <= 16; step++) {
        const t = step / 16; const inverse = 1 - t;
        const px = x + width * (inverse ** 3 * p0[0] + 3 * inverse ** 2 * t * p1[0] + 3 * inverse * t ** 2 * p2[0] + t ** 3 * p3[0]);
        const py = y + height * (inverse ** 3 * p0[1] + 3 * inverse ** 2 * t * p1[1] + 3 * inverse * t ** 2 * p2[1] + t ** 3 * p3[1]);
        segments.push([previousX, previousY, px, py]); previousX = px; previousY = py;
      }
    }
    return segments;
  }

  private drawOrbitRails(bounds: PinballBounds): void {
    const { x, y, width, height } = bounds;
    const context = GameContext.context;
    context.save(); context.lineCap = 'round'; context.lineJoin = 'round';
    // Track bed is wider than the collision spine, like a raised metal guide channel.
    context.strokeStyle = 'rgba(73, 119, 171, 0.56)'; context.lineWidth = Math.max(12, width * 0.055);
    context.beginPath();
    context.moveTo(x + width * 0.19, y + height * 0.035);
    context.bezierCurveTo(x + width * 0.035, y + height * 0.05, x + width * 0.055, y + height * 0.36, x + width * 0.07, y + height * 0.60);
    context.bezierCurveTo(x + width * 0.09, y + height * 0.73, x + width * 0.23, y + height * 0.79, x + width * 0.31, y + height * 0.84);
    context.stroke();
    context.strokeStyle = '#67d9ed'; context.lineWidth = Math.max(2, width * 0.009);
    context.beginPath();
    context.moveTo(x + width * 0.19, y + height * 0.035);
    context.bezierCurveTo(x + width * 0.035, y + height * 0.05, x + width * 0.055, y + height * 0.36, x + width * 0.07, y + height * 0.60);
    context.bezierCurveTo(x + width * 0.09, y + height * 0.73, x + width * 0.23, y + height * 0.79, x + width * 0.31, y + height * 0.84);
    context.stroke();
    context.strokeStyle = 'rgba(166, 197, 231, 0.75)'; context.lineWidth = Math.max(2, width * 0.006);
    context.beginPath();
    context.moveTo(x + width * 0.25, y + height * 0.12);
    context.bezierCurveTo(x + width * 0.16, y + height * 0.18, x + width * 0.17, y + height * 0.47, x + width * 0.22, y + height * 0.63);
    context.bezierCurveTo(x + width * 0.24, y + height * 0.71, x + width * 0.31, y + height * 0.74, x + width * 0.36, y + height * 0.78);
    context.stroke();
    context.strokeStyle = 'rgba(93, 211, 237, 0.68)'; context.lineWidth = Math.max(3, width * 0.013);
    context.beginPath(); context.moveTo(x + width * 0.19, y + height * 0.035);
    context.bezierCurveTo(x + width * 0.43, y - height * 0.025, x + width * 0.72, y + height * 0.02, x + width * 0.79, y + height * 0.18); context.stroke();
    context.restore();
  }

  private resolveSlingshots(body: CircleBody, bounds: PinballBounds): void {
    const { x, y, width, height } = bounds;
    const top = y + height * 0.68;
    const end = top + height * 0.06;
    const thickness = Math.max(3, width * 0.012);
    const wasDescending = body.velocityY > 0;
    // Collide against the actual four edges of each drawn sling polygon. The old
    // diagonal crossed through the filled shape, so the ball hit an invisible face
    // and could settle in the gap between that face and the flipper.
    const leftA = [x + width * 0.1, top - height * 0.025] as const;
    const leftB = [x + width * 0.25, top] as const;
    const leftC = [x + width * 0.24, end] as const;
    const leftD = [x + width * 0.12, end - height * 0.01] as const;
    const rightA = [x + width * 0.72, top] as const;
    const rightB = [x + width * 0.87, top - height * 0.025] as const;
    const rightC = [x + width * 0.87, end - height * 0.01] as const;
    const rightD = [x + width * 0.73, end] as const;
    let leftHit = Collision2D.resolveCircleAgainstSegment(body, ...leftA, ...leftB, thickness, 0.9);
    leftHit = Collision2D.resolveCircleAgainstSegment(body, ...leftB, ...leftC, thickness, 0.9) || leftHit;
    leftHit = Collision2D.resolveCircleAgainstSegment(body, ...leftC, ...leftD, thickness, 0.9) || leftHit;
    leftHit = Collision2D.resolveCircleAgainstSegment(body, ...leftD, ...leftA, thickness, 0.9) || leftHit;
    let rightHit = Collision2D.resolveCircleAgainstSegment(body, ...rightA, ...rightB, thickness, 0.9);
    rightHit = Collision2D.resolveCircleAgainstSegment(body, ...rightB, ...rightC, thickness, 0.9) || rightHit;
    rightHit = Collision2D.resolveCircleAgainstSegment(body, ...rightC, ...rightD, thickness, 0.9) || rightHit;
    rightHit = Collision2D.resolveCircleAgainstSegment(body, ...rightD, ...rightA, thickness, 0.9) || rightHit;
    if (leftHit && this.slingshotCooldowns[0]() <= 0 && wasDescending) {
      // Kick toward the center lane, away from the left orbit's dead end.
      body.addVelocity(220, -360);
      this.slingshotCooldowns[0].set(0.12);
    }
    if (rightHit && this.slingshotCooldowns[1]() <= 0 && wasDescending) {
      body.addVelocity(-220, -360);
      this.slingshotCooldowns[1].set(0.12);
    }
  }

  private drawSlingshots(bounds: PinballBounds): void {
    const y = bounds.y + bounds.height * 0.68;
    const leftX = bounds.x + bounds.width * 0.1;
    const rightX = bounds.x + bounds.width * 0.72;
    const endY = y + bounds.height * 0.06;
    const context = GameContext.context;
    context.save();
    context.lineJoin = 'round';
    context.fillStyle = '#183b63';
    context.strokeStyle = '#e3b456';
    context.lineWidth = Math.max(3, bounds.width * 0.01);
    context.beginPath();
    context.moveTo(leftX, y - bounds.height * 0.025);
    context.lineTo(leftX + bounds.width * 0.15, y);
    context.lineTo(leftX + bounds.width * 0.14, endY);
    context.lineTo(leftX + bounds.width * 0.02, endY - bounds.height * 0.01);
    context.closePath();
    context.moveTo(rightX, y);
    context.lineTo(rightX + bounds.width * 0.15, y - bounds.height * 0.025);
    context.lineTo(rightX + bounds.width * 0.15, endY - bounds.height * 0.01);
    context.lineTo(rightX + bounds.width * 0.01, endY);
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
  }
}
