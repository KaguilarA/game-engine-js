import { signalValue } from 'reactive-values';
import GameLoader from '../../engine/assets/loader';
import { PhysicsBody } from '../../engine/core/physics';
import Sprite from '../../engine/animations/sprites/sprite';
import type { Direction } from './interfaces/direction';
import type { EnemyBehavior } from './interfaces/enemy-behavior';

/**
 * Player or enemy tank with sprite animation, health, and combat timers.
 * @class Tank
 */
export class Tank {
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
  private readonly dyingState = signalValue(false);
  public get isDying(): boolean { return this.dyingState(); }
  public set isDying(value: boolean) { this.dyingState.set(value); }
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
