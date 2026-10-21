import { signalValue } from 'reactive-values';
import type { SignalValue } from 'reactive-values';

import GameContext from '../../engine/core/context';
import Sprite from '../../engine/animations/sprites/sprite';
import type { ReelSymbolVisual } from '../../engine/slots/interfaces/reel-symbol-visual';
import type { CosmicSymbolAsset } from './interfaces/cosmic-symbol-asset';

/** Keeps per-cell atlas playback while reusing Cosmic Jackpot's own symbols. */
export class CosmicSymbolVisual implements ReelSymbolVisual {
  private readonly symbol: SignalValue<string> = signalValue('');
  private readonly winning: SignalValue<boolean> = signalValue(false);
  private readonly assets: ReadonlyMap<string, CosmicSymbolAsset>;
  private readonly sprites = new Map<string, Sprite>();

  public constructor(assets: ReadonlyMap<string, CosmicSymbolAsset>) {
    this.assets = assets;
  }

  public setSymbol(symbol: string): void {
    if (this.symbol() === symbol) return;
    this.symbol.set(symbol);
    if (this.winning()) this.restartSelectedAnimation();
  }

  public setWinning(isWinning: boolean): void {
    if (this.winning() === isWinning) return;
    this.winning.set(isWinning);
    this.restartSelectedAnimation();
  }

  public update(deltaSeconds: number, isWinning = false): void {
    if (!isWinning) return;
    this.getSprite()?.update(deltaSeconds);
  }

  public draw(
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    blurAmount = 0
  ): void {
    const sprite = this.getSprite();
    if (!sprite) return;
    sprite.dimensions.setPosition(centerX, centerY);
    sprite.dimensions.setSize(width, height);

    const context = GameContext.context;
    context.save();
    context.filter = blurAmount > 0
      ? `blur(${Math.min(width, height) * 0.035 * blurAmount}px)`
      : 'none';
    try {
      sprite.draw();
    } finally {
      context.restore();
    }
  }

  private getSprite(): Sprite | undefined {
    const name = this.symbol();
    if (!name) return undefined;
    const cached = this.sprites.get(name);
    if (cached) return cached;
    const asset = this.assets.get(name);
    if (!asset) return undefined;
    const sprite = new Sprite(asset.image, 80, 80, 0, 0, 0.5, 0.5);
    sprite.playAtlasClip(asset.idleAnimation);
    this.sprites.set(name, sprite);
    return sprite;
  }

  private restartSelectedAnimation(): void {
    const name = this.symbol();
    const sprite = this.sprites.get(name);
    const asset = this.assets.get(name);
    if (sprite && asset) sprite.playAtlasClip(asset.idleAnimation);
  }
}
