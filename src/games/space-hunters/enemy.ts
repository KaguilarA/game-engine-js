import Sprite from '../../engine/animations/sprites/sprite';
import GameLoader from '../../engine/assets/loader';
import { DamageableSpriteEntity } from '../../engine/entities/damageable-sprite-entity';

/**
 * Enemy sprite sheets supported by Space Hunters formations.
 */
export type EnemyKind = 'beetlemorph' | 'rhinomorph' | 'lobstermorph' | 'eaglemorph';

/**
 * A single invader with sheet-specific damage and destruction states.
 * @class Enemy
 */
export class Enemy extends DamageableSpriteEntity {
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

    const sprite = new Sprite(
      GameLoader.getImage(imageName),
      width,
      height,
      x,
      y
    );
    sprite.playAtlasClip(atlas.getAnimation(
      imageName === 'eaglemorph' ? `idle-row-${selectedRow}` : 'idle'
    ));
    super(sprite, points, maximumHealth, {
      onDamaged: (damageTaken) => {
        const damageAnimation = imageName === 'rhinomorph'
          ? 'cracked'
          : imageName === 'lobstermorph'
            ? damageTaken === 1 ? 'swollen-1' : 'swollen-2'
            : undefined;
        if (damageAnimation) sprite.playAtlasClip(atlas.getAnimation(damageAnimation));
      },
      onDefeated: () => {
        const explosion = imageName === 'eaglemorph'
          ? `explosion-row-${selectedRow}`
          : 'explosion';
        sprite.playAtlasClip(atlas.getAnimation(explosion));
      }
    });
  }
}
