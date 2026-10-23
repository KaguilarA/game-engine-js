import { signalValue } from 'reactive-values';
import {
  BaseGame,
  GameBackground,
  GameContext,
  GameEvents,
  GameLoader,
  type GamePointer
} from '../../engine';

import { ScratchIcon } from './scratch-icon';
import { ScratchSurface } from './scratch-surface';

const SYMBOLS = [
  'beetlemorph', 'rhinomorph', 'lobstermorph',
  'eaglemorph', 'phantommorph', 'squidmorph'
] as const;
const PRIZES = [20, 50, 100, 250, 500, 1000] as const;
const WIN_ANIMATION_DURATION = 2;

/** Coordinates scratch-card rules and rendering through the shared game lifecycle. */
export class ScratchCardGame extends BaseGame {
  private readonly icons = signalValue<readonly ScratchIcon[]>([]);
  private readonly scratchSurface = new ScratchSurface(() => this.getCardBounds());
  private readonly revealed = this.scratchSurface.revealed;
  private readonly winAnimationElapsed = signalValue(0);
  private readonly winAnimationStarted = signalValue(false);
  private readonly removePointerListeners: Array<() => void>;

  public constructor(onReturnToMenu?: () => void) {
    super(onReturnToMenu, { showResetButton: false });
    this.removePointerListeners = [
      GameEvents.addPointerDownListener(this.handlePointerDown),
      GameEvents.addPointerMoveListener(this.handlePointerMove),
      GameEvents.addPointerEndListener(this.handlePointerEnd)
    ];
    this.registerCleanup(() => this.removePointerListeners.forEach((remove) => remove()));
    this.resetCard();
    this.start();
  }

  protected get isGameOver(): boolean {
    return this.revealed() && (!this.hasWinningMatch() || this.winAnimationElapsed() >= WIN_ANIMATION_DURATION);
  }

  protected updateGame(deltaSeconds: number): void {
    this.scratchSurface.update(deltaSeconds);
    if (!this.revealed() || !this.hasWinningMatch()) return;
    if (!this.winAnimationStarted()) {
      this.winAnimationStarted.set(true);
      this.icons().forEach((icon) => icon.setWinning(true));
    }
    this.icons().forEach((icon) => icon.update(deltaSeconds));
    this.winAnimationElapsed.set(this.winAnimationElapsed() + deltaSeconds);
  }

  protected drawGame(): void {
    const bounds = this.getCardBounds();
    const { x, y, width, height } = bounds;
    const viewport = GameContext.gameDimensionsModel;
    GameContext.clear();
    GameBackground.draw(
      GameLoader.getImage('background1080x1920'),
      GameLoader.getImage('background1920x1080'),
      'rgba(13, 10, 29, 0.56)'
    );

    this.drawText('LUCKY SCRATCH', viewport.getWidth() * 0.5, y - 36, 25, '#ffe27a');
    GameContext.drawRect(x, y, width, height, '#e8c35e');
    GameContext.drawRect(x + 5, y + 5, width - 10, height - 10, '#173d4a');
    this.drawText('MATCH 3 SYMBOLS TO WIN', viewport.getWidth() * 0.5, y + 34, 14, '#c9f4e8');

    const cellWidth = (width - 48) / 3;
    this.icons().forEach((icon, index) => {
      const cellX = x + 16 + index * (cellWidth + 8);
      const cellY = y + 66;
      const cellHeight = height - 118;
      GameContext.drawRect(cellX, cellY, cellWidth, cellHeight, '#0d2735');
      icon.draw(cellX + cellWidth / 2, cellY + cellHeight / 2, Math.min(cellWidth * 0.7, cellHeight * 0.65));
    });

    this.scratchSurface.draw(bounds);
    if (this.revealed()) {
      const winning = this.hasWinningMatch();
      const prize = winning ? PRIZES[SYMBOLS.indexOf(this.icons()[0].symbol as typeof SYMBOLS[number])] : 0;
      this.drawText(winning ? `YOU WIN  $${prize}!` : 'NO MATCH — TRY AGAIN',
        viewport.getWidth() * 0.5, y + height + 42, 23, winning ? '#ffe27a' : '#ffffff');
    } else {
      this.drawText('RUB THE CARD TO REVEAL', viewport.getWidth() * 0.5,
        y + height + 42, 15, '#c9f4e8');
    }
  }

  protected restartGame(): void {
    this.resetCard();
  }

  protected onViewportChanged(): void {
    this.scratchSurface.resize();
  }

  private readonly handlePointerDown = (pointer: GamePointer): void => {
    if (this.controls.isPaused || this.revealed()) return;
    this.scratchSurface.begin(pointer);
  };

  private readonly handlePointerMove = (pointer: GamePointer): void => {
    if (this.controls.isPaused || this.revealed()) {
      this.scratchSurface.cancel();
      return;
    }
    this.scratchSurface.move(pointer);
  };

  private readonly handlePointerEnd = (_pointer: GamePointer): void => {
    this.scratchSurface.end();
  };

  private resetCard(): void {
    const symbols = this.createCardSymbols();
    this.icons.set(symbols.map((symbol) => new ScratchIcon(symbol)));
    this.winAnimationElapsed.set(0);
    this.winAnimationStarted.set(false);
    this.scratchSurface.reset();
  }

  private createCardSymbols(): readonly string[] {
    const first = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    if (Math.random() < 0.35) return [first, first, first];
    return [
      first,
      SYMBOLS[(SYMBOLS.indexOf(first) + 1) % SYMBOLS.length],
      SYMBOLS[(SYMBOLS.indexOf(first) + 2) % SYMBOLS.length]
    ];
  }

  private hasWinningMatch(): boolean {
    const [first, second, third] = this.icons();
    return first !== undefined && first.symbol === second?.symbol && second.symbol === third?.symbol;
  }

  private getCardBounds(): { x: number; y: number; width: number; height: number } {
    const dimensions = GameContext.gameDimensionsModel;
    const width = Math.min(dimensions.getWidth() * 0.88, 480);
    const height = Math.max(250, Math.min(dimensions.getHeight() * 0.48, 330));
    return {
      x: (dimensions.getWidth() - width) / 2,
      y: (dimensions.getHeight() - height) / 2,
      width,
      height
    };
  }

  private drawText(text: string, x: number, y: number, size: number, color: string): void {
    GameContext.drawText(text, x, y, size, color, 'center', GameContext.gameDimensionsModel.getWidth() * 0.9);
  }
}
