import GameContext from '../../engine/context';
import { BaseGame } from '../../engine/base-game';
import GameLoader from '../../engine/loader';
import { PhysicsBody } from '../../engine/physics';

import type { BoardCell, PatternFall } from './board';
import { PatternBoard } from './board';
import { PATTERN_ICONS } from './pattern-icons';

interface BoardLayout {
  originX: number;
  originY: number;
  tileSize: number;
}

interface FallingPattern {
  body: PhysicsBody;
  pattern: number;
  targetY: number;
  to: BoardCell;
}

type ResolutionState = 'exploding' | 'falling' | 'idle';

export class SpacePatternsGame extends BaseGame {
  private board = this.createBoard();
  private selectedCell: BoardCell | undefined;
  private movesRemaining = 30;
  private score = 0;
  private targetScore = 5000;
  private gameEnded = false;
  private resolutionState: ResolutionState = 'idle';
  private resolutionMatches: BoardCell[] = [];
  private fallingPatterns: FallingPattern[] = [];
  private cascade = 0;
  private explosionElapsed = 0;
  private readonly pointerListenerCleanup: Array<() => void> = [];

  public constructor(onReturnToMenu?: () => void) {
    super(onReturnToMenu);
    this.pointerListenerCleanup.push(
      GameContext.addPointerDownListener(this.handlePointerDown)
    );
    this.start();
  }

  protected get isGameOver(): boolean {
    return this.gameEnded;
  }

  protected updateGame(deltaSeconds: number): void {
    this.updateResolution(deltaSeconds);
  }

  protected drawGame(): void {
    const dimensions = GameContext.gameDimensionsModel;
    GameContext.clear();
    GameContext.drawImage(
      GameLoader.getImage(
        GameContext.isPortrait
          ? 'background1080x1920'
          : 'background1920x1080'
      ),
      0,
      0,
      dimensions.getWidth(),
      dimensions.getHeight()
    );
    GameContext.drawRect(
      0,
      0,
      dimensions.getWidth(),
      dimensions.getHeight(),
      'rgba(13, 17, 42, 0.52)'
    );
    this.drawHud();
    this.drawBoard();
    this.drawExplosions();
    this.drawFallingPatterns();

    if (this.gameEnded) {
      this.drawEndState();
    }

  }

  private drawHud(): void {
    const dimensions = GameContext.gameDimensionsModel;
    const hudScale = GameContext.isPortrait ? 1.35 : 1;
    GameContext.drawText(
      'SPACE PATTERNS',
      40 * hudScale,
      58 * hudScale,
      36 * hudScale,
      '#ffffff'
    );
    GameContext.drawText(
      `SCORE ${this.score}`,
      40 * hudScale,
      98 * hudScale,
      24 * hudScale,
      '#dce8ff'
    );
    GameContext.drawText(
      `TARGET ${this.targetScore}`,
      dimensions.getWidth() * 0.5,
      58 * hudScale,
      24 * hudScale,
      '#72dcff',
      'center'
    );
    GameContext.drawText(
      `MOVES ${this.movesRemaining}`,
      dimensions.getWidth() - 40 * hudScale,
      58 * hudScale,
      24 * hudScale,
      '#ffdf7e',
      'right'
    );
    GameContext.drawText(
      'TAP OR CLICK TWO ADJACENT PATTERNS TO SWAP',
      dimensions.getWidth() * 0.5,
      dimensions.getHeight() - 30,
      18,
      '#ffffff',
      'center'
    );
  }

  private drawBoard(): void {
    const layout = this.getBoardLayout();
    const hiddenCells = new Set<string>();

    if (this.resolutionState === 'exploding') {
      this.resolutionMatches.forEach((cell) => hiddenCells.add(this.cellKey(cell)));
    } else if (this.resolutionState === 'falling') {
      this.fallingPatterns.forEach((fall) => hiddenCells.add(this.cellKey(fall.to)));
    }

    for (let row = 0; row < this.board.rows; row++) {
      for (let column = 0; column < this.board.columns; column++) {
        const cell = { column, row };
        if (hiddenCells.has(this.cellKey(cell))) continue;

        this.drawPattern(cell, this.board.get(cell), layout);
      }
    }
  }

  private drawPattern(
    cell: BoardCell,
    pattern: number,
    layout: BoardLayout,
    y = layout.originY + cell.row * layout.tileSize
  ): void {
        const icon = PATTERN_ICONS[pattern];
        const x = layout.originX + cell.column * layout.tileSize;
        const isSelected = (
          this.selectedCell?.column === cell.column
          && this.selectedCell.row === cell.row
        );

        GameContext.drawRect(
          x - 3,
          y - 3,
          layout.tileSize - 2,
          layout.tileSize - 2,
          isSelected ? '#72dcff' : '#28365c'
        );
        GameContext.context.drawImage(
          GameLoader.getImage(icon.imageName),
          icon.sourceX,
          icon.sourceY,
          icon.sourceWidth,
          icon.sourceHeight,
          x + 4,
          y + 4,
          layout.tileSize - 8,
          layout.tileSize - 8
        );
  }

  private drawExplosions(): void {
    if (this.resolutionState !== 'exploding') return;

    const layout = this.getBoardLayout();
    const frame = Math.min(3, Math.floor(this.explosionElapsed * 12));
    const explosion = GameLoader.getImage('boss');

    this.resolutionMatches.forEach((cell) => {
      const x = layout.originX + cell.column * layout.tileSize;
      const y = layout.originY + cell.row * layout.tileSize;

      GameContext.context.drawImage(
        explosion,
        1320 + frame * 220,
        0,
        220,
        200,
        x,
        y,
        layout.tileSize,
        layout.tileSize
      );
    });
  }

  private drawFallingPatterns(): void {
    if (this.resolutionState !== 'falling') return;

    const layout = this.getBoardLayout();
    this.fallingPatterns.forEach((fall) => {
      this.drawPattern(fall.to, fall.pattern, layout, fall.body.y);
    });
  }

  private drawEndState(): void {
    const dimensions = GameContext.gameDimensionsModel;
    const didWin = this.score >= this.targetScore;

    GameContext.drawRect(
      0,
      0,
      dimensions.getWidth(),
      dimensions.getHeight(),
      'rgba(14, 11, 29, 0.86)'
    );
    GameContext.drawText(
      didWin ? 'PATTERN MASTER!' : 'OUT OF MOVES',
      dimensions.getWidth() * 0.5,
      dimensions.getHeight() * 0.45,
      58,
      didWin ? '#72dcff' : '#ff6584',
      'center'
    );
    GameContext.drawText(
      `FINAL SCORE ${this.score}`,
      dimensions.getWidth() * 0.5,
      dimensions.getHeight() * 0.52,
      28,
      '#ffffff',
      'center'
    );
    GameContext.drawText(
      'USE THE ACTION BUTTONS BELOW',
      dimensions.getWidth() * 0.5,
      dimensions.getHeight() * 0.59,
      22,
      '#ffffff',
      'center'
    );
  }

  private readonly handlePointerDown = (x: number, y: number): void => {
    if (this.gameEnded || this.controls.isPaused) return;

    const cell = this.getCellAt(x, y);
    if (cell === undefined) {
      this.selectedCell = undefined;
      return;
    }

    if (this.selectedCell === undefined) {
      this.selectedCell = cell;
      return;
    }

    const matches = this.board.trySwap(this.selectedCell, cell);
    this.selectedCell = undefined;

    if (matches === undefined) return;

    this.movesRemaining -= 1;
    this.cascade = 1;
    this.startExplosion(matches);
  };

  private updateResolution(deltaSeconds: number): void {
    if (this.resolutionState === 'exploding') {
      this.explosionElapsed += deltaSeconds;
      if (this.explosionElapsed < 4 / 12) return;

      this.fallingPatterns = this.createFallingPatterns(
        this.board.collapse(this.resolutionMatches)
      );
      this.resolutionState = 'falling';
      return;
    }

    if (this.resolutionState !== 'falling') return;

    this.fallingPatterns.forEach((fall) => {
      fall.body.update(deltaSeconds, 4200);
      if (fall.body.y > fall.targetY) {
        fall.body.y = fall.targetY;
        fall.body.velocityY = 0;
      }
    });

    if (this.fallingPatterns.some((fall) => fall.body.y < fall.targetY)) return;

    this.fallingPatterns = [];
    const matches = this.board.findCurrentMatches();
    if (matches.length > 0) {
      this.cascade += 1;
      this.startExplosion(matches);
      return;
    }

    this.resolutionState = 'idle';
    if (this.score >= this.targetScore) {
      this.gameEnded = true;
      GameLoader.playAudio('win');
    } else if (this.movesRemaining === 0) {
      this.gameEnded = true;
      GameLoader.playAudio('lose');
    }
  }

  private startExplosion(matches: BoardCell[]): void {
    this.resolutionMatches = matches;
    this.resolutionState = 'exploding';
    this.explosionElapsed = 0;
    this.score += matches.length * 100 * this.cascade;
    GameLoader.playAudio(`boom${1 + Math.floor(Math.random() * 4)}`);
  }

  private createFallingPatterns(falls: PatternFall[]): FallingPattern[] {
    const layout = this.getBoardLayout();

    return falls.map((fall) => ({
      body: new PhysicsBody(
        layout.originX + fall.to.column * layout.tileSize,
        layout.originY + fall.from.row * layout.tileSize
      ),
      pattern: fall.pattern,
      targetY: layout.originY + fall.to.row * layout.tileSize,
      to: fall.to
    }));
  }

  private getBoardLayout(): BoardLayout {
    const dimensions = GameContext.gameDimensionsModel;
    const boardWidth = dimensions.getWidth() - 120;
    const boardHeight = dimensions.getHeight() - 250;
    const tileSize = Math.min(
      144,
      boardWidth / this.board.columns,
      boardHeight / this.board.rows
    );
    const width = tileSize * this.board.columns;
    const height = tileSize * this.board.rows;

    return {
      originX: (dimensions.getWidth() - width) * 0.5,
      originY: 140 + (boardHeight - height) * 0.5,
      tileSize
    };
  }

  private getCellAt(x: number, y: number): BoardCell | undefined {
    const layout = this.getBoardLayout();
    const column = Math.floor((x - layout.originX) / layout.tileSize);
    const row = Math.floor((y - layout.originY) / layout.tileSize);

    if (
      column < 0
      || column >= this.board.columns
      || row < 0
      || row >= this.board.rows
    ) {
      return undefined;
    }

    return { column, row };
  }

  private createBoard(): PatternBoard {
    return new PatternBoard(
      GameContext.isPortrait ? 6 : 8,
      GameContext.isPortrait ? 8 : 7,
      PATTERN_ICONS.length
    );
  }

  protected restartGame(): void {
    this.board = this.createBoard();
    this.selectedCell = undefined;
    this.movesRemaining = 30;
    this.score = 0;
    this.gameEnded = false;
    this.controls.hideEndActions();
    this.resolutionState = 'idle';
    this.resolutionMatches = [];
    this.fallingPatterns = [];
    this.cascade = 0;
    this.explosionElapsed = 0;
    GameLoader.playAudio('newgame');
  }

  protected disposeGame(): void {
    this.pointerListenerCleanup.forEach((cleanup) => cleanup());
    this.pointerListenerCleanup.length = 0;
  }

  private cellKey(cell: BoardCell): string {
    return `${cell.column},${cell.row}`;
  }
}
