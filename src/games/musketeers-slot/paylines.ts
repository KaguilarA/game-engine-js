import type { PaylineResult } from './interfaces/payline-result';
import type { WinningCell } from './interfaces/payline-result';

const PAYLINES: readonly (readonly number[])[] = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1],
  [0, 1, 1, 1, 0]
];

export const PAYLINE_COUNT = PAYLINES.length;

/** Evaluates the Musketeers paytable against the settled reel matrix. */
export function evaluatePaylines(reels: readonly (readonly string[])[], bet: number): PaylineResult {
  let win = 0;
  const winningCells = new Set<WinningCell>();

  for (const line of PAYLINES) {
    const lineSymbols = line.map((row, reel) => reels[reel]?.[row] ?? '');
    const firstRegular = lineSymbols.find((symbol) => symbol !== 'W' && symbol !== '');
    if (!firstRegular) continue;

    let matches = 0;
    for (const symbol of lineSymbols) {
      if (symbol === firstRegular || symbol === 'W') matches += 1;
      else break;
    }

    if (matches < 3) continue;
    win += bet * (matches === 3 ? 2 : matches === 4 ? 5 : 12);
    for (let reel = 0; reel < matches; reel++) {
      winningCells.add(`${reel}:${line[reel]}`);
    }
  }

  return { win, winningCells };
}
