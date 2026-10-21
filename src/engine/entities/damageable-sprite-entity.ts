import { signalValue } from 'reactive-values';

import { Health } from '../core/health';
import Sprite from '../animations/sprites/sprite';
import { SpriteEntity } from './sprite-entity';

export interface DamageableSpriteEntityOptions {
  onDamaged?: (damageTaken: number) => void;
  onDefeated?: () => void;
}

/** Shares health, hit testing, defeat timing, and animation lifecycle for sprite entities. */
export class DamageableSpriteEntity extends SpriteEntity {
  private readonly health: Health;
  public readonly points: number;
  private readonly options: DamageableSpriteEntityOptions;
  private readonly alive = signalValue(true);
  private readonly impacting = signalValue(false);

  public constructor(
    sprite: Sprite,
    points: number,
    maximumHealth = 1,
    options: DamageableSpriteEntityOptions = {}
  ) {
    super(sprite);
    this.points = points;
    this.health = new Health(maximumHealth);
    this.options = options;
  }

  public get isAlive(): boolean {
    return this.alive();
  }

  public get isDefeated(): boolean {
    return this.health.isDepleted;
  }

  public override draw(): void {
    if (this.isAlive) super.draw();
  }

  public update(deltaSeconds: number): void {
    this.updateSprite(deltaSeconds);
    if (this.impacting() && !this.spriteIsAnimating()) {
      this.impacting.set(false);
      this.alive.set(false);
    }
  }

  /** Applies one hit when the supplied rectangle overlaps this entity. */
  public hit(x: number, y: number, width: number, height: number): boolean {
    if (!this.isAlive || this.health.isDepleted) return false;

    const intersects = x < this.dimensions.right()
      && x + width > this.dimensions.left()
      && y < this.dimensions.bottom()
      && y + height > this.dimensions.top();
    if (!intersects) return false;

    const damage = this.health.receiveDamage();
    if (!damage.wasDamaged) return false;
    const damageTaken = this.health.maximum - this.health.current;
    if (damage.isDepleted) {
      this.impacting.set(true);
      this.options.onDefeated?.();
    } else {
      this.options.onDamaged?.(damageTaken);
    }
    return true;
  }

  private spriteIsAnimating(): boolean {
    return this.sprite.isAnimationPlaying;
  }
}
