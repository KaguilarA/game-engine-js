import GameContext from '../../engine/core/context';
import GameEvents from '../../engine/input/events';
import { BaseGame } from '../../engine/core/base-game';
import { Atlas } from '../../engine/assets/atlas';
import { AtlasParser } from '../../engine/assets/atlas-parser';
import { Button } from '../../engine/ui/button';
import { Texture } from '../../engine/rendering/texture';
import { signalValue } from 'reactive-values';
import type { SignalValue } from 'reactive-values';
import { Icon } from '../slot-engine/icon';
import { Reel } from '../slot-engine/reel';
import { ReelIcon } from '../slot-engine/reel-icon';
import { evaluatePaylines } from './paylines';

const ASSET_ROOT = '/slot-machine/';
const SYMBOLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'L', 'M', 'T', 'W', 'X', 'Z'];
const REEL_COUNT = 5;
const ROW_COUNT = 3;
const SPINE_SYMBOLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const REEL_OPTIONS = {
  rowCount: ROW_COUNT,
  anticipationDuration: 0.16,
  anticipationLiftCells: 0.5,
  bounceDuration: 0.34,
  accelerationShare: 0.14,
  brakingShare: 0.3
};
/** Five-reel Musketeers slot game, rendered with the engine's Canvas sprites. */
export class MusketeersSlotGame extends BaseGame {
  private readonly images = new Map<string, HTMLImageElement>();
  private readonly reels: Reel[];
  private readonly reelIcons: ReelIcon[][];
  private readonly balance: SignalValue<number> = signalValue(1000);
  private readonly bet: SignalValue<number> = signalValue(10);
  private readonly win: SignalValue<number> = signalValue(0);
  private readonly freeSpins: SignalValue<number> = signalValue(0);
  private readonly spinning: SignalValue<boolean> = signalValue(false);
  private readonly spaceWasPressed: SignalValue<boolean> = signalValue(false);
  private readonly resultMessage: SignalValue<string> = signalValue('¡GIRA Y BUSCA UNA COMBINACIÓN!');
  private readonly winningCells: SignalValue<ReadonlySet<string>> = signalValue<ReadonlySet<string>>(new Set());
  private readonly spinButton = new Button(new Texture({}, 0, 0), { onClick: () => this.spin() });
  private readonly decreaseBetButton = new Button(new Texture({}, 0, 0), {
    onClick: () => this.bet.set(Math.max(1, this.bet() - 1))
  });
  private readonly increaseBetButton = new Button(new Texture({}, 0, 0), {
    onClick: () => this.bet.set(Math.min(100, this.bet() + 1))
  });
  private spinButtonImage: HTMLImageElement | undefined;
  private spinButtonAtlas: Atlas | undefined;
  private readonly icons = new Map<string, Icon>();
  private readonly backgroundLandscape: HTMLImageElement;
  private readonly backgroundPortrait: HTMLImageElement;
  private readonly reelFrame: HTMLImageElement;

  public constructor(onReturnToMenu?: () => void) {
    super(onReturnToMenu, { showResetButton: false });
    this.reels = Array.from({ length: REEL_COUNT }, () => new Reel(
      this.randomColumn(),
      () => this.randomSymbol(),
      REEL_OPTIONS
    ));
    this.reelIcons = this.reels.map((reel) => {
      const icons = Array.from({ length: ROW_COUNT + 2 }, () => new ReelIcon());
      icons.forEach((icon) => reel.add(icon));
      return icons;
    });
    this.backgroundLandscape = this.loadImage('musketeers/images/elements/background/backgroundLandscape/normal.png');
    this.backgroundPortrait = this.loadImage('musketeers/images/elements/background/backgroundPortrait/normal.png');
    this.reelFrame = this.loadImage('musketeers/images/elements/background/reels/normal.png');
    this.spinButtonImage = this.loadImage('common/buttons/btnSpin/spinbutton.png');
    [this.spinButton, this.decreaseBetButton, this.increaseBetButton].forEach((button) => {
      this.registerCleanup(() => button.destroy());
    });
    this.registerCleanup(() => {
      this.icons.forEach((icon) => icon.dispose());
      this.icons.clear();
    });
    void this.loadGameAssets().then(() => this.start());
  }

  protected updateGame(deltaSeconds: number): void {
    this.spinButton.setBlocked(this.spinning());
    this.spinButton.setDisabled(this.balance() < this.bet() && this.freeSpins() === 0);
    this.decreaseBetButton.setBlocked(this.spinning());
    this.increaseBetButton.setBlocked(this.spinning());
    const spacePressed = GameEvents.isKeyPressed(' ');
    if (spacePressed && !this.spaceWasPressed()) this.spin();
    this.spaceWasPressed.set(spacePressed);

    for (const icon of this.icons.values()) icon.update(deltaSeconds);

    if (!this.spinning()) return;
    for (const reel of this.reels) reel.update(deltaSeconds);
    if (this.reels.every((reel) => !reel.isActive())) this.resolveSpin();
  }

  protected drawGame(): void {
    const width = GameContext.gameDimensionsModel.getWidth();
    const height = GameContext.gameDimensionsModel.getHeight();
    GameContext.clear();
    GameContext.drawImage(
      GameContext.isPortrait ? this.backgroundPortrait : this.backgroundLandscape,
      0, 0, width, height
    );
    const board = this.getBoardBounds(width, height);
    this.drawReels(board.x, board.y, board.width, board.height);
    this.drawHud(width, height, board);
  }

  protected restartGame(): void {
    this.balance.set(1000);
    this.bet.set(10);
    this.win.set(0);
    this.freeSpins.set(0);
    this.spinning.set(false);
    this.winningCells.set(new Set());
    this.icons.forEach((icon) => icon.resetWinAnimation());
    this.resultMessage.set('¡GIRA Y BUSCA UNA COMBINACIÓN!');
    this.reels.forEach((reel) => {
      reel.reset(this.randomColumn());
    });
  }

  protected get isGameOver(): boolean { return false; }

  protected onViewportChanged(): void {}

  private loadImage(path: string): HTMLImageElement {
    const image = new Image();
    image.src = `${ASSET_ROOT}${path}`;
    this.images.set(path, image);
    return image;
  }

  private async loadGameAssets(): Promise<void> {
    await Promise.all(Array.from(this.images.values()).map((image) => image.decode()));
    await Promise.all(SYMBOLS.map(async (symbol) => {
      const directory = `${ASSET_ROOT}musketeers/images/icons/${symbol}/`;
      const animatedDirectory = `${directory}animated/`;
      const hasSpine = SPINE_SYMBOLS.includes(symbol);
      const icon = await Icon.load(symbol, {
        normal: `${directory}${symbol}.png`,
        blurred: `${directory}${symbol}_blurred.png`,
        spine: hasSpine
          ? {
              json: `${animatedDirectory}${symbol}.json`,
              atlas: `${animatedDirectory}${symbol}.atlas`
            }
          : undefined
      });
      this.icons.set(symbol, icon);
    }));
    const atlasPath = `${ASSET_ROOT}common/buttons/btnSpin/spinbutton.atlas`;
    const response = await fetch(atlasPath);
    if (response.ok) this.spinButtonAtlas = new Atlas(new AtlasParser().parse(await response.text()));
  }

  private getBoardBounds(width: number, height: number): { x: number; y: number; width: number; height: number } {
    if (GameContext.isPortrait) {
      const boardWidth = Math.min(width * 0.96, height * 0.82 * (1126 / 689));
      const boardHeight = boardWidth * (689 / 1126);
      return { x: (width - boardWidth) / 2, y: height * 0.43 - boardHeight / 2, width: boardWidth, height: boardHeight };
    }
    const boardWidth = Math.min(width * 0.69, height * 0.72 * (1126 / 689));
    const boardHeight = boardWidth * (689 / 1126);
    return { x: (width - boardWidth) / 2, y: height * 0.48 - boardHeight / 2, width: boardWidth, height: boardHeight };
  }

  private drawReels(x: number, y: number, width: number, height: number): void {
    GameContext.drawImage(this.reelFrame, x, y, width, height);
    const insetX = width * 0.035;
    const insetY = height * 0.045;
    const gridX = x + insetX;
    const gridY = y + insetY;
    const gridWidth = width - insetX * 2;
    const gridHeight = height - insetY * 2;
    const cellWidth = gridWidth / REEL_COUNT;
    const cellHeight = gridHeight / ROW_COUNT;
    this.reels.forEach((reel, reelIndex) => {
      const centerX = gridX + cellWidth * (reelIndex + 0.5);
      reel.dimensions.setPosition(centerX - cellWidth * 0.5, gridY);
      reel.dimensions.setSize(cellWidth, gridHeight);
      reel.dimensions.setPivot(0, 0);
      const visibleIcons = reel.getVisibleSymbols().map((visible, index) => {
        const icon = this.reelIcons[reelIndex][index];
        const winning = this.winningCells().has(`${reelIndex}:${visible.row}`);
        icon.setPresentation(this.icons.get(visible.symbol), visible.blurAmount, winning);
        icon.dimensions.setPosition(cellWidth * 0.5, cellHeight * visible.offsetCells);
        icon.dimensions.setSize(cellWidth * 0.86, cellHeight * 0.86);
        return icon;
      });
      reel.setChildren(visibleIcons);
      reel.draw();
    });
  }

  private drawHud(width: number, height: number, board: { x: number; y: number; width: number; height: number }): void {
    const portrait = GameContext.isPortrait;
    const unit = GameContext.viewportUnit();
    const textSize = Math.max(14, Math.min(unit * 0.033, 25));
    const panelY = portrait ? Math.min(height * 0.77, board.y + board.height + unit * 0.04) : height * 0.84;
    this.drawLabel(this.resultMessage(), width * 0.5, board.y - unit * 0.035, textSize, '#ffe487', 'center', width * 0.9);
    this.drawLabel(`CRÉDITOS  ${this.balance().toFixed(2)}`, width * (portrait ? 0.28 : 0.22), panelY, textSize, '#fff2c2', 'center', width * 0.36);
    this.drawLabel(`APUESTA  ${this.bet().toFixed(2)}`, width * (portrait ? 0.73 : 0.52), panelY, textSize, '#fff2c2', 'center', width * 0.34);
    this.drawLabel(`GANANCIA  ${this.win().toFixed(2)}`, width * 0.5, panelY + textSize * 1.5, textSize * 0.86, '#ffe487', 'center', width * 0.7);
    if (this.freeSpins() > 0) {
      this.drawLabel(`GIROS GRATIS  ${this.freeSpins()}`, width * 0.5, panelY - textSize * 1.2, textSize * 0.9, '#79f3ff', 'center', width * 0.8);
    }
    const buttonSize = Math.max(64, Math.min(unit * 0.19, 118));
    const buttonX = portrait ? width * 0.82 : width * 0.82;
    const buttonY = portrait ? panelY + textSize * 1.7 : panelY - textSize * 0.2;
    this.spinButton.dimensions.setPosition(buttonX, buttonY);
    this.spinButton.dimensions.setSize(buttonSize, buttonSize);
    this.spinButton.dimensions.setPivot(0.5, 0.5);
    const spin = this.spinButtonAtlas?.getRegion('normal');
    const spinArrow = this.spinButtonAtlas?.getRegion('spin');
    if (this.spinButtonImage && spin) {
      GameContext.context.drawImage(this.spinButtonImage, spin.x, spin.y, spin.width, spin.height, buttonX - buttonSize / 2, buttonY - buttonSize / 2, buttonSize, buttonSize);
      if (spinArrow) GameContext.context.drawImage(this.spinButtonImage, spinArrow.x, spinArrow.y, spinArrow.width, spinArrow.height, buttonX - buttonSize * 0.35, buttonY - buttonSize * 0.35, buttonSize * 0.7, buttonSize * 0.7);
    } else {
      GameContext.drawCircle(buttonX, buttonY, buttonSize / 2, '#ec9b16');
      this.drawLabel('↻', buttonX, buttonY + buttonSize * 0.22, buttonSize * 0.65, '#fff6d5', 'center');
    }
    const betButtonRadius = Math.max(18, buttonSize * 0.28);
    const betY = panelY;
    const betButtonSize = betButtonRadius * 2.4;
    this.decreaseBetButton.dimensions.setPosition(width * 0.37, betY);
    this.decreaseBetButton.dimensions.setSize(betButtonSize, betButtonSize);
    this.decreaseBetButton.dimensions.setPivot(0.5, 0.5);
    this.increaseBetButton.dimensions.setPosition(width * 0.66, betY);
    this.increaseBetButton.dimensions.setSize(betButtonSize, betButtonSize);
    this.increaseBetButton.dimensions.setPivot(0.5, 0.5);
    this.drawButton(width * 0.37, betY, betButtonRadius, '−', textSize, '#9b4420');
    this.drawButton(width * 0.66, betY, betButtonRadius, '+', textSize, '#9b4420');
  }

  private drawButton(x: number, y: number, radius: number, label: string, size: number, color: string): void {
    GameContext.drawCircle(x, y, radius, 'rgba(30,12,7,0.75)');
    GameContext.drawCircle(x, y - 2, radius * 0.85, color);
    this.drawLabel(label, x, y + size * 0.28, size * 1.25, '#fff4d1', 'center');
  }

  private spin(): void {
    if (this.spinning() || this.balance() < this.bet()) return;
    if (this.freeSpins() > 0) this.freeSpins.set(this.freeSpins() - 1);
    else this.balance.set(this.balance() - this.bet());
    this.win.set(0);
    this.winningCells.set(new Set());
    this.icons.forEach((icon) => icon.resetWinAnimation());
    this.resultMessage.set('¡BUENA SUERTE!');
    this.spinning.set(true);
    this.reels.forEach((reel, index) => {
      const debugResult = this.randomColumn();
      debugResult[1] = 'A';
      reel.startSpin(debugResult, 18 + index * 3, 1.55 + index * 0.23);
    });
  }

  private resolveSpin(): void {
    this.spinning.set(false);
    const result = evaluatePaylines(this.reels.map((reel) => reel.symbols()), this.bet());
    const { win: total, winningCells } = result;
    this.win.set(total);
    this.winningCells.set(winningCells);
    winningCells.forEach((cell) => {
      const [reelIndex, row] = cell.split(':').map(Number);
      const symbol = this.reels[reelIndex]?.symbols()[row];
      if (symbol) this.icons.get(symbol)?.activateWinAnimation();
    });
    if (total > 0) {
      this.balance.set(this.balance() + total);
      this.resultMessage.set(`¡GANASTE ${total.toFixed(2)}!`);
    } else if (winningCells.size === 0) {
      this.resultMessage.set('SIN PREMIO — ¡OTRA VEZ!');
    }
  }

  private randomColumn(): string[] {
    return Array.from({ length: ROW_COUNT }, () => this.randomSymbol());
  }

  private randomSymbol(): string {
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  }

}
