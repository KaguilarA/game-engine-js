export interface BoardCell {
  /**
   * Zero-based horizontal grid index.
   * @property {number} column
   * @public
   */
  column: number;
  /**
   * Zero-based vertical grid index.
   * @property {number} row
   * @public
   */
  row: number;
}

export interface PatternFall {
  /**
   * Previous grid position; newly generated patterns use a negative row.
   * @property {BoardCell} from
   * @public
   */
  from: BoardCell;
  /**
   * Index of the pattern that moves or appears.
   * @property {number} pattern
   * @public
   */
  pattern: number;
  /**
   * Grid position occupied after the collapse.
   * @property {BoardCell} to
   * @public
   */
  to: BoardCell;
}

const EMPTY_CELL = -1;

/**
 * Match-three board state and the operations that resolve its matches.
 * @class PatternBoard
 */
export class PatternBoard {
  /**
   * Stores the cells state.
   * @property {number[][]} cells
   * @private
   * @readonly
   */
  private readonly cells: number[][];
  /**
   * Stores the columns state.
   * @property {number} columns
   * @public
   * @readonly
   */
  public readonly columns: number;
  /**
   * Stores the rows state.
   * @property {number} rows
   * @public
   * @readonly
   */
  public readonly rows: number;
  /**
   * Stores the pattern count state.
   * @property {number} patternCount
   * @private
   * @readonly
   */
  private readonly patternCount: number;

  /**
   * Creates and fills a board without initial horizontal or vertical matches.
   * @public
   * @return {void}
   */
  public constructor(columns: number, rows: number, patternCount: number) {
    this.columns = columns;
    this.rows = rows;
    this.patternCount = patternCount;
    this.cells = Array.from(
      { length: rows },
      () => Array.from({ length: columns }, () => EMPTY_CELL)
    );
    this.reset();
  }

  /**
   * Returns the pattern index stored at a cell.
   * @public
   * @return {number}
   */
  public get(cell: BoardCell): number {
    return this.cells[cell.row][cell.column];
  }

  /**
   * Fills the board with a fresh match-free arrangement.
   * @public
   * @return {void}
   */
  public reset(): void {
    for (let row = 0; row < this.rows; row++) {
      for (let column = 0; column < this.columns; column++) {
        this.cells[row][column] = this.createPattern(row, column);
      }
    }
  }

  /**
   * Swaps adjacent cells only when that swap creates a match.
   * @public
   * @return {BoardCell[] | undefined}
   */
  public trySwap(first: BoardCell, second: BoardCell): BoardCell[] | undefined {
    if (!this.areAdjacent(first, second)) return undefined;

    this.swap(first, second);
    const matches = this.findMatches();
    if (matches.size === 0) {
      this.swap(first, second);
      return undefined;
    }

    return this.toCells(matches);
  }

  /**
   * Returns all cells that currently belong to a run of at least three.
   * @public
   * @return {BoardCell[]}
   */
  public findCurrentMatches(): BoardCell[] {
    return this.toCells(this.findMatches());
  }

  /**
   * Removes matched cells, drops survivors, and fills each column from above.
   * @public
   * @return {PatternFall[]}
   */
  public collapse(matches: readonly BoardCell[]): PatternFall[] {
    matches.forEach((cell) => {
      this.cells[cell.row][cell.column] = EMPTY_CELL;
    });

    const nextCells = Array.from(
      { length: this.rows },
      () => Array.from({ length: this.columns }, () => EMPTY_CELL)
    );
    const falls: PatternFall[] = [];

    for (let column = 0; column < this.columns; column++) {
      const survivors: Array<{ pattern: number; row: number }> = [];

      for (let row = this.rows - 1; row >= 0; row--) {
        const pattern = this.cells[row][column];
        if (pattern !== EMPTY_CELL) survivors.push({ pattern, row });
      }

      let targetRow = this.rows - 1;
      survivors.forEach((survivor) => {
        nextCells[targetRow][column] = survivor.pattern;
        if (survivor.row !== targetRow) {
          falls.push({
            from: { column, row: survivor.row },
            pattern: survivor.pattern,
            to: { column, row: targetRow }
          });
        }
        targetRow -= 1;
      });

      for (let row = targetRow; row >= 0; row--) {
        const pattern = Math.floor(Math.random() * this.patternCount);
        nextCells[row][column] = pattern;
        falls.push({
          from: { column, row: row - targetRow - 1 },
          pattern,
          to: { column, row }
        });
      }
    }

    this.cells.forEach((row, rowIndex) => {
      row.forEach((_, column) => {
        this.cells[rowIndex][column] = nextCells[rowIndex][column];
      });
    });

    return falls;
  }

  /**
   * Picks a pattern that does not create a match during initial filling.
   * @private
   * @return {number}
   */
  private createPattern(row: number, column: number): number {
    const options = Array.from(
      { length: this.patternCount },
      (_, pattern) => pattern
    ).filter((pattern) => (
      !this.createsInitialMatch(row, column, pattern)
    ));

    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Checks whether a candidate completes a horizontal or vertical run.
   * @private
   * @return {boolean} Whether the candidate would make a match.
   */
  private createsInitialMatch(
    row: number,
    column: number,
    pattern: number
  ): boolean {
    return (
      (
        column >= 2
        && this.cells[row][column - 1] === pattern
        && this.cells[row][column - 2] === pattern
      )
      || (
        row >= 2
        && this.cells[row - 1][column] === pattern
        && this.cells[row - 2][column] === pattern
      )
    );
  }

  /**
   * Reports whether two cells share an edge.
   * @private
   * @return {boolean}
   */
  private areAdjacent(first: BoardCell, second: BoardCell): boolean {
    const columnDistance = Math.abs(first.column - second.column);
    const rowDistance = Math.abs(first.row - second.row);

    return columnDistance + rowDistance === 1;
  }

  /**
   * Exchanges the pattern indices in two cells.
   * @private
   * @return {void}
   */
  private swap(first: BoardCell, second: BoardCell): void {
    const pattern = this.cells[first.row][first.column];
    this.cells[first.row][first.column] = this.cells[second.row][second.column];
    this.cells[second.row][second.column] = pattern;
  }

  /**
   * Collects horizontal and vertical matches as unique cell keys.
   * @private
   * @return {Set<string>}
   */
  private findMatches(): Set<string> {
    const matches = new Set<string>();

    for (let row = 0; row < this.rows; row++) {
      this.findRowMatches(row, matches);
    }

    for (let column = 0; column < this.columns; column++) {
      this.findColumnMatches(column, matches);
    }

    return matches;
  }

  /**
   * Adds every horizontal run of at least three patterns to the result.
   * @private
   * @return {void}
   */
  private findRowMatches(row: number, matches: Set<string>): void {
    let start = 0;

    while (start < this.columns) {
      const pattern = this.cells[row][start];
      let end = start + 1;

      while (end < this.columns && this.cells[row][end] === pattern) {
        end += 1;
      }

      if (pattern !== EMPTY_CELL && end - start >= 3) {
        for (let column = start; column < end; column++) {
          matches.add(this.cellKey({ column, row }));
        }
      }

      start = end;
    }
  }

  /**
   * Adds every vertical run of at least three patterns to the result.
   * @private
   * @return {void}
   */
  private findColumnMatches(column: number, matches: Set<string>): void {
    let start = 0;

    while (start < this.rows) {
      const pattern = this.cells[start][column];
      let end = start + 1;

      while (end < this.rows && this.cells[end][column] === pattern) {
        end += 1;
      }

      if (pattern !== EMPTY_CELL && end - start >= 3) {
        for (let row = start; row < end; row++) {
          matches.add(this.cellKey({ column, row }));
        }
      }

      start = end;
    }
  }

  /**
   * Encodes a grid coordinate for set-based match collection.
   * @private
   * @return {string}
   */
  private cellKey(cell: BoardCell): string {
    return `${cell.column},${cell.row}`;
  }

  /**
   * Decodes a coordinate key created by {@link cellKey}.
   * @private
   * @return {BoardCell}
   */
  private parseCellKey(key: string): BoardCell {
    const [column, row] = key.split(',').map(Number);

    return { column, row };
  }

  /**
   * Converts collected coordinate keys back into grid cells.
   * @private
   * @return {BoardCell[]}
   */
  private toCells(matches: Set<string>): BoardCell[] {
    return [...matches].map((key) => this.parseCellKey(key));
  }
}
