import { GameControls } from './game-controls';

/**
 * Shared lifecycle for every playable game.
 *
 * Subclasses implement only game-specific state, update, rendering, restart,
 * and optional cleanup behavior. The engine owns the animation loop, pause,
 * reset, game-selector navigation, shared controls, and end-state actions.
 */
export abstract class BaseGame {
  protected readonly controls: GameControls;
  private running = true;
  private lastFrameTime = performance.now();
  private readonly onReturnToMenu: (() => void) | undefined;

  protected constructor(onReturnToMenu?: () => void) {
    this.onReturnToMenu = onReturnToMenu;
    this.controls = new GameControls(
      () => this.restart(),
      () => this.returnToMenu()
    );
  }

  /**
   * Starts the shared game loop after subclass initialization is complete.
   */
  protected start(): void {
    this.gameLoop();
  }

  protected abstract updateGame(deltaSeconds: number): void;

  protected abstract drawGame(): void;

  protected abstract restartGame(): void;

  protected abstract get isGameOver(): boolean;

  protected drawEndActions(): void {
    this.controls.drawEndActions();
  }

  /**
   * Releases game-specific listeners or transient resources before returning
   * to the selector.
   */
  protected disposeGame(): void {}

  private gameLoop = (time = performance.now()): void => {
    if (!this.running) return;

    const deltaSeconds = Math.min((time - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = time;

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

  private restart(): void {
    this.controls.hideEndActions();
    this.restartGame();
  }

  private returnToMenu(): void {
    this.running = false;
    this.controls.dispose();
    this.disposeGame();
    this.onReturnToMenu?.();
  }
}
