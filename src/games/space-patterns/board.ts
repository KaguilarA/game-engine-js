export interface BoardCell {
  column: number;
  row: number;
}

export interface PatternFall {
  from: BoardCell;
  pattern: number;
  to: BoardCell;
}

const EMPTY_CELL = -1;

export class PatternBoard {
  private readonly cells: number[][];
  public readonly columns: number;
  public readonly rows: number;
  private readonly patternCount: number;

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

  public get(cell: BoardCell): number {
    return this.cells[cell.row][cell.column];
  }

  public reset(): void {
    for (let row = 0; row < this.rows; row++) {
      for (let column = 0; column < this.columns; column++) {
        this.cells[row][column] = this.createPattern(row, column);
      }
    }
  }

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

  public findCurrentMatches(): BoardCell[] {
    return this.toCells(this.findMatches());
  }

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

  private createPattern(row: number, column: number): number {
    const options = Array.from(
      { length: this.patternCount },
      (_, pattern) => pattern
    ).filter((pattern) => (
      !this.createsInitialMatch(row, column, pattern)
    ));

    return options[Math.floor(Math.random() * options.length)];
  }

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

  private areAdjacent(first: BoardCell, second: BoardCell): boolean {
    const columnDistance = Math.abs(first.column - second.column);
    const rowDistance = Math.abs(first.row - second.row);

    return columnDistance + rowDistance === 1;
  }

  private swap(first: BoardCell, second: BoardCell): void {
    const pattern = this.cells[first.row][first.column];
    this.cells[first.row][first.column] = this.cells[second.row][second.column];
    this.cells[second.row][second.column] = pattern;
  }

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

  private cellKey(cell: BoardCell): string {
    return `${cell.column},${cell.row}`;
  }

  private parseCellKey(key: string): BoardCell {
    const [column, row] = key.split(',').map(Number);

    return { column, row };
  }

  private toCells(matches: Set<string>): BoardCell[] {
    return [...matches].map((key) => this.parseCellKey(key));
  }
}
