import maximizeSvg from 'lucide-static/icons/maximize.svg?raw';
import minimizeSvg from 'lucide-static/icons/minimize.svg?raw';
import pauseSvg from 'lucide-static/icons/pause.svg?raw';
import resetSvg from 'lucide-static/icons/rotate-ccw.svg?raw';
import houseSvg from 'lucide-static/icons/house.svg?raw';

import CanvasIcon from './canvas-icon';
import GameContext from './context';

export interface GameControlCircle {
  x: number;
  y: number;
  radius: number;
}

export interface GameControlsLayout {
  fullscreenButton: GameControlCircle;
  pauseButton: GameControlCircle;
  resetButton: GameControlCircle;
  menuButton: GameControlCircle;
}

/**
 * Renders and handles the shared pause, fullscreen, and reset controls.
 */
export class GameControls {
  private readonly pauseIcon = new CanvasIcon(pauseSvg);
  private readonly maximizeIcon = new CanvasIcon(maximizeSvg);
  private readonly minimizeIcon = new CanvasIcon(minimizeSvg);
  private readonly resetIcon = new CanvasIcon(resetSvg);
  private readonly menuIcon = new CanvasIcon(houseSvg);
  private readonly removePointerListener: () => void;
  private readonly onReset: () => void;
  private readonly onReturnToMenu: (() => void) | undefined;
  private paused = false;
  private endActionsVisible = false;
  private fullscreenOnly = false;

  public constructor(onReset: () => void, onReturnToMenu?: () => void) {
    this.onReset = onReset;
    this.onReturnToMenu = onReturnToMenu;
    this.removePointerListener = GameContext.addPointerDownListener(
      this.handlePointerDown
    );
  }

  public get isPaused(): boolean {
    return this.paused;
  }

  public draw(): void {
    this.fullscreenOnly = false;
    const layout = this.getLayout();

    this.drawArcadeButton(
      layout.pauseButton,
      this.paused ? '#2d7d46' : '#384a78'
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
    this.drawArcadeButton(layout.resetButton, '#9c3e45');
    this.drawIcon(
      this.resetIcon,
      layout.resetButton.x,
      layout.resetButton.y,
      layout.resetButton.radius * 1.05
    );
    this.drawArcadeButton(layout.menuButton, '#72549b');
    this.drawIcon(
      this.menuIcon,
      layout.menuButton.x,
      layout.menuButton.y,
      layout.menuButton.radius * 1.05
    );

    if (this.paused) {
      const dimensions = GameContext.gameDimensionsModel;
      this.drawIcon(
        this.pauseIcon,
        dimensions.getWidth() * 0.5,
        dimensions.getHeight() * 0.5,
        128
      );
    }
  }

  public drawFullscreenOnly(): void {
    this.fullscreenOnly = true;
    const fullscreenButton = this.getLayout().fullscreenButton;

    this.drawArcadeButton(fullscreenButton, '#466598');
    this.drawIcon(
      GameContext.isFullscreen ? this.minimizeIcon : this.maximizeIcon,
      fullscreenButton.x,
      fullscreenButton.y,
      fullscreenButton.radius * 1.05
    );
  }

  public drawEndActions(): void {
    this.endActionsVisible = true;
    const dimensions = GameContext.gameDimensionsModel;
    const width = Math.min(380, dimensions.getWidth() * 0.36);
    const height = 58;
    const x = dimensions.getWidth() * 0.5 - width * 0.5;
    const restartY = dimensions.getHeight() * 0.62;
    const menuY = restartY + height + 18;

    this.drawActionButton(x, restartY, width, height, '#426ea8', 'RESTART');
    this.drawActionButton(x, menuY, width, height, '#72549b', 'GAME SELECTOR');
  }

  public hideEndActions(): void {
    this.endActionsVisible = false;
  }

  public getLayout(): GameControlsLayout {
    const dimensions = GameContext.gameDimensionsModel;
    const padding = GameContext.isPortrait ? 24 : 32;
    const buttonRadius = GameContext.isPortrait ? 46 : 34;
    const buttonDiameter = buttonRadius * 2;
    const gap = 12;
    const resetX = dimensions.getWidth() - padding - buttonRadius;
    const fullscreenX = resetX - buttonDiameter - gap;
    const pauseX = fullscreenX - buttonDiameter - gap;
    const menuX = pauseX - buttonDiameter - gap;

    return {
      pauseButton: {
        x: pauseX,
        y: GameContext.isPortrait ? 66 : 50,
        radius: buttonRadius
      },
      fullscreenButton: {
        x: fullscreenX,
        y: GameContext.isPortrait ? 66 : 50,
        radius: buttonRadius
      },
      resetButton: {
        x: resetX,
        y: GameContext.isPortrait ? 66 : 50,
        radius: buttonRadius
      },
      menuButton: {
        x: menuX,
        y: GameContext.isPortrait ? 66 : 50,
        radius: buttonRadius
      }
    };
  }

  public dispose(): void {
    this.removePointerListener();
  }

  private readonly handlePointerDown = (x: number, y: number): void => {
    const layout = this.getLayout();

    if (this.fullscreenOnly) {
      if (this.containsPoint(layout.fullscreenButton, x, y)) {
        void this.toggleFullscreen();
      } else if (this.endActionsVisible) {
        this.handleEndActionPointer(x, y);
      }
      return;
    }

    if (this.containsPoint(layout.resetButton, x, y)) {
      this.paused = false;
      this.onReset();
      return;
    }

    if (this.containsPoint(layout.fullscreenButton, x, y)) {
      void this.toggleFullscreen();
      return;
    }

    if (this.containsPoint(layout.pauseButton, x, y)) {
      this.paused = !this.paused;
      return;
    }

    if (
      this.onReturnToMenu !== undefined
      && this.containsPoint(layout.menuButton, x, y)
    ) {
      this.onReturnToMenu();
      return;
    }

    if (this.endActionsVisible) {
      this.handleEndActionPointer(x, y);
    }
  };

  private handleEndActionPointer(x: number, y: number): void {
    const dimensions = GameContext.gameDimensionsModel;
    const width = Math.min(380, dimensions.getWidth() * 0.36);
    const height = 58;
    const left = dimensions.getWidth() * 0.5 - width * 0.5;
    const restartY = dimensions.getHeight() * 0.62;
    const menuY = restartY + height + 18;

    if (this.containsRectangle(left, restartY, width, height, x, y)) {
      this.paused = false;
      this.hideEndActions();
      this.onReset();
    } else if (
      this.onReturnToMenu !== undefined
      && this.containsRectangle(left, menuY, width, height, x, y)
    ) {
      this.onReturnToMenu();
    }
  }

  private drawActionButton(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    label: string
  ): void {
    GameContext.drawRect(x, y, width, height, '#11182f');
    GameContext.drawRect(x + 4, y + 4, width - 8, height - 8, color);
    GameContext.drawText(
      label,
      x + width * 0.5,
      y + height * 0.67,
      22,
      '#ffffff',
      'center'
    );
  }

  private drawArcadeButton(circle: GameControlCircle, color: string): void {
    GameContext.drawCircle(
      circle.x,
      circle.y,
      circle.radius,
      'rgba(9, 14, 38, 0.78)'
    );
    GameContext.drawCircle(circle.x, circle.y, circle.radius - 4, color);
    GameContext.drawCircle(
      circle.x,
      circle.y,
      circle.radius - 10,
      'rgba(19, 31, 76, 0.42)'
    );
    GameContext.drawCircle(
      circle.x - circle.radius * 0.28,
      circle.y - circle.radius * 0.28,
      circle.radius * 0.16,
      'rgba(255, 255, 255, 0.35)'
    );
  }

  private drawIcon(
    icon: CanvasIcon,
    x: number,
    y: number,
    size: number
  ): void {
    icon.draw(x - size * 0.5, y - size * 0.5, size);
  }

  private containsPoint(circle: GameControlCircle, x: number, y: number): boolean {
    const distanceX = x - circle.x;
    const distanceY = y - circle.y;

    return distanceX * distanceX + distanceY * distanceY <= circle.radius ** 2;
  }

  private containsRectangle(
    rectangleX: number,
    rectangleY: number,
    width: number,
    height: number,
    x: number,
    y: number
  ): boolean {
    return (
      x >= rectangleX
      && x <= rectangleX + width
      && y >= rectangleY
      && y <= rectangleY + height
    );
  }

  private async toggleFullscreen(): Promise<void> {
    try {
      await GameContext.toggleFullscreen();
    } catch (error) {
      console.error('Failed to change fullscreen mode.', error);
    }
  }
}
