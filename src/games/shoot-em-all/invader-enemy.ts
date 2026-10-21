import GameLoader from '../../engine/assets/loader';
import Sprite from '../../engine/animations/sprites/sprite';
import { DamageableSpriteEntity } from '../../engine/entities/damageable-sprite-entity';

export type InvaderKind = 'beetlemorph' | 'rhinomorph' | 'lobstermorph';

/** Supplies Shoot ’Em All's alien art to the shared engine combat behavior. */
export class InvaderEnemy extends DamageableSpriteEntity {
  public constructor(
    x: number,
    y: number,
    points: number,
    maximumHealth: number,
    width: number,
    height: number,
    kind: InvaderKind
  ) {
    const atlas = GameLoader.getAtlas(kind);
    const sprite = new Sprite(GameLoader.getImage(kind), width, height, x, y);
    sprite.playAtlasClip(atlas.getAnimation('idle'));
    super(sprite, points, maximumHealth, {
      onDamaged: (damageTaken) => {
        if (kind === 'rhinomorph') {
          sprite.playAtlasClip(atlas.getAnimation('cracked'));
        } else if (kind === 'lobstermorph') {
          sprite.playAtlasClip(atlas.getAnimation(damageTaken === 1 ? 'swollen-1' : 'swollen-2'));
        }
      },
      onDefeated: () => sprite.playAtlasClip(atlas.getAnimation('explosion'))
    });
  }
}
