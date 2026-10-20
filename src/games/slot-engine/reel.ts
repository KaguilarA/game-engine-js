import { computedValue, signalValue } from 'reactive-values';
import type { ComputedValue, SignalValue } from 'reactive-values';
import type { ReelOptions } from './interfaces/reel-options';
import type { VisibleReelSymbol } from './interfaces/visible-reel-symbol';

type ReelPhase = 'idle' | 'anticipation' | 'spinning' | 'bounce';

/** Owns a single reel's outcome, strip, anticipation, spin, and settling motion. */
export class Reel {
  private readonly target: SignalValue<string[]> = signalValue<string[]>([]);
  private readonly anticipationTail: SignalValue<string> = signalValue('');
  private readonly phase: SignalValue<ReelPhase> = signalValue<ReelPhase>('idle');
  private readonly phaseElapsed: SignalValue<number> = signalValue(0);
  private readonly spinDuration: SignalValue<number> = signalValue(0);
  private readonly spinStrip: SignalValue<string[]> = signalValue<string[]>([]);
  private readonly travelCells: SignalValue<number> = signalValue(0);
  private readonly startDistance: SignalValue<number> = signalValue(0);
  private readonly targetOffset: SignalValue<number> = signalValue(0);
  private readonly distanceCells: SignalValue<number> = signalValue(0);
  private readonly anticipationDuration: number;
  private readonly anticipationLiftCells: number;
  private readonly bounceDuration: number;
  private readonly accelerationShare: number;
  private readonly brakingShare: number;
  public readonly symbols: SignalValue<string[]>;
  public readonly isActive: ComputedValue<boolean>;
  private readonly randomSymbol: () => string;
  private readonly options: ReelOptions;

  public constructor(
    symbols: string[],
    randomSymbol: () => string,
    options: ReelOptions
  ) {
    this.symbols = signalValue(symbols);
    this.randomSymbol = randomSymbol;
    this.options = options;
    this.anticipationDuration = options.anticipationDuration ?? 0.16;
    this.anticipationLiftCells = options.anticipationLiftCells ?? 0.5;
    this.bounceDuration = options.bounceDuration ?? 0.34;
    this.accelerationShare = options.accelerationShare ?? 0.14;
    this.brakingShare = options.brakingShare ?? 0.3;
    this.isActive = computedValue(
      () => this.phase() !== 'idle',
      [this.phase]
    );
  }

  public get rowCount(): number {
    return this.options.rowCount;
  }

  /** Starts a new spin with a supplied result and movement duration. */
  public startSpin(target: string[], travelCells: number, duration: number): void {
    this.target.set([...target]);
    this.spinDuration.set(duration);
    const prelude = Array.from({ length: this.rowCount }, this.randomSymbol);
    const middle = Array.from(
      { length: Math.max(0, travelCells - this.rowCount) },
      this.randomSymbol
    );
    this.anticipationTail.set(this.randomSymbol());
    this.spinStrip.set([
      ...prelude,
      ...this.target(),
      ...middle,
      ...this.symbols(),
      this.anticipationTail()
    ]);
    this.targetOffset.set(prelude.length);
    this.startDistance.set(this.targetOffset() + this.rowCount + middle.length);
    this.travelCells.set(this.startDistance()
      + this.anticipationLiftCells
      - this.targetOffset());
    this.distanceCells.set(this.startDistance());
    this.phase.set('anticipation');
    this.phaseElapsed.set(0);
  }

  /** Advances the current phase and fixes the result when the reel settles. */
  public update(deltaSeconds: number): void {
    if (!this.isActive()) return;
    this.phaseElapsed.set(this.phaseElapsed() + deltaSeconds);

    if (this.phase() === 'anticipation') {
      if (this.phaseElapsed() >= this.anticipationDuration) {
        this.distanceCells.set(this.startDistance() + this.anticipationLiftCells);
        this.phase.set('spinning');
        this.phaseElapsed.set(0);
      }
      return;
    }

    if (this.phase() === 'spinning') {
      const progress = Math.min(this.phaseElapsed() / this.spinDuration(), 1);
      this.distanceCells.set(this.startDistance()
        + this.anticipationLiftCells
        - this.travelCells() * this.getSpinProgress(progress));
      if (progress >= 1) {
        this.phase.set('bounce');
        this.phaseElapsed.set(0);
      }
      return;
    }

    if (this.phaseElapsed() >= this.bounceDuration) {
      this.phase.set('idle');
      this.symbols.set(this.target());
      this.distanceCells.set(this.targetOffset());
    }
  }

  /** Returns all symbols currently crossing the clipped reel window. */
  public getVisibleSymbols(): VisibleReelSymbol[] {
    const phase = this.phase();
    if (phase === 'spinning' || phase === 'bounce') {
      const bounceOffset = phase === 'bounce'
        ? 0.055 * Math.exp(-9 * this.phaseElapsed()) * Math.cos(22 * this.phaseElapsed())
        : 0;
      const distance = this.distanceCells() - bounceOffset;
      const firstCell = Math.floor(distance);
      const blurred = phase === 'spinning'
        && this.phaseElapsed() / this.spinDuration() < 1 - this.brakingShare;
      const visible: VisibleReelSymbol[] = [];

      for (let index = firstCell - 1; index <= firstCell + this.rowCount; index++) {
        const symbol = this.spinStrip()[index];
        if (!symbol) continue;
        visible.push({
          symbol,
          row: index - this.targetOffset(),
          offsetCells: index - distance + 0.5,
          blurred
        });
      }
      return visible;
    }

    const anticipation = phase === 'anticipation'
      ? this.getAnticipationProgress(this.phaseElapsed() / this.anticipationDuration)
        * this.anticipationLiftCells
      : 0;
    const visible = this.symbols().map((symbol, row) => ({
      symbol,
      row,
      offsetCells: row + 0.5 - anticipation,
      blurred: false
    }));

    if (phase === 'anticipation') {
      visible.push({
        symbol: this.anticipationTail(),
        row: this.rowCount,
        offsetCells: this.rowCount + 0.5 - anticipation,
        blurred: false
      });
    }
    return visible;
  }

  /** Cancels motion and installs a fresh visible column. */
  public reset(symbols: string[]): void {
    this.symbols.set([...symbols]);
    this.target.set([]);
    this.phase.set('idle');
    this.phaseElapsed.set(0);
    this.startDistance.set(0);
    this.targetOffset.set(0);
    this.distanceCells.set(0);
    this.spinStrip.set([]);
  }

  private getSpinProgress(progress: number): number {
    const brakingStart = 1 - this.brakingShare;
    const cruiseShare = brakingStart - this.accelerationShare;
    const totalDistance = this.accelerationShare * 0.5
      + cruiseShare
      + this.brakingShare * 0.5;

    if (progress < this.accelerationShare) {
      const ramp = progress / this.accelerationShare;
      const acceleratedDistance = this.accelerationShare
        * (ramp ** 3 - 0.5 * ramp ** 4);
      return acceleratedDistance / totalDistance;
    }
    if (progress < brakingStart) {
      return (this.accelerationShare * 0.5 + progress - this.accelerationShare)
        / totalDistance;
    }

    const brake = (progress - brakingStart) / this.brakingShare;
    const brakingDistance = this.brakingShare
      * (brake - brake ** 3 + 0.5 * brake ** 4);
    return (this.accelerationShare * 0.5 + cruiseShare + brakingDistance)
      / totalDistance;
  }

  private getAnticipationProgress(progress: number): number {
    const clamped = Math.max(0, Math.min(progress, 1));
    return clamped * clamped * (3 - 2 * clamped);
  }
}

