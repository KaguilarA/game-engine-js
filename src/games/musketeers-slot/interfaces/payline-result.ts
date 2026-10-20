export type WinningCell = `${number}:${number}`;

export interface PaylineResult {
  win: number;
  winningCells: ReadonlySet<WinningCell>;
}
