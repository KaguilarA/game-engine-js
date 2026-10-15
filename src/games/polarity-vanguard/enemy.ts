import GameLoader from '../../engine/loader';
import Sprite from '../../engine/sprite';
import { SpriteEntity } from '../../engine/sprite-entity';
import { getSpriteSheet } from '../../engine/sprite-sheets';

import type { Polarity } from './polarity';

/**
 * Formation enemy that drifts downward and plays a death animation.
 * @class PolarityVanguardEnemy
 */
export class PolarityVanguardEnemy extends SpriteEntity {
  /**
   * Stores the phase state.
   * @property {number} phase
   * @private
   * @readonly
   */
  private readonly phase: number;
  /**
   * Stores the source y state.
   * @property {number} sourceY
   * @private
   * @readonly
   */
  private readonly sourceY: number;
  /**
   * Stores the elapsed state.
   * @property {number} elapsed
   * @private
   */
  private elapsed = 0;
  /**
   * Stores the active state.
   * @property {boolean} active
   * @private
   */
  private active = true;
  /**
   * Stores the dying state.
   * @property {boolean} dying
   * @private
   */
  private dying = false;

  /**
   * Reports whether the enemy can still be hit or scored.
   * @public
   * @return {boolean}
   */
  public get alive(): boolean {
    return this.active;
  }

  /**
   * Creates an enemy with a phase-specific row and gameplay polarity.
   * @public
   * @return {void}
   */
  public constructor(
    x: number,
    y: number,
    polarity: Polarity,
    phase: number,
    width = 72,
    height = 64
  ) {
    const sheet = getSpriteSheet('eaglemorph');
    const sourceY = (phase % sheet.rows) * sheet.frameHeight;
    super(new Sprite(
      GameLoader.getImage('eaglemorph'),
      width,
      height,
      x,
      y,
      0.5,
      0.5,
      0,
      sourceY,
      sheet.frameWidth,
      sheet.frameHeight,
      sheet.animationFrames
    ));
    this.polarity = polarity;
    this.phase = phase;
    this.sourceY = sourceY;
    this.sprite.playClip(0, sourceY, sheet.animationFrames, 8, true);
  }

  /**
   * Stores the polarity state.
   * @property {Polarity} polarity
   * @public
   * @readonly
   */
  public readonly polarity: Polarity;

  /**
   * Updates enemy movement and marks it inactive after death animation.
   * @public
   * @return {void}
   */
  public update(deltaSeconds: number): void {
    this.updateSprite(deltaSeconds);
    if (this.dying) {
      if (!this.sprite.isAnimationPlaying) {
        this.active = false;
        this.dying = false;
      }
      return;
    }

    this.elapsed += deltaSeconds;
    this.sprite.dimensions.setPosition(
      this.x + Math.sin(this.elapsed * 2 + this.phase) * 48 * deltaSeconds,
      this.y + 20 * deltaSeconds
    );
  }

  /**
   * Starts the death animation once, ignoring repeat defeat calls.
   * @public
   * @return {void}
   */
  public defeat(): void {
    if (!this.active || this.dying) return;
    const sheet = getSpriteSheet('eaglemorph');
    this.dying = true;
    this.sprite.playClip(
      sheet.explosionX ?? 320,
      this.sourceY,
      sheet.explosionFrames ?? 5,
      14
    );
  }

  public override draw(): void {
    if (this.alive) {
      this.sprite.draw();
    }
  }
}
