export interface DamageResult {
  wasDamaged: boolean;
  isDepleted: boolean;
}

/**
 * Stores an entity's hit points and applies finite, positive damage values.
 */
export class Health {
  public readonly maximum: number;
  private currentHealth: number;

  public get current(): number {
    return this.currentHealth;
  }

  public get isDepleted(): boolean {
    return this.currentHealth === 0;
  }

  constructor(maximum: number) {
    if (!Number.isInteger(maximum) || maximum <= 0) {
      throw new RangeError('Maximum health must be a positive integer.');
    }

    this.maximum = maximum;
    this.currentHealth = maximum;
  }

  public receiveDamage(amount = 1): DamageResult {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new RangeError('Damage must be a positive finite number.');
    }

    if (this.isDepleted) {
      return {
        wasDamaged: false,
        isDepleted: true
      };
    }

    this.currentHealth = Math.max(0, this.currentHealth - amount);

    return {
      wasDamaged: true,
      isDepleted: this.isDepleted
    };
  }

  public restore(): void {
    this.currentHealth = this.maximum;
  }
}
