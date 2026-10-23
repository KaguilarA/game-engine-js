import { signalValue } from 'reactive-values';
import maximizeSvg from 'lucide-static/icons/maximize.svg?raw';
import minimizeSvg from 'lucide-static/icons/minimize.svg?raw';
import pauseSvg from 'lucide-static/icons/pause.svg?raw';
import resetSvg from 'lucide-static/icons/rotate-ccw.svg?raw';
import houseSvg from 'lucide-static/icons/house.svg?raw';

import { Button } from '../ui';
import { CanvasIcon, Texture } from '../rendering';
import { GameContext } from '../core';
import type {
  GameControlCircle,
  GameControlsLayout,
  GameControlsOptions
} from '../interfaces';

/**
 * Renders and handles the shared pause, fullscreen, and reset controls.
 * @class GameControls
 */
export class GameControls {
  /**
   * Determines whether the reset icon is displayed and accepts pointer input.
   * @property {boolean} showResetButton
   * @private
   * @readonly
   */
  private readonly showResetButton: boolean;
  private readonly menuAlignment: 'left' | 'right';
  /**
   * Stores the pause icon state.
   * @property {CanvasIcon} pauseIcon
   * @private
   * @readonly
   */
  private readonly pauseIcon = new CanvasIcon(pauseSvg);
  /**
   * Stores the maximize icon state.
   * @property {CanvasIcon} maximizeIcon
   * @private
   * @readonly
   */
  private readonly maximizeIcon = new CanvasIcon(maximizeSvg);
  /**
   * Stores the minimize icon state.
   * @property {CanvasIcon} minimizeIcon
   * @private
   * @readonly
   */
  private readonly minimizeIcon = new CanvasIcon(minimizeSvg);
  /**
   * Stores the reset icon state.
   * @property {CanvasIcon} resetIcon
   * @private
   * @readonly
   */
  private readonly resetIcon = new CanvasIcon(resetSvg);
  /**
   * Stores the menu icon state.
   * @property {CanvasIcon} menuIcon
   * @private
   * @readonly
   */
  private readonly menuIcon = new CanvasIcon(houseSvg);
  private readonly onReset: () => void;
  private readonly onReturnToMenu: (() => void) | undefined;
  /**
   * Stores the paused state.
   * @property {Signal} paused
   * @private
   * @readonly
   */
  private readonly paused = signalValue(false);
  /**
   * Stores the end actions visible state.
   * @property {Signal} endActionsVisible
   * @private
   * @readonly
   */
  private readonly endActionsVisible = signalValue(false);
  /**
   * Stores the fullscreen only state.
   * @property {Signal} fullscreenOnly
   * @private
   * @readonly
   */
  private readonly fullscreenOnly = signalValue(false);
  private readonly pauseButton: Button;
  private readonly fullscreenButton: Button;
  private readonly resetButton: Button;
  private readonly menuButton: Button;
  private readonly restartActionButton: Button;
  private readonly menuActionButton: Button;

  /**
   * Registers shared control input, its callbacks, and optional HUD visibility.
   * @param onReset - Callback that restarts the active game.
   * @param onReturnToMenu - Optional callback that returns to the game selector.
   * @param options - Visibility configuration for optional shared controls.
   * @public
   * @return {void}
   */
  public constructor(
    onReset: () => void,
    onReturnToMenu?: () => void,
    options: GameControlsOptions = {}
  ) {
    this.onReset = onReset;
    this.onReturnToMenu = onReturnToMenu;
    this.showResetButton = options.showResetButton ?? true;
    this.menuAlignment = options.menuAlignment ?? 'right';
    this.pauseButton = this.createButton(() => this.paused.set(!this.paused()));
    this.fullscreenButton = this.createButton(() => { void this.toggleFullscreen(); });
    this.resetButton = this.createButton(() => { this.paused.set(false); this.onReset(); });
    this.menuButton = this.createButton(() => this.onReturnToMenu?.());
    this.restartActionButton = this.createButton(() => {
      this.paused.set(false);
      this.hideEndActions();
      this.onReset();
    });
    this.menuActionButton = this.createButton(() => this.onReturnToMenu?.());
  }

  /**
   * Reports whether gameplay updates are paused.
   * @public
   * @return {boolean}
   */
  public get isPaused(): boolean {
    return this.paused();
  }

  /**
   * Draws all shared controls and the pause overlay when paused.
   * @public
   * @return {void}
   */
  public draw(): void {
    this.fullscreenOnly.set(false);
    const layout = this.getLayout();
    this.setCircleButton(this.pauseButton, layout.pauseButton, true);
    this.setCircleButton(this.fullscreenButton, layout.fullscreenButton, true);
    this.setCircleButton(this.resetButton, layout.resetButton, this.showResetButton);
    this.setCircleButton(this.menuButton, layout.menuButton, this.onReturnToMenu !== undefined);
    this.setActionButton(this.restartActionButton, 0, 0, 0, 0, false);
    this.setActionButton(this.menuActionButton, 0, 0, 0, 0, false);

    this.drawArcadeButton(
      layout.pauseButton,
      this.paused() ? '#2d7d46' : '#384a78'
    );
    this.drawIcon(
      this.pauseIcon,
      layout.pauseButton.x,
      layout.pauseButton.y,
      layout.pauseButton.radius * 1.05
    );
    this.drawArcadeButton(layout.fullscreenButton, '#466598');
    this.drawIcon(
      GameContext.isFullscreen ? this.minimizeIcon : this.maximizeIcon,
      layout.fullscreenButton.x,
      layout.fullscreenButton.y,
      layout.fullscreenButton.radius * 1.05
    );
    if (this.showResetButton) {
      this.drawArcadeButton(layout.resetButton, '#9c3e45');
      this.drawIcon(
        this.resetIcon,
        layout.resetButton.x,
        layout.resetButton.y,
        layout.resetButton.radius * 1.05
      );
    }
    this.drawArcadeButton(layout.menuButton, '#72549b');
    this.drawIcon(
      this.menuIcon,
      layout.menuButton.x,
      layout.menuButton.y,
      layout.menuButton.radius * 1.05
    );

    if (this.paused()) {
      const dimensions = GameContext.gameDimensionsModel;
      const iconSize = Math.min(
        GameContext.viewportUnit() * 0.16,
        64
      );
      this.drawIcon(
        this.pauseIcon,
        dimensions.getWidth() * 0.5,
        dimensions.getHeight() * 0.5,
        iconSize
      );
    }
  }

  /**
   * Draws only fullscreen control while the game-over actions are shown.
   * @public
   * @return {void}
   */
  public drawFullscreenOnly(): void {
    this.fullscreenOnly.set(true);
    const fullscreenButton = this.getLayout().fullscreenButton;
    this.setCircleButton(this.pauseButton, this.getLayout().pauseButton, false);
    this.setCircleButton(this.resetButton, this.getLayout().resetButton, false);
    this.setCircleButton(this.menuButton, this.getLayout().menuButton, false);
    this.setCircleButton(this.fullscreenButton, fullscreenButton, true);

    this.drawArcadeButton(fullscreenButton, '#466598');
    this.drawIcon(
      GameContext.isFullscreen ? this.minimizeIcon : this.maximizeIcon,
      fullscreenButton.x,
      fullscreenButton.y,
      fullscreenButton.radius * 1.05
    );
  }

  /**
   * Draws restart and selector buttons after a game ends.
   * @public
   * @return {void}
   */
  public drawEndActions(): void {
    this.endActionsVisible.set(true);
    const dimensions = GameContext.gameDimensionsModel;
    const unit = GameContext.viewportUnit();
    const width = Math.min(dimensions.getWidth() * 0.82, Math.min(unit * 0.65, 340));
    const height = Math.max(42, Math.min(unit * 0.08, 58));
    const x = dimensions.getWidth() * 0.5 - width * 0.5;
    const restartY = dimensions.getHeight() * 0.62;
    const menuY = restartY + height + 14;

    this.setActionButton(this.restartActionButton, x, restartY, width, height, true);
    this.setActionButton(this.menuActionButton, x, menuY, width, height, this.onReturnToMenu !== undefined);

    this.drawActionButton(x, restartY, width, height, '#426ea8', 'RESTART');
    this.drawActionButton(x, menuY, width, height, '#72549b', 'GAME SELECTOR');
  }

  /**
   * Hides the end-of-game action buttons.
   * @public
   * @return {void}
   */
  public hideEndActions(): void {
    this.endActionsVisible.set(false);
    this.restartActionButton.setDisabled(true);
    this.menuActionButton.setDisabled(true);
  }

  /**
   * Calculates positions for the shared controls in the current viewport.
   * @public
   * @return {GameControlsLayout}
   */
  public getLayout(): GameControlsLayout {
    const dimensions = GameContext.gameDimensionsModel;
    const unit = GameContext.viewportUnit();
    const availableWidth = dimensions.getWidth() * 0.5;
    const padding = Math.max(8, Math.min(unit * 0.02, 14));
    const gap = Math.max(7, Math.min(unit * 0.014, 12));
    const maxRadius = Math.max(12, Math.floor((availableWidth - padding * 2 - gap * 3) / 8));
    const buttonRadius = Math.max(14, Math.min(unit * 0.034, 24, maxRadius));
    const buttonDiameter = buttonRadius * 2;
    const rightmostX = dimensions.getWidth() - padding - buttonRadius;
    const resetX = rightmostX;
    const fullscreenX = rightmostX - buttonDiameter * (this.showResetButton ? 1 : 0) - gap * (this.showResetButton ? 1 : 0);
    const pauseX = fullscreenX - buttonDiameter - gap;
    const menuX = this.menuAlignment === 'left'
      ? padding + buttonRadius
      : pauseX - buttonDiameter - gap;

    return {
      pauseButton: {
        x: pauseX,
        y: padding + buttonRadius,
        radius: buttonRadius
      },
      fullscreenButton: {
        x: fullscreenX,
        y: padding + buttonRadius,
        radius: buttonRadius
      },
      resetButton: {
        x: resetX,
        y: padding + buttonRadius,
        radius: buttonRadius
      },
      menuButton: {
        x: menuX,
        y: padding + buttonRadius,
        radius: buttonRadius
      }
    };
  }

  /**
   * Removes the registered pointer listener.
   * @public
   * @return {void}
   */
  public dispose(): void {
    [this.pauseButton, this.fullscreenButton, this.resetButton, this.menuButton, this.restartActionButton, this.menuActionButton]
      .forEach((button) => button.destroy());
  }

  /**
   * Stores the handle pointer down state.
   * @property {(x: number, y: number) => void} handlePointerDown
   * @private
   * @readonly
   */
  private createButton(onClick: () => void): Button {
    return new Button(new Texture({}, 0, 0), { onClick, shape: 'circle' });
  }

  private setCircleButton(button: Button, circle: GameControlCircle, enabled: boolean): void {
    button.dimensions.setPosition(circle.x, circle.y);
    button.dimensions.setSize(circle.radius * 2, circle.radius * 2);
    button.dimensions.setPivot(0.5, 0.5);
    button.setDisabled(!enabled);
  }

  private setActionButton(button: Button, x: number, y: number, width: number, height: number, enabled: boolean): void {
    button.dimensions.setPosition(x + width / 2, y + height / 2);
    button.dimensions.setSize(width, height);
    button.dimensions.setPivot(0.5, 0.5);
    button.setDisabled(!enabled);
  }

  /**
   * Draws a rectangular text action used by the end-state overlay.
   * @private
   * @return {void}
   */
  private drawActionButton(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    label: string
  ): void {
    GameContext.drawRect(x, y, width, height, '#11182f');
    GameContext.drawRect(x + 3, y + 3, width - 6, height - 6, color);
    GameContext.drawText(
      label,
      x + width * 0.5,
      y + height * 0.66,
      Math.max(13, height * 0.36),
      '#ffffff',
      'center',
      width - 16
    );
  }

  /**
   * Draws a circular arcade-style button background.
   * @private
   * @return {void}
   */
  private drawArcadeButton(circle: GameControlCircle, color: string): void {
    const inset1 = Math.max(2, Math.round(circle.radius * 0.16));
    const inset2 = Math.max(4, Math.round(circle.radius * 0.4));
    GameContext.drawCircle(
      circle.x,
      circle.y,
      circle.radius,
      'rgba(9, 14, 38, 0.78)'
    );
    GameContext.drawCircle(circle.x, circle.y, Math.max(1, circle.radius - inset1), color);
    GameContext.drawCircle(
      circle.x,
      circle.y,
      Math.max(1, circle.radius - inset2),
      'rgba(19, 31, 76, 0.42)'
    );
    GameContext.drawCircle(
      circle.x - circle.radius * 0.28,
      circle.y - circle.radius * 0.28,
      Math.max(1, circle.radius * 0.16),
      'rgba(255, 255, 255, 0.35)'
    );
  }

  /**
   * Centers an icon within a button.
   * @private
   * @return {void}
   */
  private drawIcon(
    icon: CanvasIcon,
    x: number,
    y: number,
    size: number
  ): void {
    icon.draw(x - size * 0.5, y - size * 0.5, size);
  }

  /**
   * Toggles fullscreen and logs browser failures without breaking gameplay.
   * @private
   * @return {Promise<void>}
   */
  private async toggleFullscreen(): Promise<void> {
    try {
      await GameContext.toggleFullscreen();
    } catch (error) {
      console.error('Failed to change fullscreen mode.', error);
    }
  }
}
