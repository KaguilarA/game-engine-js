import { GameLoader, SpriteEntity, Sprite } from '../../engine';

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
   * Variant row used to select idle and explosion clips from the atlas.
   * @property {number} atlasRow
   * @private
   * @readonly
   */
  private readonly atlasRow: number;
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
    const atlas = GameLoader.getAtlas('eaglemorph');
    const atlasRow = phase % 4;
    super(new Sprite(
      GameLoader.getImage('eaglemorph'),
      width,
      height,
      x,
      y,
      0.5,
      0.5
    ));
    this.polarity = polarity;
    this.phase = phase;
    this.atlasRow = atlasRow;
    this.sprite.playAtlasClip(atlas.getAnimation(`idle-row-${atlasRow}`));
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
    this.advanceMovement(
      deltaSeconds,
      Math.sin(this.elapsed * 2 + this.phase) * 48,
      20
    );
  }

  /**
   * Starts the death animation once, ignoring repeat defeat calls.
   * @public
   * @return {void}
   */
  public defeat(): void {
    if (!this.active || this.dying) return;
    this.dying = true;
    this.sprite.playAtlasClip(
      GameLoader.getAtlas('eaglemorph')
        .getAnimation(`explosion-row-${this.atlasRow}`)
    );
  }

  public override draw(): void {
    if (this.alive) {
      this.sprite.draw();
    }
  }
}
