import { signalValue } from 'reactive-values';

import GameContext from '../../engine/context';
import GameEvents from '../../engine/events';
import GameLoader from '../../engine/loader';
import { AnimatedShipEntity } from '../../engine/animated-ship-entity';
import { Health } from '../../engine/health';
import Sprite from '../../engine/sprite';

type PlayerAnimation = 'idle' | 'moving' | 'shooting';

/**
 * Player ship with horizontal movement, animated firing, and two-hit health.
 * @class Player
 */
export class Player extends AnimatedShipEntity {
  /**
   * Current horizontal movement speed in canvas pixels per second.
   * @property {Signal} speed
   * @public
   * @readonly
   */
  public readonly speed = signalValue(0);
  /**
   * Stores the health state.
   * @property {Health} health
   * @private
   * @readonly
   */
  private readonly health = new Health(2);
  /**
   * Stores the animation state.
   * @property {PlayerAnimation} animation
   * @private
   */
  private animation: PlayerAnimation = 'idle';
  /**
   * Stores the bottom margin state.
   * @property {number} bottomMargin
   * @private
   */
  private bottomMargin = 40;
  /**
   * Stores the shooting time state.
   * @property {number} shootingTime
   * @private
   */
  private shootingTime = 0;

  /**
   * Creates the player ship and its animated engine trail.
   * @public
   * @return {void}
   */
  constructor(width = 70, height = 50) {
    const shipAtlas = GameLoader.getAtlas('player');
    const jetAtlas = GameLoader.getAtlas('player_jets');
    super(new Sprite(
      GameLoader.getImage('player'),
      width,
      height,
      0,
      0
    ), new Sprite(
      GameLoader.getImage('player_jets'),
      width,
      height,
      0,
      0
    ), jetAtlas.getAnimation('idle'));
    this.sprite.playAtlasClip(shipAtlas.getAnimation('idle'));
    const gameDimensions = GameContext.gameDimensionsModel;

    this.setPosition(
      (gameDimensions.getWidth() - this.width) * 0.5,
      gameDimensions.getHeight() - this.height - this.bottomMargin
    );
    this.syncJetsToShip();
  }

  /**
   * Reserves space below the player for controls or other interface elements.
   */
  public setBottomMargin(margin: number): void {
    if (!Number.isFinite(margin) || margin < 0) {
      throw new RangeError('Bottom margin must be a finite non-negative number.');
    }

    this.bottomMargin = margin;
  }

  private updateLayout(): void {
    const gameDimensions = GameContext.gameDimensionsModel;
    const unit = Math.min(gameDimensions.getWidth(), gameDimensions.getHeight());
    const scale = Math.max(0.5, Math.min(1, unit / 1080));
    const targetWidth = Math.round(70 * scale);
    const targetHeight = Math.round(50 * scale);
    if (this.width !== targetWidth || this.height !== targetHeight) {
      this.sprite.dimensions.setSize(targetWidth, targetHeight);
    }

    const maxX = Math.max(
      0,
      gameDimensions.getWidth() - this.width
    );

    this.setPosition(
      Math.max(0, Math.min(this.x, maxX)),
      gameDimensions.getHeight() - this.height - this.bottomMargin
    );
    this.syncJetsToShip();
  }

  /**
   * Updates movement, animation, and the temporary shooting pose.
   * @public
   * @return {void}
   */
  public update(deltaSeconds: number): void {
    this.shootingTime = Math.max(0, this.shootingTime - deltaSeconds);
    this.updateLayout();
    this.updateSpeed();
    this.updateAnimation(deltaSeconds);
    this.updateJets(deltaSeconds);
    this.updatePosition(deltaSeconds);
  }

  /**
   * Displays the shooting animation for a short interval.
   * @public
   * @return {void}
   */
  public shoot(): void {
    this.shootingTime = 0.2;
  }

  /**
   * Applies one projectile impact and reports whether one player life was lost.
   */
  public takeDamage(): boolean {
    const damage = this.health.receiveDamage();

    if (!damage.isDepleted) return false;

    this.health.restore();
    return true;
  }

  /**
   * Restores both hit points after losing a life.
   * @public
   * @return {void}
   */
  public restoreHealth(): void {
    this.health.restore();
  }

  private updateAnimation(deltaSeconds: number): void {
    const nextAnimation: PlayerAnimation = this.shootingTime > 0
      ? 'shooting'
      : this.speed() !== 0
        ? 'moving'
        : 'idle';

    if (
      nextAnimation !== this.animation
      || (
        nextAnimation === 'shooting'
        && !this.sprite.isAnimationPlaying
      )
    ) {
      this.animation = nextAnimation;
      this.sprite.playAtlasClip(
        GameLoader.getAtlas('player').getAnimation(nextAnimation)
      );
    }

    this.sprite.update(deltaSeconds);
  }

  private updateSpeed(): void {
    if (GameEvents.isKeyPressed('ArrowLeft')) {
      this.speed.set(-240);
      return;
    }

    if (GameEvents.isKeyPressed('ArrowRight')) {
      this.speed.set(240);
      return;
    }

    this.speed.set(0);
  }

  private updatePosition(deltaSeconds: number): void {
    this.advanceMovement(deltaSeconds, this.speed(), 0);
    const maxX = GameContext.gameDimensionsModel.getWidth() - this.width;
    this.setPosition(Math.max(0, Math.min(this.x, maxX)), this.y);
  }
}
