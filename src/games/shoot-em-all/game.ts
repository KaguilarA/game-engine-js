import GameContext from '../../engine/core/context';
import GameEvents from '../../engine/input/events';
import { BaseGame } from '../../engine/core/base-game';
import { TouchControls } from '../../engine/input/touch-controls';
import GameLoader from '../../engine/assets/loader';
import Sprite from '../../engine/animations/sprites/sprite';
import { PhysicsBody } from '../../engine/core/physics';
import { InvaderEnemy, type InvaderKind } from './invader-enemy';
import heartSvg from 'lucide-static/icons/heart.svg?raw';
import CanvasIcon from '../../engine/rendering/canvas-icon';
import { GameBackground } from '../../engine/rendering/background';
import { signalValue } from 'reactive-values';
import { MathUtils } from '../../engine/core/math-utils';
import { Collision2D } from '../../engine/core/collision2d';
import type { SignalValue } from 'reactive-values';
import type { Invader } from './interfaces/invader';
import type { Shot } from './interfaces/shot';

const ENEMY_KINDS: InvaderKind[] = ['beetlemorph', 'rhinomorph', 'lobstermorph'];
const TARGET_KILLS = 30;

/**
 * Multi-direction survival shooter that reuses the shared sprite and touch systems.
 * @class ShootEmAllGame
 */
export class ShootEmAllGame extends BaseGame {
  /**
   * Provides the shared touch layout for directional movement and firing.
   * @property {TouchControls} touchControls
   * @private
   * @readonly
   */
  private readonly touchControls = new TouchControls();
  /**
   * Holds the player's current sprite and publishes viewport-driven replacements.
   * @property {SignalValue<Sprite>} player
   * @private
   * @readonly
   */
  private readonly player: SignalValue<Sprite>;
  /**
   * Integrates the player's position and velocity independently of rendering.
   * @property {PhysicsBody} playerMotion
   * @private
   */
  private playerMotion = new PhysicsBody();
  /**
   * Stores the active projectiles as an immutable reactive collection.
   * @property {SignalValue<readonly Shot[]>} shots
   * @private
   * @readonly
   */
  private readonly shots = signalValue<readonly Shot[]>([]);
  /**
   * Stores active invaders as a reactive collection replaced on membership changes.
   * @property {SignalValue<readonly Invader[]>} enemies
   * @private
   * @readonly
   */
  private readonly enemies = signalValue<readonly Invader[]>([]);
  /**
   * Draws the heart icon used to represent remaining player lives.
   * @property {CanvasIcon} heartIcon
   * @private
   * @readonly
   */
  private readonly heartIcon = new CanvasIcon(heartSvg, '#ff5a6b', true);
  /**
   * Tracks the player's remaining lives.
   * @property {SignalValue<number>} lives
   * @private
   * @readonly
   */
  private readonly lives = signalValue(3);
  /**
   * Tracks the number of invaders defeated during this round.
   * @property {SignalValue<number>} kills
   * @private
   * @readonly
   */
  private readonly kills = signalValue(0);
  /**
   * Tracks the delay before the next invader enters the playfield.
   * @property {SignalValue<number>} spawnTimer
   * @private
   * @readonly
   */
  private readonly spawnTimer = signalValue(0.5);
  /**
   * Tracks the remaining delay before the player can fire another projectile.
   * @property {SignalValue<number>} fireCooldown
   * @private
   * @readonly
   */
  private readonly fireCooldown = signalValue(0);
  /**
   * Records whether the player lost or reached the target enemy count.
   * @property {SignalValue<boolean>} gameEnded
   * @private
   * @readonly
   */
  private readonly gameEnded = signalValue(false);
  /**
   * Tracks the repeating vertical offset used to animate the background stars.
   * @property {SignalValue<number>} starOffset
   * @private
   * @readonly
   */
  private readonly starOffset = signalValue(0);
  /**
   * Stores the current movement pose so the matching atlas clip can be selected.
   * @property {SignalValue<'idle' | 'moving'>} shipPose
   * @private
   * @readonly
   */
  private readonly shipPose = signalValue<'idle' | 'moving'>('idle');

  /**
   * Initializes the player, registers control cleanup, and starts the game loop.
   * @param onReturnToMenu - Optional callback invoked when the player exits.
   * @public
   * @return {void}
   */
  public constructor(onReturnToMenu?: () => void) {
    super(onReturnToMenu);
    this.player = signalValue(this.createPlayer());
    this.registerCleanup(() => this.touchControls.dispose());
    this.start();
  }

  /**
   * Reports whether the round ended because the player lost or cleared the wave.
   * @protected
   * @return {boolean} Whether the game has ended.
   */
  protected get isGameOver(): boolean {
    return this.gameEnded();
  }

  /**
   * Updates reactive timers and advances all moving gameplay entities.
   * @param deltaSeconds - Time elapsed since the previous frame.
   * @protected
   * @return {void}
   */
  protected updateGame(deltaSeconds: number): void {
    const width = GameContext.gameDimensionsModel.getWidth();
    const height = GameContext.gameDimensionsModel.getHeight();
    this.starOffset.set((this.starOffset() + deltaSeconds * 20) % 80);
    this.updatePlayer(deltaSeconds, width, height);
    this.updateShots(deltaSeconds, height);
    this.updateEnemies(deltaSeconds, width, height);
    this.spawnTimer.set(this.spawnTimer() - deltaSeconds);

    if (this.spawnTimer() <= 0 && this.kills() < TARGET_KILLS && this.enemies().length < 8) {
      this.spawnEnemy(width);
      this.spawnTimer.set(Math.max(0.55, 1.3 - this.kills() * 0.018));
    }

    if (this.kills() >= TARGET_KILLS) this.gameEnded.set(true);
  }

  /**
   * Renders the background, entities, projectile effects, HUD, and touch controls.
   * @protected
   * @return {void}
   */
  protected drawGame(): void {
    const dimensions = GameContext.gameDimensionsModel;
    const width = dimensions.getWidth();
    const height = dimensions.getHeight();
    const unit = GameContext.viewportUnit();
    GameContext.clear();
    GameBackground.draw(
      GameLoader.getImage('background1080x1920'),
      GameLoader.getImage('background1920x1080'),
      'rgba(14, 10, 32, 0.3)'
    );
    this.drawStars(width, height);
    this.worldActors.setObjects([
      ...this.enemies().map(({ entity }) => entity),
      this.player()
    ]);
    this.drawWorldScene();
    this.shots().forEach((shot) => {
      GameContext.drawCircle(shot.motion.x(), shot.motion.y(), Math.max(3, unit * 0.006), shot.direction < 0 ? '#73edff' : '#ff7a9d');
    });
    this.drawHud(unit, width);
    this.touchControls.draw();
    if (this.gameEnded()) {
      this.drawLabel(
        this.kills() >= TARGET_KILLS ? 'SECTOR CLEARED' : 'GAME OVER',
        width * 0.5, height * 0.48, Math.max(24, Math.min(unit * 0.07, 46)),
        '#ffffff', 'center', width * 0.86
      );
    }
  }

  /**
   * Clears active collections and restores the round's initial reactive state.
   * @protected
   * @return {void}
   */
  protected restartGame(): void {
    this.shots.set([]);
    this.enemies.set([]);
    this.lives.set(3);
    this.kills.set(0);
    this.spawnTimer.set(0.5);
    this.fireCooldown.set(0);
    this.gameEnded.set(false);
    this.player.set(this.createPlayer());
  }

  /**
   * Recreates the centered player sprite and clamps invaders to the resized viewport.
   * @protected
   * @return {void}
   */
  protected onViewportChanged(): void {
    this.player.set(this.createPlayer());
    this.shots.set([]);
    this.enemies().forEach(({ entity }) => {
      entity.setPosition(
        Math.min(entity.x, GameContext.gameDimensionsModel.getWidth() - entity.width),
        Math.min(entity.y, GameContext.gameDimensionsModel.getHeight() * 0.7)
      );
    });
  }

  /**
   * Builds the player sprite at a responsive size and resets its physics body.
   * @private
   * @return {Sprite} The initialized player sprite.
   */
  private createPlayer(): Sprite {
    const dimensions = GameContext.gameDimensionsModel;
    const unit = Math.min(dimensions.getWidth(), dimensions.getHeight());
    const scale = MathUtils.clamp(unit / 900, 0.45, 1);
    const width = 70 * scale;
    const height = 60 * scale;
    const sprite = new Sprite(GameLoader.getImage('player'), width, height);
    sprite.playAtlasClip(GameLoader.getAtlas('player').getAnimation('idle'));
    const x = (dimensions.getWidth() - width) * 0.5;
    const y = dimensions.getHeight() * 0.72;
    this.playerMotion.setPosition(x, y);
    this.playerMotion.stop();
    sprite.dimensions.setPosition(x, y);
    return sprite;
  }

  /**
   * Reads movement and fire input, updates the ship physics, and selects its pose.
   * @param deltaSeconds - Time elapsed since the previous frame.
   * @param width - Current playfield width in world units.
   * @param height - Current playfield height in world units.
   * @private
   * @return {void}
   */
  private updatePlayer(deltaSeconds: number, width: number, height: number): void {
    const left = GameEvents.isKeyPressed('ArrowLeft') || GameEvents.isKeyPressed('a');
    const right = GameEvents.isKeyPressed('ArrowRight') || GameEvents.isKeyPressed('d');
    const up = GameEvents.isKeyPressed('ArrowUp') || GameEvents.isKeyPressed('w');
    const down = GameEvents.isKeyPressed('ArrowDown') || GameEvents.isKeyPressed('s');
    const speed = Math.min(width, height) * 0.58;
    const dx = Number(right) - Number(left);
    const dy = Number(down) - Number(up);
    const magnitude = Math.hypot(dx, dy) || 1;
    this.playerMotion.setVelocity(
      dx / magnitude * speed,
      dy / magnitude * speed
    );
    this.playerMotion.update(deltaSeconds);
    const controlMargin = GameContext.isMobileDevice ? this.touchControls.layout.reservedBottom : 0;
    const maxY = Math.max(0, height - this.player().dimensions.getHeight() - controlMargin);
    this.playerMotion.setPosition(
      MathUtils.clamp(this.playerMotion.x(), 0, width - this.player().dimensions.getWidth()),
      MathUtils.clamp(this.playerMotion.y(), 0, maxY)
    );
    this.player().dimensions.setPosition(this.playerMotion.x(), this.playerMotion.y());

    const nextPose = dx === 0 && dy === 0 ? 'idle' : 'moving';
    if (nextPose !== this.shipPose()) {
      this.shipPose.set(nextPose);
      this.player().playAtlasClip(GameLoader.getAtlas('player').getAnimation(nextPose));
    }
    this.player().update(deltaSeconds);
    this.fireCooldown.set(Math.max(0, this.fireCooldown() - deltaSeconds));
    if (GameEvents.isKeyPressed(' ') && this.fireCooldown() === 0) {
      this.firePlayerShot();
    }
  }

  /**
   * Creates an invader with type-specific health, speed, drift, and attack timing.
   * @param width - Current playfield width used to choose a spawn coordinate.
   * @private
   * @return {void}
   */
  private spawnEnemy(width: number): void {
    const kind = ENEMY_KINDS[Math.floor(Math.random() * ENEMY_KINDS.length)];
    const size = Math.max(38, Math.min(GameContext.viewportUnit() * 0.07, 66));
    const x = Math.random() * Math.max(1, width - size);
    const maxHealth = kind === 'beetlemorph' ? 1 : kind === 'rhinomorph' ? 2 : 3;
    const entity = new InvaderEnemy(x, -size, 100, maxHealth, size, size, kind);
    this.enemies.set([...this.enemies(), {
      entity,
      speed: signalValue(Math.min(GameContext.viewportUnit() * (kind === 'beetlemorph' ? 0.18 : 0.11), 145)),
      drift: signalValue(Math.random() < 0.5 ? -1 : 1),
      driftSpeed: signalValue(GameContext.viewportUnit() * (kind === 'lobstermorph' ? 0.1 : 0.06)),
      kind,
      fireTimer: signalValue(1.2 + Math.random() * 1.4)
    }]);
  }

  /**
   * Advances invader behavior, fires enemy shots, and resolves player collisions.
   * @param deltaSeconds - Time elapsed since the previous frame.
   * @param width - Current playfield width in world units.
   * @param height - Current playfield height in world units.
   * @private
   * @return {void}
   */
  private updateEnemies(deltaSeconds: number, width: number, height: number): void {
    const playerX = this.player().dimensions.getX();
    const playerY = this.player().dimensions.getY();
    const playerWidth = this.player().dimensions.getWidth();
    const playerHeight = this.player().dimensions.getHeight();

    const enemies = [...this.enemies()];
    for (let index = enemies.length - 1; index >= 0; index--) {
      const invader = enemies[index];
      const entity = invader.entity;
      entity.update(deltaSeconds);
      let velocityX = invader.drift() * invader.driftSpeed();

      if (invader.kind === 'rhinomorph') {
        velocityX += Math.sign(playerX - entity.x) * invader.driftSpeed() * 0.45;
      } else if (invader.kind === 'lobstermorph') {
        velocityX += Math.sin(entity.y * 0.018) * invader.driftSpeed() * 2;
      }
      entity.advanceMovement(deltaSeconds, velocityX, invader.speed());
      const nextX = entity.x;
      if (nextX <= 0 || nextX >= width - entity.width) invader.drift.set(invader.drift() * -1);
      entity.setPosition(
        MathUtils.clamp(nextX, 0, width - entity.width),
        entity.y
      );
      invader.fireTimer.set(invader.fireTimer() - deltaSeconds);
      if (invader.fireTimer() <= 0 && entity.y > 0 && entity.y < height * 0.62) {
        this.shots.set([...this.shots(), {
          motion: new PhysicsBody(
            entity.x + entity.width * 0.5,
            entity.y + entity.height
          ),
          direction: 1
        }]);
        invader.fireTimer.set(1.5 + Math.random() * 1.2);
      }

      if (entity.isAlive && this.overlaps(
        entity.x, entity.y, entity.width, entity.height,
        playerX, playerY, playerWidth, playerHeight
      )) {
        this.loseLife();
        entity.setPosition(entity.x, height + entity.height);
      }

      if (!entity.isAlive) {
        enemies.splice(index, 1);
        this.kills.set(this.kills() + 1);
      } else if (entity.y > height + entity.height) {
        enemies.splice(index, 1);
      }
    }
    this.enemies.set(enemies);
  }

  /**
   * Moves each projectile, removes out-of-bounds shots, and resolves projectile hits.
   * @param deltaSeconds - Time elapsed since the previous frame.
   * @param height - Current playfield height in world units.
   * @private
   * @return {void}
   */
  private updateShots(deltaSeconds: number, height: number): void {
    const shots = [...this.shots()];
    for (let index = shots.length - 1; index >= 0; index--) {
      const shot = shots[index];
      shot.motion.setVelocity(
        0,
        shot.direction * Math.min(GameContext.viewportUnit() * 0.9, 720)
      );
      shot.motion.update(deltaSeconds);
      const x = shot.motion.x();
      const y = shot.motion.y();
      if (y < -10 || y > height + 10) {
        shots.splice(index, 1);
        continue;
      }

      if (shot.direction < 0) {
        const hitIndex = this.enemies().findIndex(({ entity }) => entity.hit(x - 4, y - 8, 8, 16));
        if (hitIndex >= 0) shots.splice(index, 1);
      } else if (this.overlaps(
        x - 5, y - 5, 10, 10,
        this.player().dimensions.getX(), this.player().dimensions.getY(),
        this.player().dimensions.getWidth(), this.player().dimensions.getHeight()
      )) {
        shots.splice(index, 1);
        this.loseLife();
      }
    }
    this.shots.set(shots);
  }

  /**
   * Creates an upward player projectile and begins the firing cooldown.
   * @private
   * @return {void}
   */
  private firePlayerShot(): void {
    this.shots.set([...this.shots(), {
      motion: new PhysicsBody(
        this.player().dimensions.getX() + this.player().dimensions.getWidth() * 0.5,
        this.player().dimensions.getY()
      ),
      direction: -1
    }]);
    this.fireCooldown.set(0.24);
  }

  /**
   * Removes one life and marks the round ended when the player runs out.
   * @private
   * @return {void}
   */
  private loseLife(): void {
    if (this.gameEnded()) return;
    this.lives.set(this.lives() - 1);
    if (this.lives() <= 0) this.gameEnded.set(true);
  }

  /**
   * Renders the reactive enemy counter and the player's remaining heart icons.
   * @param unit - Responsive viewport scale used to size HUD elements.
   * @param width - Current viewport width used to constrain the counter.
   * @private
   * @return {void}
   */
  private drawHud(unit: number, width: number): void {
    this.drawLabel(
      `ENEMIES ${this.kills()} / ${TARGET_KILLS}`, 20, 34,
      Math.max(14, Math.min(unit * 0.032, 22)), '#ffffff', 'left', width * 0.62
    );
    for (let index = 0; index < 3; index++) {
      if (index < this.lives()) {
        const size = Math.max(18, Math.min(unit * 0.04, 28));
        this.heartIcon.draw(20 + index * (size + 6), 47, size);
      }
    }
  }

  /**
   * Renders a sparse star field using the current reactive scroll offset.
   * @param width - Current playfield width in world units.
   * @param height - Current playfield height in world units.
   * @private
   * @return {void}
   */
  private drawStars(width: number, height: number): void {
    const columns = Math.ceil(width / 70);
    const rows = Math.ceil(height / 80);
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const x = column * 70 + ((row * 37) % 50);
        const y = (row * 80 + this.starOffset()) % height;
        GameContext.drawCircle(x, y, 1.5, 'rgba(255,255,255,0.6)');
      }
    }
  }

  /**
   * Tests two axis-aligned rectangles using their world-space bounds.
   * @param firstX - Left coordinate of the first rectangle.
   * @param firstY - Top coordinate of the first rectangle.
   * @param firstWidth - Width of the first rectangle.
   * @param firstHeight - Height of the first rectangle.
   * @param secondX - Left coordinate of the second rectangle.
   * @param secondY - Top coordinate of the second rectangle.
   * @param secondWidth - Width of the second rectangle.
   * @param secondHeight - Height of the second rectangle.
   * @private
   * @return {boolean} Whether the rectangles overlap.
   */
  private overlaps(
    firstX: number, firstY: number, firstWidth: number, firstHeight: number,
    secondX: number, secondY: number, secondWidth: number, secondHeight: number
  ): boolean {
    return Collision2D.overlapsRectangles(
      firstX, firstY, firstWidth, firstHeight,
      secondX, secondY, secondWidth, secondHeight
    );
  }
}
