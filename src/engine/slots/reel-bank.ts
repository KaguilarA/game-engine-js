import { Reel } from './reel';
import { ReelIcon } from './reel-icon';
import { ReelAnimationProfile } from './reel-animation-profile';
import type { ReelSymbolVisual } from '../interfaces';

export interface ReelBankOptions {
  reelCount: number;
  rowCount: number;
  randomSymbol: () => string;
  spinSpeedMultiplier?: number;
  createVisual?: (reelIndex: number, iconIndex: number) => ReelSymbolVisual;
}

/** Shared slot reel collection: symbol strips, spin plans, fast stops, and settling. */
export class ReelBank {
  public readonly reels: Reel[];
  public readonly icons: ReelIcon[][];
  public readonly visuals: Array<Array<ReelSymbolVisual | undefined>>;
  private readonly rowCount: number;
  private readonly randomSymbol: () => string;
  private readonly spinSpeedMultiplier: number;

  public constructor(options: ReelBankOptions) {
    if (!Number.isInteger(options.reelCount) || options.reelCount < 1) {
      throw new RangeError('reelCount must be a positive integer.');
    }
    if (!Number.isInteger(options.rowCount) || options.rowCount < 1) {
      throw new RangeError('rowCount must be a positive integer.');
    }
    const speed = options.spinSpeedMultiplier ?? 1;
    if (!Number.isFinite(speed) || speed <= 0) {
      throw new RangeError('spinSpeedMultiplier must be a positive finite number.');
    }

    this.rowCount = options.rowCount;
    this.randomSymbol = options.randomSymbol;
    this.spinSpeedMultiplier = speed;
    const reelOptions = ReelAnimationProfile.createOptions(this.rowCount);
    this.reels = Array.from({ length: options.reelCount }, () => new Reel(
      this.randomColumn(), this.randomSymbol, reelOptions
    ));
    this.visuals = this.reels.map((_, reelIndex) => Array.from(
      { length: this.rowCount + 2 },
      (_unused, iconIndex) => options.createVisual?.(reelIndex, iconIndex)
    ));
    this.icons = this.reels.map((reel, reelIndex) => {
      const icons = this.visuals[reelIndex].map((visual) => {
        const icon = new ReelIcon(visual !== undefined);
        if (visual) icon.setPresentation(visual, 0, false);
        reel.add(icon);
        return icon;
      });
      return icons;
    });
  }

  public get isSettled(): boolean {
    return this.reels.every((reel) => !reel.isActive());
  }

  public update(deltaSeconds: number): boolean {
    this.reels.forEach((reel) => reel.update(deltaSeconds));
    return this.isSettled;
  }

  public startSpin(): void {
    this.reels.forEach((reel, index) => {
      const plan = ReelAnimationProfile.getSpinPlan(index);
      reel.startSpin(this.randomColumn(), plan.travelCells, plan.duration / this.spinSpeedMultiplier);
    });
  }

  public requestFastStop(): void {
    this.reels.forEach((reel) => reel.requestFastStop());
  }

  public reset(): void {
    this.reels.forEach((reel) => reel.reset(this.randomColumn()));
  }

  public getColumns(): string[][] {
    return this.reels.map((reel) => reel.symbols());
  }

  private randomColumn(): string[] {
    return Array.from({ length: this.rowCount }, this.randomSymbol);
  }
}
