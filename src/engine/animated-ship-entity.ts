import Sprite from './sprite';
import { SpriteEntity } from './sprite-entity';

/**
 * Shares animated engine-trail behavior between player ships.
 * @class AnimatedShipEntity
 * @abstract
 */
export abstract class AnimatedShipEntity extends SpriteEntity {
  /**
   * Engine-trail sprite drawn behind the ship body.
   * @property {Sprite} jets
   * @private
   */
  private readonly jets: Sprite;

  /**
   * Creates a ship from its body sprite and animated engine-trail sprite.
   * @constructor
   * @protected
   * @param sprite Ship body sprite.
   * @param jets Animated engine-trail sprite.
   * @param jetFrameCount Number of frames in the engine-trail animation.
   * @param jetFrameRate Engine-trail animation speed in frames per second.
   * @return {void}
   */
  protected constructor(
    sprite: Sprite,
    jets: Sprite,
    jetFrameCount: number,
    jetFrameRate = 14
  ) {
    super(sprite);
    this.jets = jets;
    this.jets.playClip(0, 0, jetFrameCount, jetFrameRate, true);
  }

  /**
   * Advances the engine-trail animation by the frame delta.
   * @protected
   * @param deltaSeconds Time since the previous update, in seconds.
   * @return {void}
   */
  protected updateJets(deltaSeconds: number): void {
    this.jets.update(deltaSeconds);
  }

  /**
   * Places and sizes the engine trail over the ship's current bounds.
   * @protected
   * @return {void}
   */
  protected syncJetsToShip(): void {
    this.jets.dimensions.setSize(this.width, this.height);
    this.jets.dimensions.setPosition(this.x, this.y);
  }

  /**
   * Draws the animated engine trail before the ship body.
   * @public
   * @override
   * @return {void}
   */
  public override draw(): void {
    this.jets.draw();
    super.draw();
  }
}
