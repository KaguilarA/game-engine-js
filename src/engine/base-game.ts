import { GameControls } from './game-controls';
import type { GameControlsOptions } from './game-controls';
import { signalValue } from 'reactive-values';
import GameContext from './context';

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
      this.onViewportChanged();
    }

    if (!this.controls.isPaused && !this.isGameOver) {
      this.updateGame(deltaSeconds);
    }

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
    this.controls.dispose();
    this.cleanups.splice(0).forEach((cleanup) => cleanup());
    this.disposeGame();
    this.onReturnToMenu?.();
  }
}
