/**
 * Allocation-free math helpers operating strictly on primitive numbers.
 * @class MathUtils
 */
export class MathUtils {
  /**
   * Degrees to radians conversion multiplier.
   * @property {number} DEG_TO_RAD
   * @public
   * @readonly
   */
  public static readonly DEG_TO_RAD = Math.PI / 180;

  /**
   * Radians to degrees conversion multiplier.
   * @property {number} RAD_TO_DEG
   * @public
   * @readonly
   */
  public static readonly RAD_TO_DEG = 180 / Math.PI;

  /**
   * Clamps numeric value to range.
   * @public
   * @return {number}
   */
  public static clamp(value: number, minimum: number, maximum: number): number {
    if (maximum < minimum) return minimum;
    return value < minimum ? minimum : value > maximum ? maximum : value;
  }

  /**
   * Hermite smooth-step interpolation.
   * @public
   * @return {number}
   */
  public static smoothStep(progress: number): number {
    const amount = MathUtils.clamp(progress, 0, 1);
    return amount * amount * (3 - 2 * amount);
  }

  /**
   * Linear interpolation between start and end.
   * @public
   * @return {number}
   */
  public static lerp(start: number, end: number, alpha: number): number {
    return start + (end - start) * alpha;
  }

  /**
   * Shortest-arc angular interpolation in degrees.
   * @public
   * @return {number}
   */
  public static lerpAngle(fromDeg: number, toDeg: number, alpha: number): number {
    let diff = (toDeg - fromDeg) % 360;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return fromDeg + diff * alpha;
  }

  /**
   * Shortest-arc angular interpolation in radians.
   * @public
   * @return {number}
   */
  public static lerpAngleRad(fromRad: number, toRad: number, alpha: number): number {
    const twoPi = Math.PI * 2;
    let diff = (toRad - fromRad) % twoPi;
    if (diff > Math.PI) diff -= twoPi;
    if (diff < -Math.PI) diff += twoPi;
    return fromRad + diff * alpha;
  }

  /**
   * Calculates the ratio of value between start and end.
   * @public
   * @return {number}
   */
  public static inverseLerp(start: number, end: number, value: number): number {
    if (start === end) return 0;
    return MathUtils.clamp((value - start) / (end - start), 0, 1);
  }

  /**
   * Converts degrees to radians.
   * @public
   * @return {number}
   */
  public static degToRad(degrees: number): number {
    return degrees * MathUtils.DEG_TO_RAD;
  }

  /**
   * Converts radians to degrees.
   * @public
   * @return {number}
   */
  public static radToDeg(radians: number): number {
    return radians * MathUtils.RAD_TO_DEG;
  }

  /**
   * Generates pseudo-random integer in range.
   * @public
   * @return {number}
   */
  public static randomRange(min: number, max: number): number {
    const floorMin = Math.ceil(min);
    const floorMax = Math.floor(max);
    return Math.floor(Math.random() * (floorMax - floorMin + 1)) + floorMin;
  }

  /**
   * Generates pseudo-random float in range.
   * @public
   * @return {number}
   */
  public static randomFloat(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  /**
   * Calculates squared Euclidean distance.
   * @public
   * @return {number}
   */
  public static distanceSquared(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
  }

  /**
   * Calculates Euclidean distance.
   * @public
   * @return {number}
   */
  public static distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.hypot(x2 - x1, y2 - y1);
  }

  /**
   * Calculates angle in radians between points.
   * @public
   * @return {number}
   */
  public static angleBetween(x1: number, y1: number, x2: number, y2: number): number {
    return Math.atan2(y2 - y1, x2 - x1);
  }

  /**
   * Compares two numbers for equality within tolerance.
   * @public
   * @return {boolean}
   */
  public static approximately(a: number, b: number, epsilon = 0.00001): boolean {
    return Math.abs(a - b) <= epsilon;
  }
}
