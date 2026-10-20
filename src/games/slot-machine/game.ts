import GameContext from '../../engine/core/context';
import { MathUtils } from '../../engine/core/math-utils';
import GameEvents from '../../engine/input/events';
import { BaseGame } from '../../engine/core/base-game';
import GameLoader from '../../engine/assets/loader';
import Sprite from '../../engine/animations/sprites/sprite';
import { PhysicsBody } from '../../engine/core/physics';
import CanvasIcon from '../../engine/rendering/canvas-icon';
import { signalValue } from 'reactive-values';
import { Button } from '../../engine/ui/button';
import { NumberLabel } from '../../engine/ui/number-label';
import { Label } from '../../engine/ui/label';
import { Texture } from '../../engine/rendering/texture';
import resetSvg from 'lucide-static/icons/rotate-ccw.svg?raw';
import type { Reel } from './interfaces/reel';

const ALIEN_SYMBOLS = [
  'beetlemorph',
  'rhinomorph',
  'lobstermorph',
  'eaglemorph',
  'phantommorph',
  'squidmorph'
] as const;
const REEL_STOP_TIMES = [0.65, 0.9, 1.15];
const REEL_BOUNCE_DURATION = 0.48;

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
  private readonly reels: Reel[] = [
    this.createReel(0),
    this.createReel(1),
    this.createReel(2)
  ];
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
   * Advances reel motion, staggered stopping, rebound settling, and payout checks.
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
    const cellHeight = this.getReelCellHeight();
    this.reels.forEach((reel, index) => {
      if (
        this.winningSymbol() !== undefined
        && this.winningReels().has(index)
      ) {
        reel.sprites[this.winningSymbol()!].update(deltaSeconds);
      }
      if (!reel.moving()) return;

      reel.elapsed.set(Math.min(reel.duration(), reel.elapsed() + deltaSeconds));
      if (reel.elapsed() >= reel.duration()) {
        reel.motion.y.set(reel.targetDistance());
        reel.motion.velocityY.set(0);
        reel.moving.set(false);
        reel.bouncing.set(true);
        reel.bounceElapsed.set(0);
        reel.bounceOffset.set(0);
        return;
      }

      reel.motion.update(deltaSeconds, reel.brakingAcceleration());
    });

    this.reels.forEach((reel) => {
      if (!reel.bouncing()) return;

      reel.bounceElapsed.set(Math.min(
        REEL_BOUNCE_DURATION,
        reel.bounceElapsed() + deltaSeconds
      ));
      const progress = reel.bounceElapsed() / REEL_BOUNCE_DURATION;
      reel.bounceOffset.set(progress >= 1
        ? 0
        : cellHeight * 0.14
          * Math.exp(-6 * progress)
          * Math.sin(Math.PI * 4 * progress));
      if (progress >= 1) reel.bouncing.set(false);
    });

    this.reels.forEach((reel) => {
      const travel = reel.motion.y() + reel.bounceOffset();
      const passedCells = Math.floor(travel / cellHeight);
      reel.cursor.set((
        reel.startCursor() - passedCells + ALIEN_SYMBOLS.length * 100
      ) % ALIEN_SYMBOLS.length);
    });

    if (this.spinning() && this.reels.every((reel) => !reel.moving() && !reel.bouncing())) {
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
      const cellHeight = reelHeight / 3;
      const travel = reel.motion.y() + reel.bounceOffset();
      const scrollOffset = reel.moving() || reel.bouncing()
        ? ((travel % cellHeight) + cellHeight) % cellHeight
        : 0;
      GameContext.withClip(x + 5, reelY + 5, reelWidth - 10, reelHeight - 10, () => {
        for (let row = -1; row <= 3; row++) {
          const symbolIndex = (
            reel.cursor() + row + ALIEN_SYMBOLS.length * 10
          ) % ALIEN_SYMBOLS.length;
          const alien = reel.sprites[symbolIndex];
          const alienSize = Math.min(cellHeight * 0.78, reelWidth - 18);
          alien.dimensions.setSize(alienSize, alienSize);
          alien.dimensions.setPosition(
            x + (reelWidth - alienSize) * 0.5,
            reelY + row * cellHeight + scrollOffset + (cellHeight - alienSize) * 0.5
          );
          alien.draw();
        }
      });
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
    this.reels.forEach((reel, index) => {
      reel.result.set(index);
      reel.cursor.set((index + ALIEN_SYMBOLS.length - 1) % ALIEN_SYMBOLS.length);
      reel.startCursor.set(reel.cursor());
      reel.elapsed.set(0);
      reel.motion.y.set(0);
      reel.motion.velocityY.set(0);
      reel.targetDistance.set(0);
      reel.brakingAcceleration.set(0);
      reel.duration.set(0);
      reel.moving.set(false);
      reel.bouncing.set(false);
      reel.bounceElapsed.set(0);
      reel.bounceOffset.set(0);
    });
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
    const cellHeight = this.getReelCellHeight();
    this.reels.forEach((reel, index) => {
      reel.result.set(Math.floor(Math.random() * ALIEN_SYMBOLS.length));
      reel.elapsed.set(0);
      reel.startCursor.set(reel.cursor());
      const stepsToResult = (
        (reel.cursor() + 1 - reel.result() + ALIEN_SYMBOLS.length)
        % ALIEN_SYMBOLS.length
      );
      const extraLoops = 3 + index;
      const travelSteps = stepsToResult + extraLoops * ALIEN_SYMBOLS.length;
      reel.targetDistance.set(travelSteps * cellHeight);
      reel.duration.set(REEL_STOP_TIMES[index] + 1.2);
      const initialSpeed = (2 * reel.targetDistance()) / reel.duration();
      reel.brakingAcceleration.set(-initialSpeed / reel.duration());
      reel.motion.y.set(0);
      reel.motion.velocityY.set(initialSpeed);
      reel.moving.set(true);
      reel.bouncing.set(false);
      reel.bounceElapsed.set(0);
      reel.bounceOffset.set(0);
    });
  }

  /**
   * Evaluates the stopped center symbols and applies the corresponding payout.
   * @private
   * @return {void}
   */
  private resolvePayout(): void {
    const [first, second, third] = this.reels.map((reel) => reel.result());
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
    reelIndices.forEach((index) => {
      const name = ALIEN_SYMBOLS[symbol];
      this.reels[index].sprites[symbol].playAtlasClip(
        GameLoader.getAtlas(name).getAnimation('idle')
      );
    });
  }

  /**
   * Clears the previous win state and resets its animated symbols.
   * @private
   * @return {void}
   */
  private stopWinningAnimation(): void {
    if (this.winningSymbol() === undefined) return;

    const symbol = this.winningSymbol()!;
    const name = ALIEN_SYMBOLS[symbol];
    this.winningReels().forEach((index) => {
      this.reels[index].sprites[symbol].playAtlasClip(
        GameLoader.getAtlas(name).getAnimation('idle')
      );
    });
    this.winningReels.set(new Set());
    this.winningSymbol.set(undefined);
  }

  /**
   * Creates a reel model and loads one idle sprite for every supported alien.
   * @param initialSymbol - Symbol index shown when the reel is initialized.
   * @private
   * @return {Reel} The initialized reactive reel model.
   */
  private createReel(initialSymbol: number): Reel {
    const sprites = ALIEN_SYMBOLS.map((name) => {
      const sprite = new Sprite(GameLoader.getImage(name), 80, 80);
      sprite.playAtlasClip(GameLoader.getAtlas(name).getAnimation('idle'));
      return sprite;
    });

    const cursor = (initialSymbol + ALIEN_SYMBOLS.length - 1) % ALIEN_SYMBOLS.length;
    return {
      result: signalValue(initialSymbol),
      cursor: signalValue(cursor),
      startCursor: signalValue(cursor),
      elapsed: signalValue(0),
      motion: new PhysicsBody(),
      targetDistance: signalValue(0),
      brakingAcceleration: signalValue(0),
      duration: signalValue(0),
      moving: signalValue(false),
      bouncing: signalValue(false),
      bounceElapsed: signalValue(0),
      bounceOffset: signalValue(0),
      sprites
    };
  }

  /**
   * Calculates the height of one symbol cell from the current viewport.
   * @private
   * @return {number} Height of one visible reel cell.
   */
  private getReelCellHeight(): number {
    const height = GameContext.gameDimensionsModel.getHeight();
    const cabinetHeight = Math.min(height * 0.6, 390);
    return cabinetHeight * 0.48 / 3;
  }

}
