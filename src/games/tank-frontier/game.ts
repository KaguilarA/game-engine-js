import GameContext from '../../engine/core/context';
import { BaseGame } from '../../engine/core/base-game';
import CanvasIcon from '../../engine/rendering/canvas-icon';
import GameEvents from '../../engine/input/events';
import GameLoader from '../../engine/assets/loader';
import Sprite from '../../engine/animations/sprites/sprite';
import { TouchControls } from '../../engine/input/touch-controls';
import { PhysicsBody } from '../../engine/core/physics';
import { signalValue } from 'reactive-values';
import heartSvg from 'lucide-static/icons/heart.svg?raw';
import type { Pickup } from './interfaces/pickup';
import type { Rect } from './interfaces/rect';
import type { Wall } from './interfaces/wall';

/**
 * Cardinal directions used by tanks, movement input, and bullets.
 */
type Direction = 'up' | 'down' | 'left' | 'right';
/**
 * Targeting strategy used to distinguish enemy tanks.
 */
type EnemyBehavior = 'hunter' | 'ambusher' | 'guardian' | 'skirmisher';
/**
 * Number of enemy defeats required to complete the mission.
 */
const ENEMIES_TO_WIN = 15;

/**
 * Player or enemy tank with sprite animation, health, and combat timers.
 * @class Tank
 */
class Tank {
  /**
   * Stores the sprite state.
   * @property {Sprite} sprite
   * @private
   * @readonly
   */
  private readonly sprite: Sprite;
  /**
   * Stores the x state.
   * @property {Signal} x
   * @public
   * @readonly
   */
  private readonly physics = new PhysicsBody();
  public readonly x = this.physics.x;
  /**
   * Stores the y state.
   * @property {Signal} y
   * @public
   * @readonly
   */
  public readonly y = this.physics.y;
  /**
   * Stores the alive state.
   * @property {Signal} alive
   * @public
   * @readonly
   */
  public readonly alive = signalValue(true);
  /**
   * Stores the health state.
   * @property {Signal} health
   * @private
   * @readonly
   */
  private readonly health = signalValue(1);
  /**
   * Stores the wall attack cooldown state.
   * @property {Signal} wallAttackCooldown
   * @private
   * @readonly
   */
  private readonly wallAttackCooldown = signalValue(0);
  /**
   * Stores the death animation remaining state.
   * @property {number} deathAnimationRemaining
   * @private
   */
  private deathAnimationRemaining = 0;
  /**
   * Stores the atlas row selected for this tank's behavior.
   * @property {number} atlasRow
   * @private
   * @readonly
   */
  private readonly atlasRow: number;
  /**
   * Stores the image name state.
   * @property {string} imageName
   * @private
   * @readonly
   */
  private readonly imageName: string;
  /**
   * Stores the is dying state.
   * @property {boolean} isDying
   * @public
   */
  public isDying = false;
  /**
   * Stores the shot cooldown state.
   * @property {number} shotCooldown
   * @private
   */
  private shotCooldown = Math.random() * 0.8;
  /**
   * Stores the ai direction cooldown state.
   * @property {number} aiDirectionCooldown
   * @private
   */
  private aiDirectionCooldown = 0;
  /**
   * Stores the direction state.
   * @property {Direction} direction
   * @public
   */
  public direction: Direction = 'up';
  /**
   * Stores the size state.
   * @property {number} size
   * @public
   */
  public size: number;
  /**
   * Stores the enemy behavior state.
   * @property {EnemyBehavior | undefined} enemyBehavior
   * @public
   * @readonly
   */
  public readonly enemyBehavior: EnemyBehavior | undefined;

  /**
   * Creates a tank and selects its sprite row and enemy behavior.
   * @public
   * @return {void}
   */
  public constructor(
    imageName: string,
    x: number,
    y: number,
    size = 76,
    maximumHealth = 1,
    enemyBehavior?: EnemyBehavior
  ) {
    const atlas = GameLoader.getAtlas(imageName);
    const rowByBehavior: Record<EnemyBehavior, number> = {
      hunter: 0,
      ambusher: 1,
      guardian: 2,
      skirmisher: 3
    };
    const atlasRow = imageName === 'player'
      ? 0
      : rowByBehavior[enemyBehavior ?? 'hunter'];
    this.sprite = new Sprite(
      GameLoader.getImage(imageName),
      size,
      size,
      x,
      y,
      0.5,
      0.5
    );
    this.size = size;
    this.imageName = imageName;
    this.health.set(maximumHealth);
    this.enemyBehavior = enemyBehavior;
    this.atlasRow = atlasRow;
    this.physics.setPosition(x, y);
    this.sprite.playAtlasClip(
      atlas.getAnimation(
        imageName === 'player' ? 'idle' : `idle-row-${atlasRow}`
      )
    );
  }

  /**
   * Places the tank at the requested center position.
   * @public
   * @return {void}
   */
  public setPosition(x: number, y: number): void {
    this.physics.setPosition(x, y);
    this.sprite.dimensions.setPosition(x, y);
  }

  /**
   * Advances the tank along its current cardinal direction through physics.
   * @param direction - Cardinal direction, or undefined to remain still.
   * @param speed - Movement speed in world units per second.
   * @param deltaSeconds - Elapsed time since the previous frame.
   * @public
   * @return {void}
   */
  public advanceMovement(direction: Direction | undefined, speed: number, deltaSeconds: number): void {
    const velocityX = direction === 'left'
      ? -speed
      : direction === 'right' ? speed : 0;
    const velocityY = direction === 'up'
      ? -speed
      : direction === 'down' ? speed : 0;
    this.physics.setVelocity(velocityX, velocityY);
    this.physics.update(deltaSeconds);
    this.sprite.dimensions.setPosition(this.x(), this.y());
  }

  /**
   * Resizes the tank while preserving its square aspect ratio.
   * @public
   * @return {void}
   */
  public setSize(size: number): void {
    this.size = size;
    this.sprite.dimensions.setSize(size, size);
  }

  /**
   * Advances the tank's living or death animation.
   * @public
   * @return {void}
   */
  public updateAnimation(deltaSeconds: number): void {
    this.sprite.update(deltaSeconds);
    if (!this.isDying) return;
    this.deathAnimationRemaining = Math.max(
      0,
      this.deathAnimationRemaining - deltaSeconds
    );
    if (this.deathAnimationRemaining === 0 && !this.sprite.isAnimationPlaying) {
      this.isDying = false;
    }
  }

  /**
   * Applies damage and starts the death animation when health is depleted.
   * @public
   * @return {boolean}
   */
  public takeHit(): boolean {
    if (!this.alive()) return false;

    this.health.set(Math.max(0, this.health() - 1));
    if (this.health() === 0) {
      this.alive.set(false);
      if (this.imageName !== 'player') {
        const atlas = GameLoader.getAtlas(this.imageName);
        const animationName = this.imageName === 'eaglemorph'
          ? `explosion-row-${this.atlasRow}`
          : 'explosion';
        const animation = atlas.getAnimation(animationName);
        this.isDying = true;
        this.deathAnimationRemaining = animation.frames.length > 1
          ? (animation.frames.length - 1) / animation.frameRate
          : 0.2;
        this.sprite.playAtlasClip(animation);
      }
    }

    return true;
  }

  /**
   * Counts down the delay before the tank can attack another wall.
   * @public
   * @return {void}
   */
  public updateWallAttackCooldown(deltaSeconds: number): void {
    this.wallAttackCooldown.set(
      Math.max(0, this.wallAttackCooldown() - deltaSeconds)
    );
  }

  /**
   * Reports whether the wall-attack cooldown has elapsed.
   * @public
   * @return {boolean}
   */
  public canAttackWall(): boolean {
    return this.wallAttackCooldown() === 0;
  }

  /**
   * Starts the cooldown after an enemy attacks a wall.
   * @public
   * @return {void}
   */
  public startWallAttackCooldown(): void {
    this.wallAttackCooldown.set(0.65);
  }

  /**
   * Counts down the delay before the tank can fire again.
   * @public
   * @return {void}
   */
  public updateShotCooldown(deltaSeconds: number): void {
    this.shotCooldown = Math.max(0, this.shotCooldown - deltaSeconds);
  }

  /**
   * Reports whether the tank is ready to fire.
   * @public
   * @return {boolean}
   */
  public canShoot(): boolean {
    return this.shotCooldown === 0;
  }

  /**
   * Starts the firing delay for the supplied number of seconds.
   * @public
   * @return {void}
   */
  public startShotCooldown(seconds: number): void {
    this.shotCooldown = seconds;
  }

  /**
   * Counts down the delay before the enemy can choose a new direction.
   * @public
   * @return {void}
   */
  public updateAiDirectionCooldown(deltaSeconds: number): void {
    this.aiDirectionCooldown = Math.max(0, this.aiDirectionCooldown - deltaSeconds);
  }

  /**
   * Reports whether an enemy may choose a new direction.
   * @public
   * @return {boolean}
   */
  public canChooseAiDirection(): boolean {
    return this.aiDirectionCooldown === 0;
  }

  /**
   * Delays the next enemy direction decision.
   * @public
   * @return {void}
   */
  public startAiDirectionCooldown(seconds: number): void {
    this.aiDirectionCooldown = seconds;
  }

  /**
   * Draws the tank at its current position and facing.
   * @public
   * @return {void}
   */
  public draw(): void {
    if (!this.alive() && !this.isDying) return;

    const angle = this.direction === 'right'
      ? Math.PI * 0.5
      : this.direction === 'down'
        ? Math.PI
        : this.direction === 'left'
          ? Math.PI * 1.5
          : 0;

    this.sprite.draw(angle);
  }

}

/**
 * Reusable directional tank projectile with animated sprite frames.
 * @class Bullet
 */
class Bullet {
  /**
   * Stores the sprite state.
   * @property {Sprite} sprite
   * @private
   * @readonly
   */
  private readonly sprite: Sprite;
  /**
   * Stores the x state.
   * @property {Signal} x
   * @public
   * @readonly
   */
  private readonly physics = new PhysicsBody();
  public readonly x = this.physics.x;
  /**
   * Stores the y state.
   * @property {Signal} y
   * @public
   * @readonly
   */
  public readonly y = this.physics.y;
  /**
   * Stores the active state.
   * @property {Signal} active
   * @public
   * @readonly
   */
  public readonly active = signalValue(false);
  /**
   * Stores the direction state.
   * @property {Direction} direction
   * @public
   */
  public direction: Direction = 'up';

  /**
   * Creates an inactive bullet ready to be reused.
   * @public
   * @return {void}
   */
  public constructor() {
    const atlas = GameLoader.getAtlas('enemyProjectile');
    this.sprite = new Sprite(
      GameLoader.getImage('enemyProjectile'),
      14,
      28,
      0,
      0,
      0.5,
      0.5
    );
    this.sprite.playAtlasClip(atlas.getAnimation('idle'));
  }

  /**
   * Returns the bullet's collision width.
   * @public
   * @return {number}
   */
  public get width(): number {
    return this.direction === 'left' || this.direction === 'right' ? 28 : 14;
  }

  /**
   * Returns the bullet's collision height.
   * @public
   * @return {number}
   */
  public get height(): number {
    return this.direction === 'up' || this.direction === 'down' ? 28 : 14;
  }

  /**
   * Returns the bullet's current axis-aligned bounds.
   * @public
   * @return {Rect}
   */
  public get bounds(): Rect {
    return {
      x: this.x() - this.width * 0.5,
      y: this.y() - this.height * 0.5,
      width: this.width,
      height: this.height
    };
  }

  /**
   * Activates the bullet with a position and cardinal travel direction.
   * @public
   * @return {void}
   */
  public start(x: number, y: number, direction: Direction): void {
    this.physics.setPosition(x, y);
    this.physics.stop();
    this.direction = direction;
    this.sprite.dimensions.setPosition(x, y);
    this.active.set(true);
  }

  /**
   * Deactivates the bullet so it can return to the pool.
   * @public
   * @return {void}
   */
  public stop(): void {
    this.active.set(false);
    this.physics.stop();
  }

  /**
   * Moves the active bullet and updates its sprite animation.
   * @public
   * @return {void}
   */
  public update(deltaSeconds: number): void {
    if (!this.active()) return;
    this.sprite.update(deltaSeconds);

    const speed = 780;
    const velocityX = this.direction === 'left'
      ? -speed
      : this.direction === 'right' ? speed : 0;
    const velocityY = this.direction === 'up'
      ? -speed
      : this.direction === 'down' ? speed : 0;
    this.physics.setVelocity(velocityX, velocityY);
    this.physics.update(deltaSeconds);

    const dimensions = GameContext.gameDimensionsModel;
    if (
      this.x() < -this.width * 0.5
      || this.y() < -this.height * 0.5
      || this.x() > dimensions.getWidth() + this.width * 0.5
      || this.y() > dimensions.getHeight() + this.height * 0.5
    ) {
      this.stop();
    }
  }

  /**
   * Draws the bullet only while it is active.
   * @public
   * @return {void}
   */
  public draw(): void {
    if (!this.active()) return;
    const angle = this.direction === 'right'
      ? Math.PI * 0.5
      : this.direction === 'down'
        ? Math.PI
        : this.direction === 'left'
          ? Math.PI * 1.5
          : 0;

    this.sprite.dimensions.setPosition(this.x(), this.y());
    this.sprite.draw(angle);
  }
}

/**
 * Tank combat game with a fixed arena, destructible cover, and 15-defeat goal.
 * @class TankFrontierGame
 */
export class TankFrontierGame extends BaseGame {
  /**
   * Stores the player state.
   * @property {Tank} player
   * @private
   * @readonly
   */
  private readonly player = new Tank('player', 0, 0, this.getTankSize());
  /**
   * Stores the enemies state.
   * @property {Tank[]} enemies
   * @private
   * @readonly
   */
  private readonly enemies: Tank[] = [];
  /**
   * Stores the player bullets state.
   * @property {Bullet[]} playerBullets
   * @private
   * @readonly
   */
  private readonly playerBullets: Bullet[] = [];
  /**
   * Stores the enemy bullets state.
   * @property {Bullet[]} enemyBullets
   * @private
   * @readonly
   */
  private readonly enemyBullets: Bullet[] = [];
  /**
   * Stores the walls state.
   * @property {Wall[]} walls
   * @private
   * @readonly
   */
  private readonly walls: Wall[] = [];
  /**
   * Stores the touch controls state.
   * @property {TouchControls} touchControls
   * @private
   * @readonly
   */
  private readonly touchControls = new TouchControls();
  /**
   * Stores the full heart icon state.
   * @property {CanvasIcon} fullHeartIcon
   * @private
   * @readonly
   */
  private readonly fullHeartIcon = new CanvasIcon(heartSvg, '#ff5a6b', true);
  /**
   * Stores the empty heart icon state.
   * @property {CanvasIcon} emptyHeartIcon
   * @private
   * @readonly
   */
  private readonly emptyHeartIcon = new CanvasIcon(heartSvg, '#5c657d');
  /**
   * Stores the life pickup icon state.
   * @property {CanvasIcon} lifePickupIcon
   * @private
   * @readonly
   */
  private readonly lifePickupIcon = new CanvasIcon(heartSvg, '#ff5a6b', true);
  /**
   * Stores the defeated enemies state.
   * @property {Signal} defeatedEnemies
   * @private
   * @readonly
   */
  private readonly defeatedEnemies = signalValue(0);
  /**
   * Stores the lives state.
   * @property {Signal} lives
   * @private
   * @readonly
   */
  private readonly lives = signalValue(3);
  /**
   * Stores the wave state.
   * @property {Signal} wave
   * @private
   * @readonly
   */
  private readonly wave = signalValue(1);
  /**
   * Stores the game over state.
   * @property {Signal} gameOver
   * @private
   * @readonly
   */
  private readonly gameOver = signalValue(false);
  /**
   * Stores the game won state.
   * @property {Signal} gameWon
   * @private
   * @readonly
   */
  private readonly gameWon = signalValue(false);
  /**
   * Stores the shoot cooldown state.
   * @property {Signal} shootCooldown
   * @private
   * @readonly
   */
  private readonly shootCooldown = signalValue(0);
  /**
   * Stores the enemy spawn cooldown state.
   * @property {Signal} enemySpawnCooldown
   * @private
   * @readonly
   */
  private readonly enemySpawnCooldown = signalValue(0);
  /**
   * Stores the damage cooldown state.
   * @property {Signal} damageCooldown
   * @private
   * @readonly
   */
  private readonly damageCooldown = signalValue(0);
  /**
   * Stores the next life pickup at state.
   * @property {Signal} nextLifePickupAt
   * @private
   * @readonly
   */
  private readonly nextLifePickupAt = signalValue(5);
  /**
   * Stores the life pickup state.
   * @property {Signal} lifePickup
   * @private
   * @readonly
   */
  private readonly lifePickup = signalValue<Pickup | undefined>(undefined);

  /**
   * Initializes the arena, projectile pools, starting wave, and render loop.
   * @public
   * @return {void}
   */
  public constructor(onReturnToMenu?: () => void) {
    super(onReturnToMenu);
    this.resetPlayerPosition();
    this.createWalls();
    this.createBullets();
    this.createWave();
    this.registerCleanup(() => this.touchControls.dispose());
    this.start();
  }

  /**
   * Reports a completed win or loss state.
   * @protected
   * @return {boolean}
   */
  protected get isGameOver(): boolean {
    return this.gameOver();
  }

  /**
   * Advances combat, pickups, enemy spawning, and win/loss checks.
   * @protected
   * @return {void}
   */
  protected updateGame(deltaSeconds: number): void {
    this.damageCooldown.set(Math.max(0, this.damageCooldown() - deltaSeconds));
    this.updatePlayer(deltaSeconds);
    this.updateLifePickup();
    this.updateBullets(deltaSeconds);
    this.updateEnemies(deltaSeconds);
    this.updateEnemySpawning(deltaSeconds);
    this.checkCollisions();
    if (this.gameOver()) return;

    if (
      this.enemies.length > 0
      && this.enemies.every((enemy) => !enemy.alive() && !enemy.isDying)
    ) {
      this.wave.set(this.wave() + 1);
      this.createWave();
    }

  }

  /**
   * Repositions tanks and clears projectiles after a viewport resize.
   * @protected
   * @return {void}
   */
  protected onViewportChanged(): void {
    this.player.setSize(this.getTankSize());
    this.resetPlayerPosition();
    this.enemies.forEach((enemy) => {
      enemy.setSize(this.getTankSize());
      const position = this.movePosition(
        enemy.x(),
        enemy.y(),
        undefined,
        0,
        enemy.size
      );
      enemy.setPosition(position.x, position.y);
    });
    this.playerBullets.forEach((bullet) => bullet.stop());
    this.enemyBullets.forEach((bullet) => bullet.stop());
  }

  /**
   * Draws the arena, entities, HUD, and touch controls in layer order.
   * @protected
   * @return {void}
   */
  protected drawGame(): void {
    const dimensions = GameContext.gameDimensionsModel;
    const hudScale = GameContext.isPortrait ? 1.35 : 1;
    GameContext.clear();
    GameContext.drawImage(
      GameLoader.getImage(
        GameContext.isPortrait
          ? 'background1080x1920'
          : 'background1920x1080'
      ),
      0,
      0,
      dimensions.getWidth(),
      dimensions.getHeight()
    );
    GameContext.drawRect(
      0,
      0,
      dimensions.getWidth(),
      dimensions.getHeight(),
      'rgba(12, 19, 39, 0.68)'
    );
    this.drawArena();
    this.drawBase();
    this.walls.forEach((wall) => this.drawWall(wall));
    this.enemies.forEach((enemy) => enemy.draw());
    this.player.draw();
    this.playerBullets.forEach((bullet) => bullet.draw());
    this.enemyBullets.forEach((bullet) => bullet.draw());
    this.drawLifePickup();
    this.drawHud(hudScale);
    this.drawTouchControls();

    if (this.gameOver()) {
      GameContext.drawRect(
        0,
        0,
        dimensions.getWidth(),
        dimensions.getHeight(),
        'rgba(23, 17, 37, 0.82)'
      );
      this.drawLabel(
        this.gameWon() ? 'MISSION COMPLETE' : 'TANK DESTROYED',
        dimensions.getWidth() * 0.5,
        dimensions.getHeight() * 0.45,
        Math.max(22, Math.min(GameContext.viewportUnit() * 0.065, 42)),
        this.gameWon() ? '#72dcff' : '#ff6584',
        'center',
        dimensions.getWidth() * 0.85
      );
      this.drawLabel(
        this.gameWon() ? `${ENEMIES_TO_WIN} ENEMIES DESTROYED` : 'USE THE ACTION BUTTONS BELOW',
        dimensions.getWidth() * 0.5,
        dimensions.getHeight() * 0.54,
        Math.max(12, Math.min(GameContext.viewportUnit() * 0.026, 18)),
        '#ffffff',
        'center',
        dimensions.getWidth() * 0.85
      );
    }
  }

  /**
   * Draws the fixed arena backdrop and field boundary.
   * @private
   * @return {void}
   */
  private drawArena(): void {
    const dimensions = GameContext.gameDimensionsModel;
    const { margin, top: arenaTop, bottom: arenaBottom, tileSize } = (
      this.getArenaBounds()
    );
    GameContext.drawRect(
      margin,
      arenaTop,
      dimensions.getWidth() - margin * 2,
      arenaBottom - arenaTop,
      'rgba(19, 31, 52, 0.9)'
    );
    GameContext.drawRect(
      margin,
      arenaTop,
      dimensions.getWidth() - margin * 2,
      arenaBottom - arenaTop,
      'rgba(68, 111, 131, 0.14)'
    );

    const context = GameContext.context;
    context.save();
    context.beginPath();
    context.rect(
      margin,
      arenaTop,
      dimensions.getWidth() - margin * 2,
      arenaBottom - arenaTop
    );
    context.clip();
    context.strokeStyle = 'rgba(129, 171, 184, 0.1)';
    context.lineWidth = 2;

    for (let x = margin; x <= dimensions.getWidth() - margin; x += tileSize) {
      context.moveTo(x, arenaTop);
      context.lineTo(x, arenaBottom);
    }
    for (let y = arenaTop; y <= arenaBottom; y += tileSize) {
      context.moveTo(margin, y);
      context.lineTo(dimensions.getWidth() - margin, y);
    }
    context.stroke();
    context.restore();

    context.strokeStyle = '#6b9aa5';
    context.lineWidth = 6;
    context.strokeRect(
      margin,
      arenaTop,
      dimensions.getWidth() - margin * 2,
      arenaBottom - arenaTop
    );
  }

  /**
   * Draws the protected base at the bottom of the arena.
   * @private
   * @return {void}
   */
  private drawBase(): void {
    const dimensions = GameContext.gameDimensionsModel;
    const centerX = dimensions.getWidth() * 0.5;
    const { bottom } = this.getArenaBounds();
    const unit = GameContext.viewportUnit();
    const width = Math.max(72, unit * 0.2);
    const height = Math.max(40, unit * 0.11);

    GameContext.drawRect(
      centerX - width * 0.5,
      bottom - 6 - height,
      width,
      height,
      '#4d5d76'
    );
    GameContext.drawRect(
      centerX - width * 0.34,
      bottom - 6 - height * 0.74,
      width * 0.68,
      height * 0.74,
      '#d09a51'
    );
    GameContext.drawRect(
      centerX - width * 0.18,
      bottom - 6 - height * 0.56,
      width * 0.36,
      height * 0.56,
      '#26364f'
    );
    GameContext.drawRect(
      centerX - width * 0.5,
      bottom - 6 - height,
      width,
      8,
      '#9bc1c5'
    );
  }

  /**
   * Draws a wall using its material and durability state.
   * @private
   * @return {void}
   */
  private drawWall(wall: Wall): void {
    if (!wall.destructible) {
      GameContext.drawRect(wall.x, wall.y, wall.width, wall.height, '#526477');
      GameContext.drawRect(
        wall.x + 3,
        wall.y + 3,
        wall.width - 6,
        Math.max(3, wall.height * 0.18),
        '#c4d1dc'
      );
      GameContext.drawRect(
        wall.x + wall.width * 0.42,
        wall.y + 3,
        Math.max(3, wall.width * 0.16),
        wall.height - 6,
        '#788b9c'
      );
      GameContext.drawRect(
        wall.x + 3,
        wall.y + wall.height - 6,
        wall.width - 6,
        3,
        '#283746'
      );
      return;
    }

    const color = wall.health === 2 ? '#bb754d' : '#75452f';
    GameContext.drawRect(wall.x, wall.y, wall.width, wall.height, color);
    GameContext.drawRect(
      wall.x + 4,
      wall.y + 4,
      wall.width - 8,
      wall.height * 0.42,
      'rgba(255, 211, 146, 0.24)'
    );
    GameContext.drawRect(
      wall.x + wall.width * 0.48,
      wall.y,
      4,
      wall.height,
      'rgba(27, 25, 35, 0.36)'
    );
  }

  /**
   * Draws enemy progress, wave, and remaining player lives.
   * @private
   * @return {void}
   */
  private drawHud(scale: number): void {
    const dimensions = GameContext.gameDimensionsModel;
    const unit = GameContext.viewportUnit();
    this.drawLabel(
      `ENEMIES ${Math.min(this.defeatedEnemies(), ENEMIES_TO_WIN)} / ${ENEMIES_TO_WIN}`,
      30 * scale,
      44 * scale,
      Math.max(12, Math.min(unit * 0.03, 19)) * scale,
      '#72dcff',
      'left',
      dimensions.getWidth() * 0.42
    );
    this.drawLabel(
      `WAVE ${this.wave()}`,
      dimensions.getWidth() - 30 * scale,
      44 * scale,
      Math.max(14, Math.min(unit * 0.035, 22)) * scale,
      '#f8e27a',
      'right',
      dimensions.getWidth() * 0.35
    );
    const portrait = GameContext.isPortrait;
    const size = Math.max(
      12,
      Math.min(unit * 0.042, portrait ? 22 : 30)
    );
    const spacing = size * 1.2;
    const x = Math.max(12, unit * 0.055) + size * 0.5;
    const y = Math.max(size + 14, unit * 0.16);
    for (let index = 0; index < 3; index++) {
      const icon = index < this.lives()
        ? this.fullHeartIcon
        : this.emptyHeartIcon;
      icon.draw(x + index * spacing - size * 0.5, y - size * 0.5, size);
    }
    if (!GameContext.isMobileDevice) {
      this.drawLabel(
        'BATTLE CITY INSPIRED • ARROWS / WASD MOVE • SPACE FIRE',
        dimensions.getWidth() * 0.5,
        dimensions.getHeight() - 26,
        Math.max(10, Math.min(unit * 0.022, 14)),
        '#d9e1ff',
        'center',
        dimensions.getWidth() * 0.9
      );
    }
  }

  /**
   * Draws the stationary heart when one is present in the arena.
   * @private
   * @return {void}
   */
  private drawLifePickup(): void {
    const pickup = this.lifePickup();
    if (pickup === undefined) return;
    this.lifePickupIcon.draw(
      pickup.x - pickup.size * 0.5,
      pickup.y - pickup.size * 0.5,
      pickup.size
    );
  }

  /**
   * Draws the shared movement and fire controls on touch devices.
   * @private
   * @return {void}
   */
  private drawTouchControls(): void {
    this.touchControls.draw();
  }

  /**
   * Reads movement and fire input, then updates the player tank.
   * @private
   * @return {void}
   */
  private updatePlayer(deltaSeconds: number): void {
    this.player.updateAnimation(deltaSeconds);
    const direction = this.getInputDirection();
    if (direction !== undefined) this.player.direction = direction;
    const speed = 260;
    const previousX = this.player.x();
    const previousY = this.player.y();
    this.player.advanceMovement(direction, speed, deltaSeconds);
    const next = this.movePosition(
      this.player.x(),
      this.player.y(),
      undefined,
      0
    );
    if (!this.collidesWithWalls(this.player, next.x, next.y)) {
      this.player.setPosition(next.x, next.y);
    } else {
      this.player.setPosition(previousX, previousY);
    }

    this.shootCooldown.set(Math.max(0, this.shootCooldown() - deltaSeconds));
    const wantsToShoot = GameEvents.isKeyPressed(' ');
    if (wantsToShoot && this.shootCooldown() === 0) {
      this.fire(this.player, this.playerBullets);
      this.shootCooldown.set(0.28);
    }
  }

  /**
   * Resolves held keyboard or touch keys to one tank direction.
   * @private
   * @return {Direction | undefined}
   */
  private getInputDirection(): Direction | undefined {
    if (GameEvents.isKeyPressed('ArrowUp') || GameEvents.isKeyPressed('w')) return 'up';
    if (GameEvents.isKeyPressed('ArrowDown') || GameEvents.isKeyPressed('s')) return 'down';
    if (GameEvents.isKeyPressed('ArrowLeft') || GameEvents.isKeyPressed('a')) return 'left';
    if (GameEvents.isKeyPressed('ArrowRight') || GameEvents.isKeyPressed('d')) return 'right';
    return undefined;
  }

  /**
   * Advances both projectile pools and releases bullets outside the field.
   * @private
   * @return {void}
   */
  private updateBullets(deltaSeconds: number): void {
    this.playerBullets.forEach((bullet) => bullet.update(deltaSeconds));
    this.enemyBullets.forEach((bullet) => bullet.update(deltaSeconds));
  }

  /**
   * Updates enemy strategy, movement, wall attacks, and firing decisions.
   * @private
   * @return {void}
   */
  private updateEnemies(deltaSeconds: number): void {
    this.enemies.forEach((enemy) => {
      enemy.updateAnimation(deltaSeconds);
      if (!enemy.alive()) return;
      const behavior = enemy.enemyBehavior ?? 'hunter';
      const target = this.getEnemyTarget(enemy, behavior);
      const speedByBehavior: Record<EnemyBehavior, number> = {
        hunter: 68,
        ambusher: 82,
        guardian: 52,
        skirmisher: 60
      };
      const distance = (speedByBehavior[behavior] + Math.min(this.wave() * 2, 16))
        * deltaSeconds;
      const horizontal = target.x - enemy.x();
      const vertical = target.y - enemy.y();
      const hasReachedTarget = (
        Math.abs(horizontal) + Math.abs(vertical) <= enemy.size * 0.5
      );
      const preferredDirection: Direction = Math.abs(horizontal) > Math.abs(vertical)
        ? horizontal > 0 ? 'right' : 'left'
        : vertical > 0 ? 'down' : 'up';
      const secondaryDirection: Direction = Math.abs(horizontal) > Math.abs(vertical)
        ? vertical > 0 ? 'down' : 'up'
        : horizontal > 0 ? 'right' : 'left';
      const directions = [
        preferredDirection,
        secondaryDirection,
        this.getOppositeDirection(preferredDirection),
        this.getOppositeDirection(secondaryDirection)
      ].filter((direction, index, all) => all.indexOf(direction) === index);
      const currentNext = hasReachedTarget
        ? { x: enemy.x(), y: enemy.y() }
        : this.movePosition(
          enemy.x(),
          enemy.y(),
          enemy.direction,
          distance,
          enemy.size
        );
      const isBlocked = (
        this.collidesWithWalls(enemy, currentNext.x, currentNext.y)
        || (currentNext.x === enemy.x() && currentNext.y === enemy.y())
      );
      enemy.updateAiDirectionCooldown(deltaSeconds);
      const shouldChooseDirection = (
        !hasReachedTarget
        && (enemy.canChooseAiDirection() || isBlocked)
      );
      const possibleMoves = shouldChooseDirection
        ? directions
        .map((direction, directionIndex) => {
          const next = this.movePosition(
            enemy.x(),
            enemy.y(),
            direction,
            distance,
            enemy.size
          );
          return {
            direction,
            next,
            directionIndex,
            distanceToTarget: Math.abs(target.x - next.x) + Math.abs(target.y - next.y)
          };
        })
        .filter(({ next }) => !this.collidesWithWalls(enemy, next.x, next.y))
        .sort((left, right) => (
          left.distanceToTarget - right.distanceToTarget
          || left.directionIndex - right.directionIndex
        ))
        : [{
          direction: enemy.direction,
          next: currentNext,
          directionIndex: 0,
          distanceToTarget: 0
        }];

      const move = possibleMoves[0];
      if (move !== undefined) {
        if (shouldChooseDirection) {
          enemy.direction = move.direction;
          const cooldownByBehavior: Record<EnemyBehavior, number> = {
            hunter: 0.22,
            ambusher: 0.34,
            guardian: 0.48,
            skirmisher: 0.3
          };
          enemy.startAiDirectionCooldown(cooldownByBehavior[behavior]);
        }
        enemy.advanceMovement(
          move.direction,
          deltaSeconds > 0 && !hasReachedTarget ? distance / deltaSeconds : 0,
          deltaSeconds
        );
        const constrained = this.movePosition(
          enemy.x(),
          enemy.y(),
          undefined,
          0,
          enemy.size
        );
        enemy.setPosition(constrained.x, constrained.y);
      } else {
        enemy.direction = preferredDirection;
        const next = this.movePosition(
          enemy.x(),
          enemy.y(),
          preferredDirection,
          distance,
          enemy.size
        );
        const blockingWall = this.walls.find((wall) => this.intersects(
          next.x - enemy.size * 0.5,
          next.y - enemy.size * 0.5,
          enemy.size,
          enemy.size,
          wall
        ));
        if (blockingWall?.destructible && enemy.canAttackWall()) {
          blockingWall.health -= 1;
          enemy.startWallAttackCooldown();
          if (blockingWall.health <= 0) {
            this.walls.splice(this.walls.indexOf(blockingWall), 1);
          }
        }
      }

      enemy.updateWallAttackCooldown(deltaSeconds);
      enemy.updateShotCooldown(deltaSeconds);
      if (!enemy.canShoot()) return;
      this.fire(
        enemy,
        this.enemyBullets,
        this.getAimDirection(enemy, this.player)
      );
      const shotDelayByBehavior: Record<EnemyBehavior, number> = {
        hunter: 2.6,
        ambusher: 3.1,
        guardian: 2.2,
        skirmisher: 2.8
      };
      enemy.startShotCooldown(shotDelayByBehavior[behavior] + Math.random() * 0.8);
      });
  }

  /**
   * Selects a target point based on the enemy tank's behavior.
   * @private
   * @return {void}
   */
  private getEnemyTarget(
    enemy: Tank,
    behavior: EnemyBehavior
  ): { x: number; y: number } {
    if (behavior === 'guardian') {
      const { bottom, tileSize } = this.getArenaBounds();
      return {
        x: GameContext.gameDimensionsModel.getWidth() * 0.5,
        y: bottom - tileSize * 1.8
      };
    }

    if (behavior === 'ambusher') {
      return this.movePosition(
        this.player.x(),
        this.player.y(),
        this.player.direction,
        enemy.size * 3.5
      );
    }

    if (behavior === 'skirmisher') {
      const deltaX = enemy.x() - this.player.x();
      const deltaY = enemy.y() - this.player.y();
      const distance = Math.abs(deltaX) + Math.abs(deltaY);
      if (distance < enemy.size * 2.4) {
        const escapeDirection: Direction = Math.abs(deltaX) > Math.abs(deltaY)
          ? deltaX > 0 ? 'right' : 'left'
          : deltaY > 0 ? 'down' : 'up';
        return this.movePosition(
          enemy.x(),
          enemy.y(),
          escapeDirection,
          enemy.size * 3,
          enemy.size
        );
      }
    }

    return { x: this.player.x(), y: this.player.y() };
  }

  /**
   * Chooses the cardinal direction that best aligns a shot with its target.
   * @private
   * @return {Direction}
   */
  private getAimDirection(shooter: Tank, target: Tank): Direction {
    const horizontal = target.x() - shooter.x();
    const vertical = target.y() - shooter.y();
    return Math.abs(horizontal) > Math.abs(vertical)
      ? horizontal > 0 ? 'right' : 'left'
      : vertical > 0 ? 'down' : 'up';
  }

  /**
   * Returns the direction opposite to the supplied cardinal direction.
   * @private
   * @return {Direction}
   */
  private getOppositeDirection(direction: Direction): Direction {
      if (direction === 'up') return 'down';
      if (direction === 'down') return 'up';
      if (direction === 'left') return 'right';
      return 'left';
  }

  /**
   * Adds enemies at intervals while the active tank limit allows it.
   * @private
   * @return {void}
   */
  private updateEnemySpawning(deltaSeconds: number): void {
    this.enemySpawnCooldown.set(Math.max(0, this.enemySpawnCooldown() - deltaSeconds));
    if (this.enemySpawnCooldown() > 0 || this.enemies.length >= 6) return;
    this.spawnEnemy();
    this.enemySpawnCooldown.set(1.6);
  }

  /**
   * Resolves projectile hits against walls, enemies, and the player.
   * @private
   * @return {void}
   */
  private checkCollisions(): void {
    this.playerBullets.forEach((bullet) => {
      if (this.gameOver() || !bullet.active()) return;
      const bulletBounds = bullet.bounds;
      const wall = this.walls.find((candidate) => this.intersects(
        bulletBounds.x,
        bulletBounds.y,
        bulletBounds.width,
        bulletBounds.height,
        candidate
      ));
      if (wall) {
        bullet.stop();
        if (wall.destructible) {
          wall.health -= 1;
          if (wall.health <= 0) this.walls.splice(this.walls.indexOf(wall), 1);
        }
        return;
      }
      const enemy = this.enemies.find((candidate) => (
        candidate.alive()
        && this.intersectsTank(bullet, candidate)
      ));
      if (enemy) {
        enemy.takeHit();
        bullet.stop();
        if (!enemy.alive()) {
          GameLoader.playAudio('boom1');
          this.recordEnemyDefeat();
          if (!this.gameOver()) this.updateProgressMilestones();
        }
        return;
      }

    });

    this.enemyBullets.forEach((bullet) => {
      if (this.gameOver() || !bullet.active()) return;
      const bulletBounds = bullet.bounds;
      if (this.walls.some((wall) => this.intersects(
        bulletBounds.x,
        bulletBounds.y,
        bulletBounds.width,
        bulletBounds.height,
        wall
      ))) {
        bullet.stop();
        return;
      }
      if (!this.intersectsTank(bullet, this.player)) return;
      bullet.stop();
      if (this.damageCooldown() > 0) return;
      this.lives.set(Math.max(0, this.lives() - 1));
      this.damageCooldown.set(0.9);
      this.resetPlayerPosition();
      if (this.lives() === 0) {
        this.gameOver.set(true);
        GameLoader.playAudio('lose');
      }
    });
  }

  /**
   * Advances the defeat counter and ends the game at the mission target.
   * @private
   * @return {void}
   */
  private recordEnemyDefeat(): void {
    this.defeatedEnemies.set(this.defeatedEnemies() + 1);
    if (this.defeatedEnemies() >= ENEMIES_TO_WIN) {
      this.gameWon.set(true);
      this.gameOver.set(true);
      this.playerBullets.forEach((bullet) => bullet.stop());
      this.enemyBullets.forEach((bullet) => bullet.stop());
      GameLoader.playAudio('win');
    }
  }

  /**
   * Spawns a stationary heart at every fifth defeat when a life is missing.
   * @private
   * @return {void}
   */
  private updateProgressMilestones(): void {
    while (this.defeatedEnemies() >= this.nextLifePickupAt()) {
      if (this.lives() < 3 && this.lifePickup() === undefined) {
        const size = Math.max(
          16,
          Math.min(GameContext.viewportUnit() * 0.075, 48, this.getArenaBounds().tileSize * 0.8)
        );
        const position = this.findLifePickupPosition(size);
        if (position !== undefined) this.lifePickup.set({ ...position, size });
      }
      this.nextLifePickupAt.set(this.nextLifePickupAt() + 5);
    }
  }

  /**
   * Restores a life when the player tank overlaps the stationary heart.
   * @private
   * @return {void}
   */
  private updateLifePickup(): void {
    const pickup = this.lifePickup();
    if (pickup === undefined) return;
    if (this.intersects(
      pickup.x - pickup.size * 0.5,
      pickup.y - pickup.size * 0.5,
      pickup.size,
      pickup.size,
      {
        x: this.player.x() - this.player.size * 0.5,
        y: this.player.y() - this.player.size * 0.5,
        width: this.player.size,
        height: this.player.size
      }
    )) {
      this.lives.set(Math.min(3, this.lives() + 1));
      this.lifePickup.set(undefined);
      GameLoader.playAudio('win');
      return;
    }
  }

  /**
   * Finds an unoccupied arena cell away from walls, tanks, and the base.
   * @private
   * @return {void}
   */
  private findLifePickupPosition(size: number): { x: number; y: number } | undefined {
    const dimensions = GameContext.gameDimensionsModel;
    const { margin, top, bottom, tileSize } = this.getArenaBounds();
    const half = size * 0.5;
    const baseWidth = Math.max(72, GameContext.viewportUnit() * 0.2);
    const baseHeight = Math.max(40, GameContext.viewportUnit() * 0.11);
    const base: Rect = {
      x: dimensions.getWidth() * 0.5 - baseWidth * 0.5,
      y: bottom - 6 - baseHeight,
      width: baseWidth,
      height: baseHeight
    };
    const columns = Math.max(1, Math.floor((dimensions.getWidth() - margin * 2) / tileSize));
    const rows = Math.max(1, Math.floor((bottom - top) / tileSize));
    const offsetX = (dimensions.getWidth() - columns * tileSize) * 0.5;
    const candidates: Array<{ x: number; y: number }> = [];

    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        candidates.push({
          x: offsetX + (column + 0.5) * tileSize,
          y: top + (row + 0.5) * tileSize
        });
      }
    }
    candidates.sort(() => Math.random() - 0.5);

    return candidates.find(({ x, y }) => {
      const pickupBounds = { x: x - half, y: y - half, width: size, height: size };
      if (
        pickupBounds.x < margin
        || pickupBounds.x + size > dimensions.getWidth() - margin
        || pickupBounds.y < top
        || pickupBounds.y + size > bottom
        || this.intersects(pickupBounds.x, pickupBounds.y, size, size, base)
        || this.walls.some((wall) => this.intersects(pickupBounds.x, pickupBounds.y, size, size, wall))
      ) return false;

      const tanks = [this.player, ...this.enemies];
      return !tanks.some((tank) => tank.alive() && this.intersects(
        pickupBounds.x,
        pickupBounds.y,
        size,
        size,
        { x: tank.x() - tank.size * 0.5, y: tank.y() - tank.size * 0.5, width: tank.size, height: tank.size }
      ));
    });
  }

  /**
   * Activates a pooled projectile at the muzzle of its firing tank.
   * @private
   * @return {void}
   */
  private fire(
    tank: Tank,
    bullets: Bullet[],
    direction: Direction = tank.direction
  ): void {
    const bullet = bullets.find((candidate) => !candidate.active());
    if (!bullet) return;
    const offset = tank.size * 0.58;
    const x = tank.x() + (direction === 'left' ? -offset : direction === 'right' ? offset : 0);
    const y = tank.y() + (direction === 'up' ? -offset : direction === 'down' ? offset : 0);
    bullet.start(x, y, direction);
    GameLoader.playAudio('slide');
  }

  /**
   * Moves a tank candidate while keeping it inside arena boundaries.
   * @private
   * @return {void}
   */
  private movePosition(
    x: number,
    y: number,
    direction: Direction | undefined,
    distance: number,
    size = this.player.size
  ): { x: number; y: number } {
    const dimensions = GameContext.gameDimensionsModel;
    const half = size * 0.5;
    const { margin, top, bottom } = this.getArenaBounds();
    const minX = margin + half;
    const maxX = dimensions.getWidth() - margin - half;
    const minY = top + half;
    const maxY = bottom - half;
    if (direction === 'up') y -= distance;
    if (direction === 'down') y += distance;
    if (direction === 'left') x -= distance;
    if (direction === 'right') x += distance;
    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y))
    };
  }

  /**
   * Checks whether a tank-sized rectangle overlaps any arena wall.
   * @private
   * @return {boolean}
   */
  private collidesWithWalls(tank: Tank, x: number, y: number): boolean {
    const half = tank.size * 0.5;
    return this.walls.some((wall) => this.intersects(
      x - half,
      y - half,
      tank.size,
      tank.size,
      wall
    ));
  }

  /**
   * Tests a bullet against a tank's axis-aligned collision bounds.
   * @private
   * @return {boolean}
   */
  private intersectsTank(bullet: Bullet, tank: Tank): boolean {
    const half = tank.size * 0.5;
    const bulletBounds = bullet.bounds;
    return this.intersects(
      bulletBounds.x,
      bulletBounds.y,
      bulletBounds.width,
      bulletBounds.height,
      { x: tank.x() - half, y: tank.y() - half, width: tank.size, height: tank.size }
    );
  }

  /**
   * Tests two axis-aligned rectangles for overlap.
   * @private
   * @return {boolean} Whether the rectangles overlap.
   */
  private intersects(
    x: number,
    y: number,
    width: number,
    height: number,
    rect: Rect
  ): boolean {
    return (
      x < rect.x + rect.width
      && x + width > rect.x
      && y < rect.y + rect.height
      && y + height > rect.y
    );
  }

  /**
   * Builds the arena's cover layout once for the current game session.
   * @private
   * @return {void}
   */
  private createWalls(): void {
    const dimensions = GameContext.gameDimensionsModel;
    const { margin, top, bottom, tileSize } = this.getArenaBounds();
    const columns = Math.floor(
      (dimensions.getWidth() - margin * 2) / tileSize
    );
    const rows = Math.floor(
      (bottom - top) / tileSize
    );
    const startX = (
      dimensions.getWidth() - columns * tileSize
    ) * 0.5;

    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const isSpawnLane = row < 2;
        const isBaseLane = (
          row >= rows - 2
          && Math.abs(column - columns * 0.5) < 2.5
        );
        const isSideCorridor = column === 0 || column === columns - 1;

        if (
          isSpawnLane
          || isBaseLane
          || isSideCorridor
          || Math.random() > 0.27
        ) {
          continue;
        }

        this.walls.push({
          x: startX + column * tileSize,
          y: top + row * tileSize,
          width: tileSize - 3,
          height: tileSize - 3,
          health: Math.random() > 0.7 ? 1 : 2,
          destructible: Math.random() >= 0.22
        });
      }
    }

    let metalBlocks = this.walls.filter((wall) => !wall.destructible).length;
    if (metalBlocks < 3) {
      this.walls
        .filter((wall) => wall.destructible)
        .slice(0, 3 - metalBlocks)
        .forEach((wall) => {
          wall.destructible = false;
          metalBlocks += 1;
        });
    }
  }

  /**
   * Preallocates reusable player and enemy projectile pools.
   * @private
   * @return {void}
   */
  private createBullets(): void {
    for (let index = 0; index < 16; index++) this.playerBullets.push(new Bullet());
    for (let index = 0; index < 24; index++) this.enemyBullets.push(new Bullet());
  }

  /**
   * Creates the enemy group for the current wave.
   * @private
   * @return {void}
   */
  private createWave(): void {
    this.enemies.length = 0;
    const count = Math.min(3 + this.wave(), 6);
    const dimensions = GameContext.gameDimensionsModel;
    const { top } = this.getArenaBounds();
    const tankSize = this.getTankSize();
    for (let index = 0; index < count; index++) {
      this.enemies.push(
        new Tank(
          index % 2 === 0 ? 'eaglemorph' : 'beetlemorph',
          dimensions.getWidth() * (index + 1) / (count + 1),
          top + tankSize * 1.25,
          tankSize,
          1,
          index % 2 === 0 ? 'hunter' : 'ambusher'
        )
      );
    }
    this.enemySpawnCooldown.set(1);
  }

  /**
   * Adds a new enemy tank when the active group has room.
   * @private
   * @return {void}
   */
  private spawnEnemy(): void {
    const index = this.enemies.length;
    const dimensions = GameContext.gameDimensionsModel;
    const { top } = this.getArenaBounds();
    this.enemies.push(
      new Tank(
        index % 2 === 0 ? 'rhinomorph' : 'lobstermorph',
        dimensions.getWidth() * ((index % 6) + 1) / 7,
        top + this.getTankSize() * 1.25,
        this.getTankSize(),
        index % 2 === 0 ? 3 : 1,
        index % 2 === 0 ? 'guardian' : 'skirmisher'
      )
    );
  }

  /**
   * Returns the player tank to its base-side starting position.
   * @private
   * @return {void}
   */
  private resetPlayerPosition(): void {
    const dimensions = GameContext.gameDimensionsModel;
    const { bottom } = this.getArenaBounds();
    this.player.setPosition(
      dimensions.getWidth() * 0.5,
      bottom - this.player.size
    );
  }

  /**
   * Calculates the responsive square size shared by all tanks.
   * @private
   * @return {number}
   */
  private getTankSize(): number {
    return Math.max(26, Math.min(GameContext.viewportUnit() * 0.05, 52));
  }

  /**
   * Calculates playfield bounds while reserving space for HUD and controls.
   * @private
   * @return {void}
   */
  private getArenaBounds(): {
    margin: number;
    top: number;
    bottom: number;
    tileSize: number;
  } {
    const dimensions = GameContext.gameDimensionsModel;
    const unit = GameContext.viewportUnit();

    return {
      margin: Math.max(12, unit * 0.045),
      top: Math.max(50, unit * 0.14),
      bottom: dimensions.getHeight() - Math.max(
        34,
        unit * 0.08,
        GameContext.isMobileDevice ? this.touchControls.layout.reservedBottom + 12 : 0
      ),
      tileSize: Math.max(24, Math.min(unit * 0.05, 46))
    };
  }

  /**
   * Resets mission state, rebuilds the arena, and creates the first wave.
   * @protected
   * @return {void}
   */
  protected restartGame(): void {
    this.defeatedEnemies.set(0);
    this.lives.set(3);
    this.wave.set(1);
    this.gameOver.set(false);
    this.gameWon.set(false);
    this.nextLifePickupAt.set(5);
    this.lifePickup.set(undefined);
    this.damageCooldown.set(0);
    this.controls.hideEndActions();
    this.resetPlayerPosition();
    this.player.direction = 'up';
    this.playerBullets.forEach((bullet) => bullet.stop());
    this.enemyBullets.forEach((bullet) => bullet.stop());
    this.walls.length = 0;
    this.createWalls();
    this.createWave();
    GameLoader.playAudio('newgame');
  }

}
