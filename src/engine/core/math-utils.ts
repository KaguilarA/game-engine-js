/** Small, allocation-free math helpers shared by the engine and games. */
export class MathUtils {
  public static clamp(value: number, minimum: number, maximum: number): number {
    if (maximum < minimum) return minimum;
    return value < minimum ? minimum : value > maximum ? maximum : value;
  }

  public static smoothStep(progress: number): number {
    const amount = MathUtils.clamp(progress, 0, 1);
    return amount * amount * (3 - 2 * amount);
  }
}
