import Sprite from '../../engine/sprite';
import GameLoader from '../../engine/loader';
import { Health } from '../../engine/health';
import { SpriteEntity } from '../../engine/sprite-entity';
import { getSpriteSheet } from '../../engine/sprite-sheets';

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
  private isImpacting = false;
  /**
   * Source row used by the selected enemy sheet.
   * @property {number} sourceY
   * @private
   * @readonly
   */
  private readonly sourceY: number;
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
   * Whether this enemy remains in the formation.
   * @property {boolean} isAlive
   * @public
   */
  public isAlive = true;

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
   * @param sourceY - Source row for the legacy eagle enemy sheet.
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
    sourceY: number,
    points: number,
    maximumHealth = 1,
    width = 72,
    height = 64,
    imageName: EnemyKind = 'eaglemorph'
  ) {
    const sheet = getSpriteSheet(imageName);
    const initialRow = imageName === 'eaglemorph' ? sourceY : 0;

    super(new Sprite(
      GameLoader.getImage(imageName),
      width,
      height,
      x,
      y,
      0,
      0,
      0,
      initialRow,
      sheet.frameWidth,
      sheet.frameHeight,
      sheet.animationFrames
    ));
    this.sourceY = initialRow;
    this.imageName = imageName;
    this.points = points;
    this.health = new Health(maximumHealth);
    this.sprite.playClip(
      0,
      initialRow,
      imageName === 'lobstermorph' ? 3 : sheet.animationFrames,
      7,
      true
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

    if (this.isImpacting && !this.sprite.isAnimationPlaying) {
      this.isImpacting = false;
      this.isAlive = false;
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
      this.isImpacting = true;
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
    const sheet = getSpriteSheet(this.imageName);
    const damageTaken = this.health.maximum - this.health.current;

    if (this.imageName === 'rhinomorph') {
      this.sprite.playClip(
        0,
        sheet.frameHeight * 2,
        sheet.animationFrames,
        7,
        true
      );
      return;
    }

    if (this.imageName === 'lobstermorph') {
      this.sprite.playClip(0, this.sourceY, sheet.animationFrames, 7, true);
      this.sprite.setFrame(Math.min(sheet.animationFrames - 1, damageTaken * 3));
    }
  }

  /**
   * Starts the death frames using the orientation of the selected sprite sheet.
   * @private
   * @return {void}
   */
  private playDestructionAnimation(): void {
    const sheet = getSpriteSheet(this.imageName);
    const explosionX = sheet.explosionX
      ?? sheet.frameWidth * sheet.animationFrames;

    if (this.imageName === 'beetlemorph' || this.imageName === 'rhinomorph') {
      this.sprite.playClip(
        explosionX,
        0,
        sheet.explosionFrames ?? sheet.rows,
        14,
        false,
        1
      );
      return;
    }

    this.sprite.playClip(
      explosionX,
      this.sourceY,
      sheet.explosionFrames ?? 5,
      14
    );
  }
}
