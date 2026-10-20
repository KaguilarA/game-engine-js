import Sprite from '../animations/sprites/sprite';
import { PhysicsBody } from '../core/physics';

/**
 * Shared position, size, animation, and drawing behavior for sprite entities.
 * @class SpriteEntity
 * @abstract
 */
export abstract class SpriteEntity {
  /**
   * Stores the sprite state.
   * @property {Sprite} sprite
   * @protected
   * @readonly
   */
  protected readonly sprite: Sprite;
  /**
   * Shared position, velocity, and acceleration for this entity.
   * @property {PhysicsBody} physics
   * @protected
   * @readonly
   */
  protected readonly physics: PhysicsBody;

  /**
   * Wraps a sprite so subclasses can use entity-level geometry helpers.
   * @protected
   * @return {void}
   */
  protected constructor(sprite: Sprite) {
    this.sprite = sprite;
    this.physics = new PhysicsBody(
      sprite.dimensions.getX(),
      sprite.dimensions.getY()
    );
  }

  /**
   * Returns the sprite's horizontal position.
   * @public
   * @return {number}
   */
  public get x(): number {
    return this.sprite.dimensions.getX();
  }

  /**
   * Returns the sprite's vertical position.
   * @public
   * @return {number}
   */
  public get y(): number {
    return this.sprite.dimensions.getY();
  }

  /**
   * Returns the sprite's rendered width.
   * @public
   * @return {number}
   */
  public get width(): number {
    return this.sprite.dimensions.getWidth();
  }

  /**
   * Returns the sprite's rendered height.
   * @public
   * @return {number}
   */
  public get height(): number {
    return this.sprite.dimensions.getHeight();
  }

  /**
   * Exposes the dimensions model for bounds and scale calculations.
   * @public
   * @return {Dimensions} The dimensions model used by this sprite.
   */
  public get dimensions() {
    return this.sprite.dimensions;
  }

  /**
   * Sets the sprite's position according to its pivot.
   * @public
   * @return {void}
   * @param x - The horizontal pivot position.
   * @param y - The vertical pivot position.
   */
  public setPosition(x: number, y: number): void {
    this.physics.setPosition(x, y);
    this.sprite.dimensions.setPosition(x, y);
  }

  /**
   * Sets the rendered dimensions of the sprite.
   * @public
   * @return {void}
   * @param width - The unscaled width.
   * @param height - The unscaled height.
   */
  public setSize(width: number, height: number): void {
    this.sprite.dimensions.setSize(width, height);
  }

  /**
   * Moves the sprite by a relative offset.
   * @public
   * @return {void}
   * @param x - The horizontal displacement.
   * @param y - The vertical displacement.
   */
  public moveBy(x: number, y: number): void {
    this.physics.translate(x, y);
    this.syncPhysicsPosition();
  }

  /**
   * Sets a frame velocity, advances the body, and updates the sprite position.
   * @param deltaSeconds - Elapsed time since the previous frame.
   * @param velocityX - Horizontal velocity in world units per second.
   * @param velocityY - Vertical velocity in world units per second.
   * @param verticalAcceleration - Optional vertical acceleration override.
   * @public
   * @return {void}
   */
  public advanceMovement(
    deltaSeconds: number,
    velocityX: number,
    velocityY: number,
    verticalAcceleration?: number
  ): void {
    this.physics.setVelocity(velocityX, velocityY);
    this.physics.update(deltaSeconds, verticalAcceleration);
    this.syncPhysicsPosition();
  }

  /**
   * Sets the entity's velocity for the next physics step.
   * @param x - Horizontal velocity in world units per second.
   * @param y - Vertical velocity in world units per second.
   * @protected
   * @return {void}
   */
  protected setVelocity(x: number, y: number): void {
    this.physics.setVelocity(x, y);
  }

  /**
   * Advances physics and synchronizes the sprite to the resulting position.
   * @param deltaSeconds - Elapsed time since the previous frame.
   * @param verticalAcceleration - Optional vertical acceleration override.
   * @protected
   * @return {void}
   */
  protected updatePhysics(deltaSeconds: number, verticalAcceleration?: number): void {
    this.physics.update(deltaSeconds, verticalAcceleration);
    this.syncPhysicsPosition();
  }

  /** Synchronizes the wrapped sprite to the physics body's position. */
  private syncPhysicsPosition(): void {
    this.sprite.dimensions.setPosition(this.physics.x(), this.physics.y());
  }

  /**
   * Draws the sprite, optionally rotating it around its pivot.
   * @public
   * @return {void}
   * @param rotation - The rotation in radians.
   */
  public draw(rotation = 0): void {
    this.sprite.draw(rotation);
  }

  /**
   * Advances the wrapped sprite's animation.
   * @protected
   * @return {void}
   * @param deltaSeconds - The elapsed time since the previous update.
   */
  protected updateSprite(deltaSeconds: number): void {
    this.sprite.update(deltaSeconds);
  }
}
