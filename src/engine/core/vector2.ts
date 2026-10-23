/**
 * High-performance 2D vector with mutable in-place operations.
 * @class Vector2
 */
export default class Vector2 {
  /**
   * Stores the horizontal component.
   * @property {number} x
   * @public
   */
  public x: number;

  /**
   * Stores the vertical component.
   * @property {number} y
   * @public
   */
  public y: number;

  /**
   * Scratch instance 1 for temporary calculations.
   * @property {Vector2} scratch1
   * @public
   * @readonly
   */
  public static readonly scratch1 = new Vector2(0, 0);

  /**
   * Scratch instance 2 for temporary calculations.
   * @property {Vector2} scratch2
   * @public
   * @readonly
   */
  public static readonly scratch2 = new Vector2(0, 0);

  /**
   * Scratch instance 3 for temporary calculations.
   * @property {Vector2} scratch3
   * @public
   * @readonly
   */
  public static readonly scratch3 = new Vector2(0, 0);

  /**
   * Creates a vector with initial components.
   * @public
   * @return {void}
   */
  public constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  /**
   * Sets components in-place.
   * @public
   * @return {this}
   */
  public set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  /**
   * Copies components from another vector.
   * @public
   * @return {this}
   */
  public copy(source: Vector2): this {
    this.x = source.x;
    this.y = source.y;
    return this;
  }

  /**
   * Resets components to zero.
   * @public
   * @return {this}
   */
  public reset(): this {
    this.x = 0;
    this.y = 0;
    return this;
  }

  /**
   * Adds another vector in-place.
   * @public
   * @return {this}
   */
  public add(v: Vector2): this {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  /**
   * Adds scalar values directly in-place.
   * @public
   * @return {this}
   */
  public addValues(x: number, y: number): this {
    this.x += x;
    this.y += y;
    return this;
  }

  /**
   * Adds another vector scaled by factor in-place.
   * @public
   * @return {this}
   */
  public addScaled(v: Vector2, scalar: number): this {
    this.x += v.x * scalar;
    this.y += v.y * scalar;
    return this;
  }

  /**
   * Subtracts another vector in-place.
   * @public
   * @return {this}
   */
  public sub(v: Vector2): this {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  /**
   * Scales vector components by factor in-place.
   * @public
   * @return {this}
   */
  public scale(scalar: number): this {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  /**
   * Divides vector components by factor in-place.
   * @public
   * @return {this}
   */
  public divide(scalar: number): this {
    if (scalar !== 0) {
      this.x /= scalar;
      this.y /= scalar;
    }
    return this;
  }

  /**
   * Calculates dot product with target vector.
   * @public
   * @return {number}
   */
  public dot(v: Vector2): number {
    return this.x * v.x + this.y * v.y;
  }

  /**
   * Calculates 2D cross product with target vector.
   * @public
   * @return {number}
   */
  public cross(v: Vector2): number {
    return this.x * v.y - this.y * v.x;
  }

  /**
   * Calculates squared length of vector.
   * @public
   * @return {number}
   */
  public lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  /**
   * Calculates magnitude length of vector.
   * @public
   * @return {number}
   */
  public length(): number {
    return Math.hypot(this.x, this.y);
  }

  /**
   * Normalizes vector to unit length in-place.
   * @public
   * @return {this}
   */
  public normalize(): this {
    const len = this.length();
    if (len > 0) {
      this.x /= len;
      this.y /= len;
    }
    return this;
  }

  /**
   * Calculates squared distance to target vector.
   * @public
   * @return {number}
   */
  public distanceToSquared(v: Vector2): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return dx * dx + dy * dy;
  }

  /**
   * Calculates Euclidean distance to target vector.
   * @public
   * @return {number}
   */
  public distanceTo(v: Vector2): number {
    return Math.hypot(this.x - v.x, this.y - v.y);
  }

  /**
   * Linearly interpolates toward target vector in-place.
   * @public
   * @return {this}
   */
  public lerp(target: Vector2, alpha: number): this {
    this.x += (target.x - this.x) * alpha;
    this.y += (target.y - this.y) * alpha;
    return this;
  }

  /**
   * Rotates vector by radians in-place.
   * @public
   * @return {this}
   */
  public rotate(radians: number): this {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const newX = this.x * cos - this.y * sin;
    const newY = this.x * sin + this.y * cos;
    this.x = newX;
    this.y = newY;
    return this;
  }

  /**
   * Creates an independent copy of this vector.
   * @public
   * @return {Vector2}
   */
  public clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }
}
