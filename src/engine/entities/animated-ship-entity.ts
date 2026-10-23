import { Sprite } from '../animations';
import type { AtlasAnimation } from '../interfaces';
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
   * @param jetAnimation Atlas clip for the engine-trail animation.
   * @return {void}
   */
  protected constructor(
    sprite: Sprite,
    jets: Sprite,
    jetAnimation: AtlasAnimation
  ) {
    super(sprite);
    this.jets = jets;
    this.jets.playAtlasClip(jetAnimation);
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
