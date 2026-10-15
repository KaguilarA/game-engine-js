export interface DamageResult {
  /**
   * Whether this call reduced the current health.
   * @property {boolean} wasDamaged
   * @public
   */
  wasDamaged: boolean;
  /**
   * Whether no health remains after this call.
   * @property {boolean} isDepleted
   * @public
   */
  isDepleted: boolean;
}

/**
 * Stores shared entity hit points and applies finite, positive damage values.
 * @class Health
 */
export class Health {
  /**
   * Stores the maximum state.
   * @property {number} maximum
   * @public
   * @readonly
   */
  public readonly maximum: number;
  /**
   * Stores the current health state.
   * @property {number} currentHealth
   * @private
   */
  private currentHealth: number;

  /**
   * Returns the current hit points.
   * @public
   * @return {number}
   */
  public get current(): number {
    return this.currentHealth;
  }

  /**
   * Reports whether the current hit points are zero.
   * @public
   * @return {boolean}
   */
  public get isDepleted(): boolean {
    return this.currentHealth === 0;
  }

  /**
   * Creates a health pool with the requested positive integer capacity.
   * @public
   * @return {void}
   */
  constructor(maximum: number) {
    if (!Number.isInteger(maximum) || maximum <= 0) {
      throw new RangeError('Maximum health must be a positive integer.');
    }

    this.maximum = maximum;
    this.currentHealth = maximum;
  }

  /**
   * Applies damage and reports whether it changed or depleted health.
   * @public
   * @return {DamageResult}
   */
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

  /**
   * Restores the health pool to its configured maximum.
   * @public
   * @return {void}
   */
  public restore(): void {
    this.currentHealth = this.maximum;
  }
}
