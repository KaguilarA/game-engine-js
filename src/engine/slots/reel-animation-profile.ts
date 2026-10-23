import type { ReelOptions } from '../interfaces';

/** Shared anticipation, acceleration, braking, and stop timing for slot reels. */
export class ReelAnimationProfile {
  public static createOptions(rowCount: number): ReelOptions {
    return {
      rowCount,
      anticipationDuration: 0.16,
      anticipationLiftCells: 0.5,
      bounceDuration: 0.34,
      accelerationShare: 0.14,
      brakingShare: 0.3
    };
  }

  public static getSpinPlan(reelIndex: number): { travelCells: number; duration: number } {
    if (!Number.isInteger(reelIndex) || reelIndex < 0) {
      throw new RangeError('Reel index must be a non-negative integer.');
    }
    return {
      travelCells: 18 + reelIndex * 3,
      duration: 1.55 + reelIndex * 0.23
    };
  }
}
