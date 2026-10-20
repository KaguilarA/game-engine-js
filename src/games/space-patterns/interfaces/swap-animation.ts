import type { BoardCell } from './board-cell';

export interface SwapAnimation {
  first: BoardCell;
  second: BoardCell;
  firstPattern: number;
  secondPattern: number;
  matches: BoardCell[];
  elapsed: number;
}
