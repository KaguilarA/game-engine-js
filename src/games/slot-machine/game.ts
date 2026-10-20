import GameContext from '../../engine/core/context';
import { MathUtils } from '../../engine/core/math-utils';
import GameEvents from '../../engine/input/events';
import { BaseGame } from '../../engine/core/base-game';
import GameLoader from '../../engine/assets/loader';
import CanvasIcon from '../../engine/rendering/canvas-icon';
import { signalValue } from 'reactive-values';
import { Button } from '../../engine/ui/button';
import { NumberLabel } from '../../engine/ui/number-label';
import { Label } from '../../engine/ui/label';
import { Texture } from '../../engine/rendering/texture';
import resetSvg from 'lucide-static/icons/rotate-ccw.svg?raw';
import { Reel, ReelAnimationProfile, ReelIcon } from '../slot-engine';
import { CosmicSymbolVisual } from './cosmic-symbol-visual';
import type { CosmicSymbolAsset } from './interfaces/cosmic-symbol-asset';

const ALIEN_SYMBOLS = [
  'beetlemorph',
  'rhinomorph',
  'lobstermorph',
  'eaglemorph',
  'phantommorph',
  'squidmorph'
] as const;
const ROW_COUNT = 3;
const REEL_COUNT = 3;
const REEL_OPTIONS = ReelAnimationProfile.createOptions(ROW_COUNT);

/**
 * Three-reel arcade slot machine with credits, wagers, and animated payouts.
 * @class SlotMachineGame
 */
export class SlotMachineGame extends BaseGame {
  /**
   * Holds the three reel models whose reactive motion and outcomes drive the game.
   * @property {Reel[]} reels
   * @private
   * @readonly
   */
  private readonly reels: Reel[];
  private readonly reelIcons: ReelIcon[][];
  private readonly symbolVisuals: CosmicSymbolVisual[][];
  /**
   * Tracks credits available for future wagers.
   * @property {SignalValue<number>} credits
   * @private
   * @readonly
   */
  private readonly credits = signalValue(100);
  /**
   * Defines the fixed credit cost of each spin.
   * @property {number} bet
   * @private
   * @readonly
   */
  private readonly bet = 10;
  /**
   * Tracks whether at least one reel is still resolving the current spin.
   * @property {SignalValue<boolean>} spinning
   * @private
   * @readonly
   */
  private readonly spinning = signalValue(false);
  /**
   * Remembers the prior keyboard state so one press starts only one spin.
   * @property {SignalValue<boolean>} spaceWasPressed
   * @private
   * @readonly
   */
  private readonly spaceWasPressed = signalValue(false);
  /**
   * Stores the message displayed beneath the reels.
   * @property {SignalValue<string>} message
   * @private
   * @readonly
   */
  private readonly message = signalValue('MATCH SYMBOLS TO WIN');
  /**
   * Stores the reel indices whose center symbols are currently animated as winners.
   * @property {SignalValue<ReadonlySet<number>>} winningReels
   * @private
   * @readonly
   */
  private readonly winningReels = signalValue<ReadonlySet<number>>(new Set());
  /**
   * Stores the symbol index shared by the active winning combination, if any.
   * @property {SignalValue<number | undefined>} winningSymbol
   * @private
   * @readonly
   */
  private readonly winningSymbol = signalValue<number | undefined>(undefined);
  /**
   * Draws the reset symbol used for the slot machine's spin action.
   * @property {CanvasIcon} spinIcon
   * @private
   * @readonly
   */
  private readonly spinIcon = new CanvasIcon(resetSvg, '#493500');
  /** @property {Button} spinButton */
  private readonly spinButton: Button;
  /** @property {NumberLabel} creditsLabel */
  private readonly creditsLabel = new NumberLabel(100, {
    width: 220, height: 30, align: 'center', color: '#ffffff', fontSize: 24
  }, { mode: 'count', locale: 'en-US' });
  /** @property {Label} messageLabel */
  private readonly messageLabel = new Label('MATCH SYMBOLS TO WIN', {
    width: 300, height: 24, align: 'center', color: '#b6c5ff', fontSize: 17
  });
  /**
   * Holds the disposer for the pointer listener registered by this game.
   * @property {() => void} removePointerListener
   * @private
   * @readonly
   */

  /**
   * Registers pointer input, installs its cleanup, and starts the game loop.
   * @param onReturnToMenu - Optional callback invoked when the player exits.
   * @public
   * @return {void}
   */
  public constructor(onReturnToMenu?: () => void) {
    super(onReturnToMenu, { showResetButton: false });
    const symbolAssets = new Map<string, CosmicSymbolAsset>(ALIEN_SYMBOLS.map((symbol) => [symbol, {
      image: GameLoader.getImage(symbol),
      idleAnimation: GameLoader.getAtlas(symbol).getAnimation('idle')
    }]));
    this.reels = Array.from({ length: REEL_COUNT }, () => new Reel(
      this.randomColumn(),
      () => this.randomSymbol(),
      REEL_OPTIONS
    ));
    this.symbolVisuals = this.reels.map(() => Array.from(
      { length: ROW_COUNT + 2 },
      () => new CosmicSymbolVisual(symbolAssets)
    ));
    this.reelIcons = this.reels.map((reel, reelIndex) => {
      const icons = this.symbolVisuals[reelIndex].map((visual) => {
        const icon = new ReelIcon();
        icon.setPresentation(visual, 0, false);
        reel.add(icon);
        return icon;
      });
      return icons;
    });
    const spinTexture = new Texture({}, 72, 72, 0, 0);
    this.spinButton = new Button(spinTexture, {
      shape: 'circle',
      onClick: () => this.spin()
    });
    this.registerCleanup(() => this.spinButton.destroy());
    this.start();
  }

  /**
   * Reports whether the player lacks enough credits to place another wager.
   * @protected
   * @return {boolean} Whether the round has ended.
   */
  protected get isGameOver(): boolean {
    return this.credits() < this.bet && !this.spinning();
  }

  /**
   * Advances the shared reel motion and resolves the round after every reel settles.
   * @param deltaSeconds - Time elapsed since the preceding game update.
   * @protected
   * @return {void}
   */
  protected updateGame(deltaSeconds: number): void {
    const spacePressed = GameEvents.isKeyPressed(' ');
    if (spacePressed && !this.spaceWasPressed()) this.spin();
    this.spaceWasPressed.set(spacePressed);
    this.spinButton.setDisabled(this.credits() < this.bet);
    this.spinButton.setBlocked(this.spinning());
    this.reels.forEach((reel) => reel.update(deltaSeconds));
    if (this.spinning() && this.reels.every((reel) => !reel.isActive())) {
      this.spinning.set(false);
      this.resolvePayout();
    }
  }

  /**
   * Renders the responsive cabinet, reel windows, credit message, and spin button.
   * @protected
   * @return {void}
   */
  protected drawGame(): void {
    const dimensions = GameContext.gameDimensionsModel;
    const width = dimensions.getWidth();
    const height = dimensions.getHeight();
    const unit = GameContext.viewportUnit();
    const centerX = width * 0.5;
    const centerY = height * 0.48;
    const cabinetWidth = Math.min(width * 0.86, 540);
    const cabinetHeight = Math.min(height * 0.6, 390);
    const cabinetX = centerX - cabinetWidth * 0.5;
    const cabinetY = centerY - cabinetHeight * 0.5;
    const reelGap = Math.min(16, cabinetWidth * 0.035);
    const reelWidth = (cabinetWidth * 0.78 - reelGap * 2) / 3;
    const reelHeight = cabinetHeight * 0.48;
    const reelY = cabinetY + cabinetHeight * 0.27;
    const reelStartX = centerX - (reelWidth * 3 + reelGap * 2) * 0.5;

    GameContext.clear();
    this.drawBackground(width, height);
    GameContext.drawRect(cabinetX, cabinetY, cabinetWidth, cabinetHeight, '#17152c');
    GameContext.drawRect(cabinetX + 7, cabinetY + 7, cabinetWidth - 14, cabinetHeight - 14, '#7650a0');
    GameContext.drawRect(cabinetX + 14, cabinetY + 14, cabinetWidth - 28, cabinetHeight - 28, '#292044');
    this.drawLabel(
      'COSMIC JACKPOT', centerX, cabinetY + cabinetHeight * 0.19,
      MathUtils.clamp(unit * 0.052, 20, 38), '#ffe27a', 'center', cabinetWidth * 0.9
    );

    this.reels.forEach((reel, index) => {
      const x = reelStartX + index * (reelWidth + reelGap);
      GameContext.drawRect(x, reelY, reelWidth, reelHeight, '#11152a');
      GameContext.drawRect(x + 5, reelY + 5, reelWidth - 10, reelHeight - 10, '#f4f0ff');
      const innerX = x + 5;
      const innerY = reelY + 5;
      const innerWidth = reelWidth - 10;
      const innerHeight = reelHeight - 10;
      const cellHeight = innerHeight / ROW_COUNT;
      reel.dimensions.setPosition(innerX, innerY);
      reel.dimensions.setSize(innerWidth, innerHeight);
      reel.dimensions.setPivot(0, 0);
      const visibleIcons = reel.getVisibleSymbols().map((visible, visibleIndex) => {
        const icon = this.reelIcons[index][visibleIndex];
        const visual = this.symbolVisuals[index][visibleIndex];
        const winning = this.winningSymbol() !== undefined
          && this.winningReels().has(index)
          && visible.symbol === ALIEN_SYMBOLS[this.winningSymbol()!];
        icon.setPresentation(visual, visible.blurAmount, winning, visible.symbol);
        const size = Math.min(cellHeight * 0.78, innerWidth - 12);
        icon.dimensions.setPosition(innerWidth * 0.5, cellHeight * visible.offsetCells);
        icon.dimensions.setSize(size, size);
        return icon;
      });
      reel.setChildren(visibleIcons);
      reel.draw();
    });

    this.creditsLabel.setValue(this.credits());
    this.creditsLabel.setText(`CREDITS  ${this.creditsLabel.getText()}`);
    this.creditsLabel.setStyle({ fontSize: Math.max(16, Math.min(unit * 0.034, 24)) });
    this.creditsLabel.dimensions.setPosition(centerX, cabinetY + cabinetHeight * 0.83);
    this.creditsLabel.dimensions.setWidth(cabinetWidth * 0.9);
    this.creditsLabel.draw();
    this.messageLabel.setText(this.message());
    this.messageLabel.setStyle({ fontSize: Math.max(12, Math.min(unit * 0.025, 17)) });
    this.messageLabel.dimensions.setPosition(centerX, cabinetY + cabinetHeight * 0.9);
    this.messageLabel.dimensions.setWidth(cabinetWidth * 0.9);
    this.messageLabel.draw();

    const buttonSize = Math.max(56, Math.min(unit * 0.1, 72));
    const buttonRadius = buttonSize * 0.5;
    const buttonCenterY = Math.min(
      height - buttonRadius - 30,
      cabinetY + cabinetHeight + 30 + buttonRadius
    );
    this.spinButton.dimensions.setPosition(centerX, buttonCenterY);
    this.spinButton.dimensions.setSize(buttonSize, buttonSize);
    GameContext.drawCircle(centerX, buttonCenterY, buttonRadius, '#382600');
    GameContext.drawCircle(centerX, buttonCenterY, buttonRadius - 3, '#d89b00');
    GameContext.drawCircle(
      centerX,
      buttonCenterY - 1,
      buttonRadius - 7,
      this.spinning() ? '#e9bd43' : '#ffd43b'
    );
    GameContext.drawCircle(
      centerX - buttonRadius * 0.28,
      buttonCenterY - buttonRadius * 0.3,
      buttonRadius * 0.13,
      'rgba(255, 255, 230, 0.55)'
    );
    const iconSize = buttonSize * 0.52;
    this.spinIcon.draw(
      centerX - iconSize * 0.5,
      buttonCenterY - iconSize * 0.5,
      iconSize
    );
    if (this.isGameOver) {
      this.drawLabel(
        'OUT OF CREDITS', centerX, height * 0.73,
        MathUtils.clamp(unit * 0.05, 20, 34), '#ffffff', 'center', width * 0.85
      );
    }
  }

  /**
   * Restores the starting credits and resets every reel for a fresh round.
   * @protected
   * @return {void}
   */
  protected restartGame(): void {
    this.credits.set(100);
    this.spinning.set(false);
    this.spaceWasPressed.set(false);
    this.message.set('MATCH SYMBOLS TO WIN');
    this.stopWinningAnimation();
    this.reels.forEach((reel) => reel.reset(this.randomColumn()));
  }

  /**
   * Draws the orientation-specific background and darkens it behind the cabinet.
   * @param width - Width of the game viewport in world units.
   * @param height - Height of the game viewport in world units.
   * @private
   * @return {void}
   */
  private drawBackground(width: number, height: number): void {
    GameContext.drawImage(
      GameLoader.getImage(GameContext.isPortrait ? 'background1080x1920' : 'background1920x1080'),
      0, 0, width, height
    );
    GameContext.drawRect(0, 0, width, height, 'rgba(13, 10, 29, 0.56)');
  }

  /**
   * Deducts the wager and starts each reel toward its fixed result.
   * @private
   * @return {void}
   */
  private spin(): void {
    if (this.spinning() || this.credits() < this.bet) return;

    this.credits.set(this.credits() - this.bet);
    this.spinning.set(true);
    this.message.set('GOOD LUCK!');
    this.stopWinningAnimation();
    this.reels.forEach((reel, index) => {
      const plan = ReelAnimationProfile.getSpinPlan(index);
      reel.startSpin(this.randomColumn(), plan.travelCells, plan.duration);
    });
  }

  /**
   * Evaluates the stopped center symbols and applies the corresponding payout.
   * @private
   * @return {void}
   */
  private resolvePayout(): void {
    const [first, second, third] = this.reels.map((reel) => (
      ALIEN_SYMBOLS.indexOf(reel.symbols()[1] as typeof ALIEN_SYMBOLS[number])
    ));
    if (first === second && second === third) {
      this.startWinningAnimation(first, [0, 1, 2]);
      const multiplier = first === ALIEN_SYMBOLS.length - 1 ? 10 : 5;
      const payout = this.bet * multiplier;
      this.credits.set(this.credits() + payout);
      this.message.set(first === ALIEN_SYMBOLS.length - 1 ? `JACKPOT! +${payout}` : `THREE MATCH! +${payout}`);
    } else if (first === second || second === third) {
      const symbol = first === second ? first : second;
      const reelIndices = first === second ? [0, 1] : [1, 2];
      this.startWinningAnimation(symbol, reelIndices);
      this.credits.set(this.credits() + this.bet * 2);
      this.message.set(`PAIR! +${this.bet * 2}`);
    } else {
      this.message.set('NO MATCH — TRY AGAIN');
    }
  }

  /**
   * Starts the idle atlas animation on each reel participating in a win.
   * @param symbol - Index of the winning alien symbol.
   * @param reelIndices - Reel indices included in the winning combination.
   * @private
   * @return {void}
   */
  private startWinningAnimation(symbol: number, reelIndices: number[]): void {
    this.winningSymbol.set(symbol);
    this.winningReels.set(new Set(reelIndices));
  }

  /**
   * Clears the previous win state and resets its animated symbols.
   * @private
   * @return {void}
   */
  private stopWinningAnimation(): void {
    this.winningReels.set(new Set());
    this.winningSymbol.set(undefined);
  }

  private randomColumn(): string[] {
    return Array.from({ length: ROW_COUNT }, () => this.randomSymbol());
  }

  private randomSymbol(): string {
    return ALIEN_SYMBOLS[Math.floor(Math.random() * ALIEN_SYMBOLS.length)];
  }
}
