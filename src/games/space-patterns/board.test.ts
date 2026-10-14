import { describe, expect, it } from 'vitest';

import { PatternBoard } from './board';

describe('PatternBoard', () => {
  it('creates a board without automatic three-pattern matches', () => {
    const board = new PatternBoard(8, 7, 6);

    for (let row = 0; row < board.rows; row++) {
      for (let column = 0; column < board.columns - 2; column++) {
        expect(
          board.get({ column, row }) === board.get({ column: column + 1, row })
          && board.get({ column, row }) === board.get({ column: column + 2, row })
        ).toBe(false);
      }
    }

    for (let column = 0; column < board.columns; column++) {
      for (let row = 0; row < board.rows - 2; row++) {
        expect(
          board.get({ column, row }) === board.get({ column, row: row + 1 })
          && board.get({ column, row }) === board.get({ column, row: row + 2 })
        ).toBe(false);
      }
    }
  });

  it('rejects swaps between non-adjacent patterns without changing them', () => {
    const board = new PatternBoard(8, 7, 6);
    const first = { column: 0, row: 0 };
    const second = { column: 2, row: 0 };
    const firstPattern = board.get(first);
    const secondPattern = board.get(second);

    expect(board.trySwap(first, second)).toBeUndefined();
    expect(board.get(first)).toBe(firstPattern);
    expect(board.get(second)).toBe(secondPattern);
  });
});
