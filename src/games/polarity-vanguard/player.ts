import GameContext from '../../engine/core/context';
import GameEvents from '../../engine/input/events';
import GameLoader from '../../engine/assets/loader';
import { AnimatedShipEntity } from '../../engine/entities/animated-ship-entity';
import Sprite from '../../engine/animations/sprites/sprite';

import type { Polarity } from './polarity';
import { oppositePolarity } from './polarity';

/**
 * Player ship with four-direction movement and switchable polarity.
 * @class PolarityVanguardPlayer
 */
export class PolarityVanguardPlayer extends AnimatedShipEntity {
  /**
   * Stores the polarity state.
   * @property {Polarity} polarity
   * @private
   */
  private polarity: Polarity = 'light';
  /**
   * Stores the polarity key was pressed state.
   * @property {boolean} polarityKeyWasPressed
   * @private
   */
  private polarityKeyWasPressed = false;
  /**
   * Stores the bottom margin state.
   * @property {number} bottomMargin
   * @private
   */
  private bottomMargin = 32;

  /**
   * Returns the polarity currently used to absorb or match projectiles.
   * @public
   * @return {Polarity}
   */
  public get currentPolarity(): Polarity {
    return this.polarity;
  }

  /**
   * Creates the ship sprites and initializes the player at the field bottom.
   * @public
   * @return {void}
   */
  public constructor(width = 84, height = 72) {
    const shipAtlas = GameLoader.getAtlas('player');
    const jetAtlas = GameLoader.getAtlas('player_jets');
    super(new Sprite(
      GameLoader.getImage('player'),
      width,
      height,
      0,
      0,
      0.5,
      0.5
    ), new Sprite(
      GameLoader.getImage('player_jets'),
      width,
      height,
      0,
      0,
      0.5,
      0.5
    ), jetAtlas.getAnimation('idle'));
    this.sprite.playAtlasClip(shipAtlas.getAnimation('all'));
    this.reset();
  }

  private updateSize(): void {
    const dimensions = GameContext.gameDimensionsModel;
    const unit = Math.min(dimensions.getWidth(), dimensions.getHeight());
    const scale = Math.max(0.5, Math.min(1, unit / 1000));
    const targetWidth = Math.round(84 * scale);
    const targetHeight = Math.round(72 * scale);
    if (this.width !== targetWidth || this.height !== targetHeight) {
      this.sprite.dimensions.setSize(targetWidth, targetHeight);
    }
  }

  /**
   * Restores polarity and places the player at its starting position.
   * @public
   * @return {void}
   */
  public reset(): void {
    this.updateSize();
    const dimensions = GameContext.gameDimensionsModel;
    this.setPosition(
      dimensions.getWidth() * 0.5,
      dimensions.getHeight() - this.height * 0.5 - this.bottomMargin
    );
    this.syncJetsToShip();
    this.polarity = 'light';
  }

  /**
   * Reserves space below the player for controls or interface elements.
   * @public
   * @return {void}
   */
  public setBottomMargin(margin: number): void {
    if (!Number.isFinite(margin) || margin < 0) {
      throw new RangeError('Bottom margin must be a finite non-negative number.');
    }

    this.bottomMargin = margin;
  }

  /**
   * Updates movement, engine animation, and edge-triggered polarity input.
   * @public
   * @return {void}
   */
  public update(deltaSeconds: number): void {
    this.updateSize();
    const dimensions = GameContext.gameDimensionsModel;
    const speed = 280;
    const horizontal = (
      Number(GameEvents.isKeyPressed('ArrowRight') || GameEvents.isKeyPressed('d'))
      - Number(GameEvents.isKeyPressed('ArrowLeft') || GameEvents.isKeyPressed('a'))
    );
    const vertical = (
      Number(GameEvents.isKeyPressed('ArrowDown') || GameEvents.isKeyPressed('s'))
      - Number(GameEvents.isKeyPressed('ArrowUp') || GameEvents.isKeyPressed('w'))
    );
    this.advanceMovement(
      deltaSeconds,
      horizontal * speed,
      vertical * speed
    );
    const x = Math.max(
      this.width * 0.5,
      Math.min(
        dimensions.getWidth() - this.width * 0.5,
        this.x
      )
    );
    const y = Math.max(
      dimensions.getHeight() * 0.45,
      Math.min(
        dimensions.getHeight() - this.height * 0.5 - this.bottomMargin,
        this.y
      )
    );
    this.updateSprite(deltaSeconds);
    this.updateJets(deltaSeconds);
    const polarityKeyPressed = (
      GameEvents.isKeyPressed('Shift')
      || GameEvents.isKeyPressed('c')
    );

    if (polarityKeyPressed && !this.polarityKeyWasPressed) {
      this.polarity = oppositePolarity(this.polarity);
    }

    this.polarityKeyWasPressed = polarityKeyPressed;
    this.setPosition(x, y);
    this.syncJetsToShip();
  }
}
