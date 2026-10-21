import { signalValue } from 'reactive-values';
import type { SignalValue } from 'reactive-values';
import { ReelBank } from '../../engine/slots/reel-bank';
import { evaluatePaylines } from './paylines';
import type { MusketeersSlotAssets } from './assets';

export const MUSKETEERS_REEL_COUNT = 5;
export const MUSKETEERS_ROW_COUNT = 3;

/** Owns round state and spin transitions independently from game presentation. */
export class MusketeersSlotRound {
  public readonly balance: SignalValue<number> = signalValue(1000);
  public readonly bet: SignalValue<number> = signalValue(10);
  public readonly win: SignalValue<number> = signalValue(0);
  public readonly freeSpins: SignalValue<number> = signalValue(0);
  public readonly spinning: SignalValue<boolean> = signalValue(false);
  public readonly stopRequested: SignalValue<boolean> = signalValue(false);
  public readonly winningCells: SignalValue<ReadonlySet<string>> = signalValue<ReadonlySet<string>>(new Set<string>());
  public readonly reelBank: ReelBank;
  private readonly symbols: string[];
  private readonly assets: MusketeersSlotAssets;

  public constructor(assets: MusketeersSlotAssets) {
    this.assets = assets;
    this.symbols = Array.from(assets.symbols.keys());
    this.reelBank = new ReelBank({
      reelCount: MUSKETEERS_REEL_COUNT,
      rowCount: MUSKETEERS_ROW_COUNT,
      randomSymbol: () => this.randomSymbol(),
      spinSpeedMultiplier: 1.5
    });
  }

  public update(deltaSeconds: number): void {
    const settled = this.reelBank.update(deltaSeconds);
    this.assets.symbols.forEach((icon) => icon.update(deltaSeconds));
    if (this.spinning() && settled) this.resolveSpin();
  }

  public restart(): void {
    this.balance.set(1000);
    this.bet.set(10);
    this.win.set(0);
    this.freeSpins.set(0);
    this.spinning.set(false);
    this.stopRequested.set(false);
    this.winningCells.set(new Set());
    this.assets.symbols.forEach((icon) => icon.resetWinAnimation());
    this.reelBank.reset();
  }

  public spin(): void {
    if (this.spinning()) {
      this.stopSpinQuickly();
      return;
    }
    if (this.balance() < this.bet() && this.freeSpins() === 0) return;
    if (this.freeSpins() > 0) this.freeSpins.set(this.freeSpins() - 1);
    else this.balance.set(this.balance() - this.bet());
    this.win.set(0);
    this.winningCells.set(new Set());
    this.assets.symbols.forEach((icon) => icon.resetWinAnimation());
    this.spinning.set(true);
    this.stopRequested.set(false);
    this.reelBank.startSpin();
  }

  private stopSpinQuickly(): void {
    if (this.stopRequested()) return;
    this.stopRequested.set(true);
    this.reelBank.requestFastStop();
  }

  private resolveSpin(): void {
    this.spinning.set(false);
    this.stopRequested.set(false);
    const result = evaluatePaylines(this.reelBank.getColumns(), this.bet());
    this.win.set(result.win);
    this.winningCells.set(result.winningCells);
    if (result.win > 0) this.balance.set(this.balance() + result.win);
  }

  private randomSymbol(): string {
    return this.symbols[Math.floor(Math.random() * this.symbols.length)] ?? '';
  }
}
