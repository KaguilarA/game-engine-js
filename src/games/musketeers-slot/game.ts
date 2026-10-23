import { signalValue, type SignalValue } from 'reactive-values';
import {
  BaseGame,
  Button,
  GameEvents,
  Texture
} from '../../engine';

import { MusketeersSlotAssets } from './assets';
import { MusketeersSlotRound } from './round';
import { MusketeersSlotRenderer } from './renderer';

/** Five-reel Musketeers slot game, rendered with the engine's Canvas sprites. */
export class MusketeersSlotGame extends BaseGame {
  private readonly spaceWasPressed: SignalValue<boolean>;
  private readonly spinButton: Button;
  private readonly decreaseBetButton = new Button(new Texture({}, 0, 0), {
    onClick: () => {
      const round = this.round;
      if (round) round.bet.set(Math.max(1, round.bet() - 1));
    }
  });
  private readonly increaseBetButton = new Button(new Texture({}, 0, 0), {
    onClick: () => {
      const round = this.round;
      if (round) round.bet.set(Math.min(100, round.bet() + 1));
    }
  });
  private assets: MusketeersSlotAssets | undefined;
  private round: MusketeersSlotRound | undefined;
  private renderer: MusketeersSlotRenderer | undefined;

  public constructor(onReturnToMenu?: () => void) {
    super(onReturnToMenu, { showResetButton: false, menuAlignment: 'left' });
    this.spaceWasPressed = signalValue(false);
    this.spinButton = new Button(new Texture({}, 0, 0), { onClick: () => this.round?.spin() });
    [this.spinButton, this.decreaseBetButton, this.increaseBetButton].forEach((button) => {
      this.registerCleanup(() => button.destroy());
    });
    this.registerCleanup(() => {
      this.assets?.dispose();
    });
    void MusketeersSlotAssets.load().then((assets) => {
      this.assets = assets;
      this.round = new MusketeersSlotRound(assets);
      this.renderer = new MusketeersSlotRenderer(
        assets,
        this.round,
        this.spinButton,
        this.decreaseBetButton,
        this.increaseBetButton,
        (text, x, y, size, color, align, maxWidth) => this.drawLabel(text, x, y, size, color, align, maxWidth)
      );
      this.start();
    }).catch((error: unknown) => {
      console.error('Unable to load the Musketeers slot assets.', error);
    });
  }

  protected updateGame(deltaSeconds: number): void {
    const round = this.round;
    if (!round) return;
    this.spinButton.setBlocked(false);
    this.spinButton.setDisabled(!round.spinning()
      && round.balance() < round.bet() && round.freeSpins() === 0);
    this.decreaseBetButton.setBlocked(round.spinning());
    this.increaseBetButton.setBlocked(round.spinning());
    const spacePressed = GameEvents.isKeyPressed(' ');
    if (spacePressed && !this.spaceWasPressed()) round.spin();
    this.spaceWasPressed.set(spacePressed);
    round.update(deltaSeconds);
  }

  protected drawGame(): void {
    this.renderer?.draw();
  }

  protected restartGame(): void {
    this.round?.restart();
  }

  protected get isGameOver(): boolean { return false; }

  protected onViewportChanged(): void {}


}
