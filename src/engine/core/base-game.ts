import { GameControls } from '../input/game-controls';
import type { GameControlsOptions } from '../interfaces/game-controls-options';
import { signalValue } from 'reactive-values';
import GameContext from './context';
import { Label } from '../ui/label';

/**
 * Shared lifecycle for every playable game.
 *
 * Subclasses implement only game-specific state, update, rendering, restart,
 * and optional cleanup behavior. The engine owns the animation loop, pause,
 * reset, game-selector navigation, shared controls, and end-state actions.
 *
 * @class BaseGame
 * @abstract
 */
export abstract class BaseGame {
  /**
   * Shared game controls.
   * @property {GameControls} controls
   * @protected
   */
  protected readonly controls: GameControls;
  /**
   * Whether the game loop is active.
   * @property {Signal<boolean>} running
   * @private
   */
  private readonly running = signalValue(true);
  /**
   * Previous animation-frame timestamp.
   * @property {Signal<number>} lastFrameTime
   * @private
   */
  private readonly lastFrameTime = signalValue(performance.now());
  /**
   * Last observed viewport width.
   * @property {Signal<number>} viewportWidth
   * @private
   */
  private readonly viewportWidth = signalValue(GameContext.viewportWidth());
  /**
   * Last observed viewport height.
   * @property {Signal<number>} viewportHeight
   * @private
   */
  private readonly viewportHeight = signalValue(GameContext.viewportHeight());
  /**
   * Optional selector callback.
   * @property {Function|undefined} onReturnToMenu
   * @private
   */
  private readonly onReturnToMenu: (() => void) | undefined;
  /**
   * Subclass resource cleanup callbacks.
   * @property {Function[]} cleanups
   * @private
   */
  private readonly cleanups: Array<() => void> = [];
  /** @property {number | undefined} pendingViewportLayout @private */
  private pendingViewportLayout: number | undefined;
  /** @property {Map<number, Label>} labels @private */
  private readonly labels = new Map<number, Label>();
  /** @property {number} labelCursor @private */
  private labelCursor = 0;

  /**
   * Creates shared controls and stores the optional selector callback and HUD options.
   * @constructor
   * @protected
   * @param {Function} [onReturnToMenu] Callback used to return to the selector.
   * @param {GameControlsOptions} [controlOptions] Visibility options for shared controls.
   * @return {void}
   */
  protected constructor(
    onReturnToMenu?: () => void,
    controlOptions: GameControlsOptions = {}
  ) {
    this.onReturnToMenu = onReturnToMenu;
    this.controls = new GameControls(
      () => this.restart(),
      () => this.returnToMenu(),
      controlOptions
    );
  }

  /**
   * Starts the shared game loop after subclass initialization is complete.
   * @protected
   * @return {void}
   */
  protected start(): void {
    this.gameLoop();
  }

  /**
   * Advances game-specific state for one unpaused frame.
   * @protected
   * @abstract
   * @param {number} deltaSeconds Duration of the frame in seconds.
   * @return {void}
   */
  protected abstract updateGame(deltaSeconds: number): void;

  /**
   * Draws the game's scene before the shared engine controls.
   * @protected
   * @abstract
   * @return {void}
   */
  protected abstract drawGame(): void;

  /**
   * Resets game-specific state when the player restarts.
   * @protected
   * @abstract
   * @return {void}
   */
  protected abstract restartGame(): void;

  /**
   * Reports whether the game has reached a win or loss state.
   * @protected
   * @abstract
   * @return {boolean} Whether the game has ended.
   */
  protected abstract get isGameOver(): boolean;

  /**
   * Registers a listener or resource cleanup for when this game is closed.
   * @protected
   * @param {Function} cleanup Cleanup callback for a resource or listener.
   * @return {void}
   */
  protected registerCleanup(cleanup: () => void): void {
    this.cleanups.push(cleanup);
  }

  /**
   * Draws the shared restart and return-to-selector actions.
   * @protected
   * @return {void}
   */
  protected drawEndActions(): void {
    this.controls.drawEndActions();
  }

  /**
   * Recalculates game-specific layout after the reactive viewport changes.
   * @protected
   * @return {void}
   */
  protected onViewportChanged(): void {}

  /**
   * Releases game-specific listeners or transient resources before returning
   * to the selector.
   * @protected
   * @return {void}
   */
  protected disposeGame(): void {}

  /**
   * Runs one lifecycle frame, then schedules the next animation frame.
   * @private
   * @param {number} time Current browser animation timestamp.
   * @return {void}
   * @property {(time?: number) => void} gameLoop
   * @private
   */
  private gameLoop = (time = performance.now()): void => {
    if (!this.running()) return;

    const deltaSeconds = Math.max(
      0,
      Math.min((time - this.lastFrameTime()) / 1000, 0.05)
    );
    this.lastFrameTime.set(time);
    const viewportWidth = GameContext.viewportWidth();
    const viewportHeight = GameContext.viewportHeight();

    if (
      viewportWidth !== this.viewportWidth()
      || viewportHeight !== this.viewportHeight()
    ) {
      this.viewportWidth.set(viewportWidth);
      this.viewportHeight.set(viewportHeight);
      this.scheduleViewportLayout();
    }

    if (!this.controls.isPaused && !this.isGameOver) {
      this.updateGame(deltaSeconds);
    }

    this.labelCursor = 0;
    this.drawGame();
    if (this.isGameOver) {
      this.drawEndActions();
      this.controls.drawFullscreenOnly();
    } else {
      this.controls.draw();
    }
    requestAnimationFrame(this.gameLoop);
  };

  /**
   * Draws a cached Label in the same anchor position and size used by the
   * game's former canvas text helper.
   * @protected
   * @return {void}
   */
  protected drawLabel(
    text: string,
    x: number,
    y: number,
    fontSize: number,
    color: string,
    align: CanvasTextAlign = 'left',
    maxWidth?: number
  ): void {
    const index = this.labelCursor++;
    let label = this.labels.get(index);
    const width = maxWidth !== undefined && maxWidth > 0 ? maxWidth : 0;
    const pivotX = align === 'center' ? 0.5 : align === 'right' ? 1 : 0;
    let fittedFontSize = fontSize;
    if (width > 0) {
      const context = GameContext.context;
      context.save();
      context.font = `${fontSize}px sans-serif`;
      const measuredWidth = context.measureText(text).width;
      context.restore();
      if (measuredWidth > width) {
        fittedFontSize = Math.max(9, Math.floor(fontSize * width / measuredWidth));
      }
    }

    if (label === undefined) {
      label = new Label(text, {
        width,
        height: Math.max(12, fittedFontSize * 1.4),
        x,
        y,
        pivotX,
        pivotY: 0,
        fontSize: fittedFontSize,
        color,
        align,
        baseline: 'alphabetic'
      });
      this.labels.set(index, label);
    }

    label.setText(text);
    label.setStyle({ fontSize: fittedFontSize, color, align, baseline: 'alphabetic' });
    label.dimensions.setPosition(x, y);
    label.dimensions.setSize(width, Math.max(12, fittedFontSize * 1.4));
    label.dimensions.setPivot(pivotX, 0);
    label.draw();
  }

  /** Coalesces viewport hooks until a resize gesture settles. */
  private scheduleViewportLayout(): void {
    if (this.pendingViewportLayout !== undefined) {
      window.clearTimeout(this.pendingViewportLayout);
    }
    this.pendingViewportLayout = window.setTimeout(() => {
      this.pendingViewportLayout = undefined;
      if (this.running()) this.onViewportChanged();
    }, 120);
  }

  /**
   * Clears end actions before delegating a reset to the game.
   * @private
   * @return {void}
   */
  private restart(): void {
    this.controls.hideEndActions();
    this.restartGame();
  }

  /**
   * Stops the loop, releases resources, and returns to the selector.
   * @private
   * @return {void}
   */
  private returnToMenu(): void {
    this.running.set(false);
    if (this.pendingViewportLayout !== undefined) {
      window.clearTimeout(this.pendingViewportLayout);
      this.pendingViewportLayout = undefined;
    }
    this.controls.dispose();
    this.cleanups.splice(0).forEach((cleanup) => cleanup());
    this.disposeGame();
    this.onReturnToMenu?.();
  }
}
