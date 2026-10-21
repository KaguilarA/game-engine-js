import GameContext from '../../engine/core/context';
import GameEvents from '../../engine/input/events';
import type { GamePointer } from '../../engine/interfaces/game-pointer';
import { BaseGame } from '../../engine/core/base-game';
import GameLoader from '../../engine/assets/loader';
import { GameBackground } from '../../engine/rendering/background';

import { PatternBoard } from './board';
import { PATTERN_ICONS } from './pattern-icons';
import { PhysicsBody } from '../../engine/core/physics';
import { signalValue } from 'reactive-values';
import type { BoardCell } from './interfaces/board-cell';
import type { BoardLayout } from './interfaces/board-layout';
import type { FallingPattern } from './interfaces/falling-pattern';
import type { SwapAnimation } from './interfaces/swap-animation';

const SWAP_ANIMATION_SECONDS = 0.16;
const FALL_ACCELERATION = 42;

/**
 * Current step in match clearing and cascade resolution.
 */
type ResolutionState = 'exploding' | 'falling' | 'idle';

/**
 * Match-three game with timed cascades, animated sprites, and score goals.
 * @class SpacePatternsGame
 */
export class SpacePatternsGame extends BaseGame {
  /**
   * Stores the board state.
   * @property {PatternBoard} board
   * @private
   */
  private board = this.createBoard();
  /**
   * Stores the selected cell state.
   * @property {BoardCell | undefined} selectedCell
   * @private
   */
  private readonly selectedCellState = signalValue<BoardCell | undefined>(undefined);
  private get selectedCell(): BoardCell | undefined { return this.selectedCellState(); }
  private set selectedCell(value: BoardCell | undefined) { this.selectedCellState.set(value); }
  /**
   * Stores the currently moving pair of patterns.
   * @property {SwapAnimation | undefined} swapAnimation
   * @private
   */
  private readonly swapAnimationState = signalValue<SwapAnimation | undefined>(undefined);
  private get swapAnimation(): SwapAnimation | undefined { return this.swapAnimationState(); }
  private set swapAnimation(value: SwapAnimation | undefined) { this.swapAnimationState.set(value); }
  /**
   * Stores the moves remaining state.
   * @property {number} movesRemaining
   * @private
   */
  private readonly movesRemainingState = signalValue(30);
  private get movesRemaining(): number { return this.movesRemainingState(); }
  private set movesRemaining(value: number) { this.movesRemainingState.set(value); }
  /**
   * Stores the score state.
   * @property {number} score
   * @private
   */
  private readonly scoreState = signalValue(0);
  private get score(): number { return this.scoreState(); }
  private set score(value: number) { this.scoreState.set(value); }
  /**
   * Stores the target score state.
   * @property {number} targetScore
   * @private
   */
  private readonly targetScore = 5000;
  /**
   * Stores the game ended state.
   * @property {boolean} gameEnded
   * @private
   */
  private readonly gameEndedState = signalValue(false);
  private get gameEnded(): boolean { return this.gameEndedState(); }
  private set gameEnded(value: boolean) { this.gameEndedState.set(value); }
  /**
   * Stores the resolution state state.
   * @property {SignalValue<ResolutionState>} resolutionState
   * @private
   */
  private readonly resolutionState = signalValue<ResolutionState>('idle');
  /**
   * Stores the resolution matches state.
   * @property {SignalValue<readonly BoardCell[]>} resolutionMatches
   * @private
   */
  private readonly resolutionMatches = signalValue<readonly BoardCell[]>([]);
  /**
   * Stores the cascade state.
   * @property {number} cascade
   * @private
   */
  private cascade = 0;
  /**
   * Stores the explosion elapsed state.
   * @property {SignalValue<number>} explosionElapsed
   * @private
   */
  private readonly explosionElapsed = signalValue(0);
  /**
   * Stores patterns currently falling toward cells opened by the latest match.
   * @property {SignalValue<readonly FallingPattern[]>} fallAnimations
   * @private
   * @readonly
   */
  private readonly fallAnimations = signalValue<readonly FallingPattern[]>([]);

  /**
   * Creates the initial board, registers pointer input, and starts the loop.
   * @public
   * @return {void}
   */
  public constructor(onReturnToMenu?: () => void) {
    super(onReturnToMenu, { showResetButton: false });
    this.registerCleanup(
      GameEvents.addPointerDownListener(this.handlePointerDown)
    );
    this.start();
  }

  /**
   * Reports whether the move limit or score goal has ended the round.
   * @protected
   * @return {boolean}
   */
  protected get isGameOver(): boolean {
    return this.gameEnded;
  }

  /**
   * Advances cascade animations and resolves automatic follow-up matches.
   * @protected
   * @return {void}
   */
  protected updateGame(deltaSeconds: number): void {
    if (this.swapAnimation !== undefined) {
      this.updateSwapAnimation(deltaSeconds);
      return;
    }

    this.updateResolution(deltaSeconds);
  }

  /**
   * Keeps the board and its current animations centered after resizing.
   * @protected
   * @return {void}
   */
  protected onViewportChanged(): void {
    this.selectedCell = undefined;
    this.swapAnimation = undefined;
    this.resolutionState.set('idle');
    this.resolutionMatches.set([]);
  }

  /**
   * Draws the scene, board, animation layers, HUD, and end state.
   * @protected
   * @return {void}
   */
  protected drawGame(): void {
    GameContext.clear();
    GameBackground.draw(
      GameLoader.getImage('background1080x1920'),
      GameLoader.getImage('background1920x1080'),
      'rgba(13, 17, 42, 0.52)'
    );
    this.drawHud();
    this.drawBoard();
    this.drawSwapAnimation();
    this.drawFallingPatterns();
    this.drawExplosions();

    if (this.gameEnded) {
      this.drawEndState();
    }

  }

  /**
   * Draws score, remaining moves, target, and current cascade multiplier.
   * @private
   * @return {void}
   */
  private drawHud(): void {
    const dimensions = GameContext.gameDimensionsModel;
    const unit = GameContext.viewportUnit();
    const padding = Math.max(14, unit * 0.04);
    const titleSize = Math.max(16, Math.min(unit * 0.045, 30));
    const textSize = Math.max(11, Math.min(unit * 0.028, 20));
    this.drawLabel(
      'SPACE PATTERNS',
      padding,
      padding + titleSize,
      titleSize,
      '#ffffff',
      'left',
      dimensions.getWidth() * 0.38
    );
    this.drawLabel(
      `SCORE ${this.score}`,
      padding,
      padding + titleSize + textSize * 1.5,
      textSize,
      '#dce8ff',
      'left',
      dimensions.getWidth() * 0.35
    );
    this.drawLabel(
      `TARGET ${this.targetScore}`,
      dimensions.getWidth() * 0.5,
      padding + textSize,
      textSize,
      '#72dcff',
      'center',
      dimensions.getWidth() * 0.28
    );
    this.drawLabel(
      `MOVES ${this.movesRemaining}`,
      dimensions.getWidth() - padding,
      padding + textSize,
      textSize,
      '#ffdf7e',
      'right',
      dimensions.getWidth() * 0.28
    );
    this.drawLabel(
      'TAP OR CLICK TWO ADJACENT PATTERNS TO SWAP',
      dimensions.getWidth() * 0.5,
      dimensions.getHeight() - padding,
      Math.max(10, Math.min(unit * 0.022, 14)),
      '#ffffff',
      'center',
      dimensions.getWidth() * 0.9
    );
  }

  /**
   * Draws every board cell and highlights the selected cell.
   * @private
   * @return {void}
   */
  private drawBoard(): void {
    const layout = this.getBoardLayout();
    const hiddenCells = new Set<string>();

    if (this.resolutionState() === 'exploding') {
      this.resolutionMatches().forEach((cell) => hiddenCells.add(this.cellKey(cell)));
    }
    if (this.resolutionState() === 'falling') {
      this.fallAnimations().forEach(({ column, toRow }) => {
        hiddenCells.add(this.cellKey({ column, row: toRow }));
      });
    }
    if (this.swapAnimation !== undefined) {
      hiddenCells.add(this.cellKey(this.swapAnimation.first));
      hiddenCells.add(this.cellKey(this.swapAnimation.second));
    }

    for (let row = 0; row < this.board.rows; row++) {
      for (let column = 0; column < this.board.columns; column++) {
        const cell = { column, row };
        if (hiddenCells.has(this.cellKey(cell))) continue;

        this.drawPattern(cell, this.board.get(cell), layout);
      }
    }
  }

  /**
   * Draws a static pattern icon in its board cell.
   * @private
   * @return {void}
   */
  private drawPattern(
    cell: BoardCell,
    pattern: number,
    layout: BoardLayout
  ): void {
    const x = layout.originX + cell.column * layout.tileSize;
    const y = layout.originY + cell.row * layout.tileSize;
    const isSelected = (
      this.selectedCell?.column === cell.column
      && this.selectedCell.row === cell.row
    );

    this.drawPatternAt(pattern, x, y, layout.tileSize, isSelected);
  }

  /**
   * Draws one static pattern tile at an arbitrary pixel position.
   * @private
   * @return {void}
   */
  private drawPatternAt(
    pattern: number,
    x: number,
    y: number,
    tileSize: number,
    isSelected = false
  ): void {
    const icon = PATTERN_ICONS[pattern];
    const region = GameLoader.getAtlas(icon.imageName)
      .getRegion(icon.regionName);
    GameContext.drawRect(
      x - 3,
      y - 3,
      tileSize - 2,
      tileSize - 2,
      isSelected ? '#72dcff' : '#28365c'
    );
    GameContext.context.drawImage(
      GameLoader.getImage(icon.imageName),
      region.x,
      region.y,
      region.width,
      region.height,
      x + 4,
      y + 4,
      tileSize - 8,
      tileSize - 8
    );
  }

  /**
   * Draws both patterns at their interpolated positions during a swap.
   * @private
   * @return {void}
   */
  private drawSwapAnimation(): void {
    const animation = this.swapAnimation;
    if (animation === undefined) return;

    const layout = this.getBoardLayout();
    const returning = animation.matches.length === 0;
    const progress = Math.min(1, animation.elapsed / SWAP_ANIMATION_SECONDS);
    const easedProgress = progress * progress * (3 - 2 * progress);
    const movement = returning && animation.elapsed >= SWAP_ANIMATION_SECONDS
      ? 1 - Math.min(
        1,
        (animation.elapsed - SWAP_ANIMATION_SECONDS) / SWAP_ANIMATION_SECONDS
      )
      : easedProgress;
    const easedMovement = returning && animation.elapsed >= SWAP_ANIMATION_SECONDS
      ? movement * movement * (3 - 2 * movement)
      : movement;
    const firstX = layout.originX + animation.first.column * layout.tileSize;
    const firstY = layout.originY + animation.first.row * layout.tileSize;
    const secondX = layout.originX + animation.second.column * layout.tileSize;
    const secondY = layout.originY + animation.second.row * layout.tileSize;

    this.drawPatternAt(
      animation.firstPattern,
      firstX + (secondX - firstX) * easedMovement,
      firstY + (secondY - firstY) * easedMovement,
      layout.tileSize
    );
    this.drawPatternAt(
      animation.secondPattern,
      secondX + (firstX - secondX) * easedMovement,
      secondY + (firstY - secondY) * easedMovement,
      layout.tileSize
    );
  }

  /**
   * Draws explosion frames over the cells removed by the current match.
   * @private
   * @return {void}
   */
  private drawExplosions(): void {
    if (this.resolutionState() !== 'exploding') return;

    const layout = this.getBoardLayout();
    const explosion = GameLoader.getImage('boss');
    const animation = GameLoader.getAtlas('boss').getAnimation('explosion');
    const frame = Math.min(
      animation.frames.length - 1,
      Math.floor(this.explosionElapsed() * animation.frameRate)
    );

    this.resolutionMatches().forEach((cell) => {
      const x = layout.originX + cell.column * layout.tileSize;
      const y = layout.originY + cell.row * layout.tileSize;

      const region = animation.frames[frame];
      GameContext.context.drawImage(
        explosion,
        region.x,
        region.y,
        region.width,
        region.height,
        x,
        y,
        layout.tileSize,
        layout.tileSize
      );
    });
  }

  /**
   * Draws replacement and surviving patterns while gravity moves them into place.
   * @private
   * @return {void}
   */
  private drawFallingPatterns(): void {
    if (this.resolutionState() !== 'falling') return;

    const layout = this.getBoardLayout();
    this.fallAnimations().forEach(({ column, pattern, motion }) => {
      this.drawPatternAt(
        pattern,
        layout.originX + column * layout.tileSize,
        layout.originY + motion.y() * layout.tileSize,
        layout.tileSize
      );
    });
  }

  /**
   * Draws the win or loss overlay after the round is complete.
   * @private
   * @return {void}
   */
  private drawEndState(): void {
    const dimensions = GameContext.gameDimensionsModel;
    const didWin = this.score >= this.targetScore;
    const unit = GameContext.viewportUnit();

    GameContext.drawRect(
      0,
      0,
      dimensions.getWidth(),
      dimensions.getHeight(),
      'rgba(14, 11, 29, 0.86)'
    );
    this.drawLabel(
      didWin ? 'PATTERN MASTER!' : 'OUT OF MOVES',
      dimensions.getWidth() * 0.5,
      dimensions.getHeight() * 0.45,
      Math.max(20, Math.min(unit * 0.065, 42)),
      didWin ? '#72dcff' : '#ff6584',
      'center',
      dimensions.getWidth() * 0.85
    );
    this.drawLabel(
      `FINAL SCORE ${this.score}`,
      dimensions.getWidth() * 0.5,
      dimensions.getHeight() * 0.53,
      Math.max(14, Math.min(unit * 0.035, 24)),
      '#ffffff',
      'center',
      dimensions.getWidth() * 0.85
    );
    this.drawLabel(
      'USE THE ACTION BUTTONS BELOW',
      dimensions.getWidth() * 0.5,
      dimensions.getHeight() * 0.60,
      Math.max(12, Math.min(unit * 0.026, 18)),
      '#ffffff',
      'center',
      dimensions.getWidth() * 0.85
    );
  }

  /**
   * Selects a board cell and attempts a swap on a valid second tap.
   * @property {(x: number, y: number) => void} handlePointerDown
   * @private
   * @readonly
   */
  private readonly handlePointerDown = (pointer: GamePointer): void => {
    if (
      this.gameEnded
      || this.controls.isPaused
      || this.swapAnimation !== undefined
      || this.resolutionState() !== 'idle'
    ) return;
    const { x, y } = pointer;

    const cell = this.getCellAt(x, y);
    if (cell === undefined) {
      this.selectedCell = undefined;
      return;
    }

    if (this.selectedCell === undefined) {
      this.selectedCell = cell;
      return;
    }

    const first = this.selectedCell;
    if (
      Math.abs(first.column - cell.column)
      + Math.abs(first.row - cell.row) !== 1
    ) {
      this.selectedCell = cell;
      return;
    }

    const firstPattern = this.board.get(first);
    const secondPattern = this.board.get(cell);
    const matches = this.board.trySwap(first, cell);
    this.selectedCell = undefined;
    this.swapAnimation = {
      first,
      second: cell,
      firstPattern,
      secondPattern,
      matches: matches ?? [],
      elapsed: 0
    };
  };

  /**
   * Advances the swap and starts match resolution after successful movement.
   * @private
   * @return {void}
   */
  private updateSwapAnimation(deltaSeconds: number): void {
    const animation = this.swapAnimation;
    if (animation === undefined) return;

    animation.elapsed += deltaSeconds;
    const isInvalid = animation.matches.length === 0;
    const duration = SWAP_ANIMATION_SECONDS * (isInvalid ? 2 : 1);
    if (animation.elapsed < duration) return;

    this.swapAnimation = undefined;
    if (isInvalid) return;

    this.movesRemaining -= 1;
    this.cascade = 1;
    this.startExplosion(animation.matches);
  }

  /**
   * Advances the explosion and resolves the following board cascade.
   * @private
   * @return {void}
   */
  private updateResolution(deltaSeconds: number): void {
    if (this.resolutionState() === 'falling') {
      const remainingFalls: FallingPattern[] = [];
      this.fallAnimations().forEach((fall) => {
        fall.motion.update(deltaSeconds, FALL_ACCELERATION);
        if (fall.motion.y() >= fall.toRow) {
          fall.motion.setPosition(fall.column, fall.toRow);
          fall.motion.stop();
        } else {
          remainingFalls.push(fall);
        }
      });
      this.fallAnimations.set(remainingFalls);
      if (remainingFalls.length === 0) this.finishGravityResolution();
      return;
    }

    if (this.resolutionState() !== 'exploding') return;

    this.explosionElapsed.set(this.explosionElapsed() + deltaSeconds);
    const explosion = GameLoader.getAtlas('boss').getAnimation('explosion');
    if (this.explosionElapsed() < explosion.frames.length / explosion.frameRate) return;

    const falls = this.board.collapse(this.resolutionMatches());
    const fallAnimations = falls.map((fall) => ({
      ...fall,
      motion: new PhysicsBody(fall.column, fall.fromRow)
    }));
    this.fallAnimations.set(fallAnimations);
    if (fallAnimations.length > 0) {
      this.resolutionState.set('falling');
      return;
    }

    this.finishGravityResolution();
  }

  /**
   * Starts another cascade after every pattern has landed in its destination cell.
   * @private
   * @return {void}
   */
  private finishGravityResolution(): void {
    this.fallAnimations.set([]);
    const matches = this.board.findCurrentMatches();
    if (matches.length > 0) {
      this.cascade += 1;
      this.startExplosion(matches);
      return;
    }

    this.resolutionState.set('idle');
    if (this.score >= this.targetScore) {
      this.gameEnded = true;
      GameLoader.playAudio('win');
    } else if (this.movesRemaining === 0) {
      this.gameEnded = true;
      GameLoader.playAudio('lose');
    }
  }

  /**
   * Starts the removal animation and scoring for a set of matched cells.
   * @private
   * @return {void}
   */
  private startExplosion(matches: BoardCell[]): void {
    this.resolutionMatches.set(matches);
    this.resolutionState.set('exploding');
    this.explosionElapsed.set(0);
    this.fallAnimations.set([]);
    this.score += matches.length * 100 * this.cascade;
    GameLoader.playAudio(`boom${1 + Math.floor(Math.random() * 4)}`);
  }

  /**
   * Calculates the centered board cell geometry for the current viewport.
   * @private
   * @return {BoardLayout}
   */
  private getBoardLayout(): BoardLayout {
    const dimensions = GameContext.gameDimensionsModel;
    const unit = GameContext.viewportUnit();
    const horizontalPadding = Math.max(24, unit * 0.08);
    const topPadding = Math.max(84, unit * 0.16);
    const bottomPadding = Math.max(72, unit * 0.14);
    const boardWidth = dimensions.getWidth() - horizontalPadding * 2;
    const boardHeight = dimensions.getHeight() - topPadding - bottomPadding;
    const tileSize = Math.min(
      64,
      boardWidth / this.board.columns,
      boardHeight / this.board.rows
    );
    const width = tileSize * this.board.columns;
    const height = tileSize * this.board.rows;

    return {
      originX: (dimensions.getWidth() - width) * 0.5,
      originY: topPadding + (boardHeight - height) * 0.5,
      tileSize
    };
  }

  /**
   * Maps a pointer coordinate to a board cell when inside the grid.
   * @private
   * @return {BoardCell | undefined}
   */
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

  /**
   * Creates a board sized for the current portrait or landscape layout.
   * @private
   * @return {PatternBoard}
   */
  private createBoard(): PatternBoard {
    return new PatternBoard(
      GameContext.isPortrait ? 6 : 8,
      GameContext.isPortrait ? 8 : 7,
      PATTERN_ICONS.length
    );
  }

  /**
   * Restores the initial score, move count, board, and animation state.
   * @protected
   * @return {void}
   */
  protected restartGame(): void {
    this.board = this.createBoard();
    this.selectedCell = undefined;
    this.swapAnimation = undefined;
    this.movesRemaining = 30;
    this.score = 0;
    this.gameEnded = false;
    this.controls.hideEndActions();
    this.resolutionState.set('idle');
    this.resolutionMatches.set([]);
    this.fallAnimations.set([]);
    this.cascade = 0;
    this.explosionElapsed.set(0);
    GameLoader.playAudio('newgame');
  }

  /**
   * Encodes a board coordinate for animation lookup.
   * @private
   * @return {string}
   */
  private cellKey(cell: BoardCell): string {
    return `${cell.column},${cell.row}`;
  }
}
