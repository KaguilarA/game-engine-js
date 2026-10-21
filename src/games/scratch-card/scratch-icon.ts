import { signalValue } from 'reactive-values';

import GameLoader from '../../engine/assets/loader';
import Sprite from '../../engine/animations/sprites/sprite';

/** Owns one scratch-card symbol and its static or winning animation state. */
export class ScratchIcon {
  public readonly symbol: string;

  private readonly sprite: Sprite;
  private readonly winning = signalValue(false);

  public constructor(symbol: string) {
    this.symbol = symbol;
    this.sprite = new Sprite(GameLoader.getImage(symbol), 80, 80, 0, 0, 0.5, 0.5);
    this.sprite.playAtlasClip(GameLoader.getAtlas(symbol).getAnimation('idle'));
    this.sprite.setFrame(0);
  }

  /** Enables or stops the sprite animation for this winning symbol. */
  public setWinning(winning: boolean): void {
    if (this.winning() === winning) return;
    this.winning.set(winning);
    const animation = GameLoader.getAtlas(this.symbol).getAnimation('idle');
    if (winning) this.sprite.playAtlasClip(animation);
    else {
      this.sprite.playAtlasClip(animation);
      this.sprite.setFrame(0);
    }
  }

  /** Advances the symbol only while it belongs to a winning card. */
  public update(deltaSeconds: number): void {
    if (this.winning()) this.sprite.update(deltaSeconds);
  }

  /** Draws the symbol centered at the requested point. */
  public draw(centerX: number, centerY: number, maxSize: number): void {
    const size = Math.max(1, Math.min(70, maxSize));
    this.sprite.dimensions.setPosition(centerX, centerY);
    this.sprite.dimensions.setSize(size, size);
    this.sprite.draw();
  }
}
