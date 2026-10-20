import Sprite from '../../engine/animations/sprites/sprite';
import GameLoader from '../../engine/assets/loader';
import { Health } from '../../engine/core/health';
import { SpriteEntity } from '../../engine/entities/sprite-entity';
import { signalValue } from 'reactive-values';
import type { SignalValue } from 'reactive-values';

/**
 * Enemy sprite sheets supported by Space Hunters formations.
 */
export type EnemyKind = 'beetlemorph' | 'rhinomorph' | 'lobstermorph' | 'eaglemorph';

/**
 * A single invader with sheet-specific damage and destruction states.
 * @class Enemy
 */
export class Enemy extends SpriteEntity {
  /**
   * Remaining and maximum hit points for this enemy.
   * @property {Health} health
   * @private
   * @readonly
   */
  private readonly health: Health;
  /**
   * Whether the final destruction animation is currently playing.
   * @property {boolean} isImpacting
   * @private
   */
  private readonly isImpacting: SignalValue<boolean> = signalValue(false);
  /**
   * Variant row used when this enemy sheet has directional clips.
   * @property {number} atlasRow
   * @private
   * @readonly
   */
  private readonly atlasRow: number;
  /**
   * Sprite sheet that provides this enemy's animation frames.
   * @property {EnemyKind} imageName
   * @private
   * @readonly
   */
  private readonly imageName: EnemyKind;

  /**
   * Score awarded when this enemy is defeated.
   * @property {number} points
   * @public
   * @readonly
   */
  public readonly points: number;
  /**
   * Stores whether this enemy remains active in its formation.
   * @property {SignalValue<boolean>} alive
   * @private
   * @readonly
   */
  private readonly alive: SignalValue<boolean> = signalValue(true);

  /**
   * Reports whether this enemy remains active in the formation and can be drawn
   * or damaged by gameplay systems.
   * @property {boolean} isAlive
   * @public
   * @return {boolean} Whether the enemy is alive.
   */
  public get isAlive(): boolean {
    return this.alive();
  }

  /**
   * Reports whether the enemy's health has been depleted.
   * @public
   * @return {boolean}
   */
  public get isDefeated(): boolean {
    return this.health.isDepleted;
  }

  /**
   * Creates an invader with its selected sprite sheet and combat stats.
   * @param x - Horizontal position of the enemy.
   * @param y - Vertical position of the enemy.
   * @param atlasRow - Variant row for the eagle enemy atlas.
   * @param points - Score awarded on defeat.
   * @param maximumHealth - Number of hits required to defeat the enemy.
   * @param width - Rendered enemy width.
   * @param height - Rendered enemy height.
   * @param imageName - Sprite sheet defining the enemy's animation.
   * @public
   * @return {void}
   */
  constructor(
    x: number,
    y: number,
    atlasRow: number,
    points: number,
    maximumHealth = 1,
    width = 72,
    height = 64,
    imageName: EnemyKind = 'eaglemorph'
  ) {
    const atlas = GameLoader.getAtlas(imageName);
    const selectedRow = imageName === 'eaglemorph' ? atlasRow : 0;

    super(new Sprite(
      GameLoader.getImage(imageName),
      width,
      height,
      x,
      y
    ));
    this.atlasRow = selectedRow;
    this.imageName = imageName;
    this.points = points;
    this.health = new Health(maximumHealth);
    this.sprite.playAtlasClip(
      atlas.getAnimation(
        imageName === 'eaglemorph'
          ? `idle-row-${selectedRow}`
          : 'idle'
      )
    );
  }

  /**
   * Draws the enemy while it remains alive, including its death animation.
   * @public
   * @return {void}
   */
  public override draw(): void {
    if (this.isAlive) {
      this.sprite.draw();
    }
  }

  /**
   * Advances the idle or destruction animation and resolves its completion.
   * @param deltaSeconds - Elapsed seconds since the previous frame.
   * @public
   * @return {void}
   */
  public update(deltaSeconds: number): void {
    this.updateSprite(deltaSeconds);

    if (this.isImpacting() && !this.sprite.isAnimationPlaying) {
      this.isImpacting.set(false);
      this.alive.set(false);
    }
  }

  /**
   * Applies projectile damage and selects the matching damage or death art.
   * @param x - Left edge of the projectile.
   * @param y - Top edge of the projectile.
   * @param width - Projectile width.
   * @param height - Projectile height.
   * @public
   * @return {boolean} Whether the projectile overlapped the enemy.
   */
  public hit(
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    if (!this.isAlive || this.health.isDepleted) {
      return false;
    }

    const intersects = (
      x < this.dimensions.right()
      && x + width > this.dimensions.left()
      && y < this.dimensions.bottom()
      && y + height > this.dimensions.top()
    );

    if (!intersects) return false;

    const damage = this.health.receiveDamage();
    if (!damage.wasDamaged) return false;

    if (damage.isDepleted) {
      this.isImpacting.set(true);
      this.playDestructionAnimation();
    } else {
      this.showDamageState();
    }

    return true;
  }

  /**
   * Holds the visual damage stage for rhinos and progressively swollen lobsters.
   * @private
   * @return {void}
   */
  private showDamageState(): void {
    const atlas = GameLoader.getAtlas(this.imageName);
    const damageTaken = this.health.maximum - this.health.current;

    if (this.imageName === 'rhinomorph') {
      this.sprite.playAtlasClip(atlas.getAnimation('cracked'));
      return;
    }

    if (this.imageName === 'lobstermorph') {
      this.sprite.playAtlasClip(
        atlas.getAnimation(damageTaken === 1 ? 'swollen-1' : 'swollen-2')
      );
    }
  }

  /**
   * Starts the death frames using the orientation of the selected sprite sheet.
   * @private
   * @return {void}
   */
  private playDestructionAnimation(): void {
    const animationName = this.imageName === 'eaglemorph'
      ? `explosion-row-${this.atlasRow}`
      : 'explosion';
    this.sprite.playAtlasClip(
      GameLoader.getAtlas(this.imageName).getAnimation(animationName)
    );
  }
}
