import { signalValue } from 'reactive-values';
import {
  GameContext,
  GameLoader,
  PhysicsBody,
  Sprite
} from '../../engine';

import type { Direction } from './interfaces/direction';
import type { Rect } from './interfaces/rect';

/**
 * Reusable directional tank projectile with animated sprite frames.
 * @class Bullet
 */
export class Bullet {
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
