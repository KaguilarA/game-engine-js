import { signalValue, type SignalValue } from 'reactive-values';
import { Atlas, GameLoader } from '../assets';
import { GameContext, MathUtils } from '../core';
import { SpineSprite, Sprite } from '../animations';
import type {
  IconAssetPaths,
  ReelSymbolVisual,
  SpineRecord,
  SpineEventHandler
} from '../interfaces';

type SpineIconAsset = {
  atlas: Atlas;
  data: SpineRecord;
};

/** A reusable slot symbol with optional blurred art and a Spine win animation. */
export class Icon implements ReelSymbolVisual {
  private readonly winAnimationActive: SignalValue<boolean> = signalValue(false);
  private winAnimation: SpineSprite | undefined;
  private readonly spineEventHandlers = new Map<string, Set<SpineEventHandler>>();
  private readonly removeSpineEventListeners = new Set<() => void>();
  public readonly id: string;
  private readonly normal: Sprite;
  private readonly blurred: Sprite;
  private readonly spineAsset?: SpineIconAsset;
  private readonly idleAspectRatio: number;

  private constructor(
    id: string,
    normal: Sprite,
    blurred: Sprite,
    spineAsset?: SpineIconAsset
  ) {
    this.id = id;
    this.normal = normal;
    this.blurred = blurred;
    this.spineAsset = spineAsset;
    this.idleAspectRatio = normal.dimensions.getWidth() / normal.dimensions.getHeight();
  }

  /** Loads a symbol's normal, blurred, and optional Spine assets. */
  public static async load(id: string, paths: IconAssetPaths): Promise<Icon> {
    const [normalImage, blurredImage] = await Promise.all([
      GameLoader.loadImageUrl(paths.normal),
      GameLoader.loadImageUrl(paths.blurred)
    ]);
    const spineAsset = paths.spine
      ? await this.loadSpineAsset(id, paths.spine)
      : undefined;
    const idleWidth = normalImage.naturalWidth;
    const idleHeight = normalImage.naturalHeight;
    const idleAspectRatio = idleWidth / idleHeight;
    const blurredAspectRatio = blurredImage.naturalWidth / blurredImage.naturalHeight;
    const blurredSourceWidth = blurredAspectRatio > idleAspectRatio
      ? blurredImage.naturalHeight * idleAspectRatio
      : blurredImage.naturalWidth;
    const blurredSourceHeight = blurredAspectRatio > idleAspectRatio
      ? blurredImage.naturalHeight
      : blurredImage.naturalWidth / idleAspectRatio;
    const blurredSourceX = (blurredImage.naturalWidth - blurredSourceWidth) * 0.5;
    const blurredSourceY = (blurredImage.naturalHeight - blurredSourceHeight) * 0.5;

    return new Icon(
      id,
      new Sprite(normalImage, idleWidth, idleHeight, 0, 0, 0.5, 0.5),
      new Sprite(
        blurredImage,
        idleWidth,
        idleHeight,
        0,
        0,
        0.5,
        0.5,
        blurredSourceX,
        blurredSourceY,
        blurredSourceWidth,
        blurredSourceHeight
      ),
      spineAsset
    );
  }

  /** Starts the Spine presentation used while this symbol is part of a win. */
  public activateWinAnimation(): void {
    const animationName = this.getWinAnimationName();
    if (!this.spineAsset || !animationName) return;

    if (!this.winAnimation) {
      this.winAnimation = new SpineSprite(this.spineAsset.data, this.spineAsset.atlas, 0, 0, 0.5, 0.5);
      this.spineEventHandlers.forEach((handlers, name) => {
        handlers.forEach((handler) => {
          const removeListener = this.winAnimation?.onEvent(name, handler);
          if (removeListener) this.removeSpineEventListeners.add(removeListener);
        });
      });
    }
    this.winAnimation.play(animationName);
    this.winAnimationActive.set(true);
    this.advanceWinAnimation(0);
  }

  /** Starts this symbol's win Spine when a reel cell enters its winning state. */
  public setWinning(isWinning: boolean): void {
    if (isWinning) this.activateWinAnimation();
  }

  /** Restores the static presentation before the next reel spin. */
  public resetWinAnimation(): void {
    this.winAnimationActive.set(false);
  }

  /** Subscribes to a named event in this icon's Spine animations, if available. */
  public onSpineEvent(name: string, handler: SpineEventHandler): () => void {
    const handlers = this.spineEventHandlers.get(name) ?? new Set<SpineEventHandler>();
    handlers.add(handler);
    this.spineEventHandlers.set(name, handlers);
    const removeFromSprite = this.winAnimation?.onEvent(name, handler);
    const remove = (): void => {
      handlers.delete(handler);
      if (handlers.size === 0) this.spineEventHandlers.delete(name);
      removeFromSprite?.();
      this.removeSpineEventListeners.delete(remove);
    };
    this.removeSpineEventListeners.add(remove);
    return remove;
  }

  /** Advances the icon's active Spine animation, if it has one. */
  public update(deltaSeconds: number): void {
    if (!this.winAnimationActive() || !this.winAnimation) return;
    this.advanceWinAnimation(deltaSeconds);
    if (this.winAnimationActive() && !this.winAnimation.isPlaying) {
      this.winAnimationActive.set(false);
    }
  }

  private advanceWinAnimation(deltaSeconds: number): void {
    if (!this.winAnimation) return;
    try {
      this.winAnimation.update(deltaSeconds);
    } catch (error) {
      // Keep the slot playable if an optional Spine export contains timelines
      // the installed runtime cannot apply. The static facade is always valid.
      this.winAnimationActive.set(false);
      console.warn(`Unable to update the Spine animation for icon "${this.id}".`, error);
    }
  }

  private getWinAnimationName(): string | undefined {
    const animations = this.spineAsset?.data.animations;
    if (!animations) return undefined;
    if (animations.animation) return 'animation';
    return Object.keys(animations).find((name) =>
      name !== 'idle' && name !== 'static' && name !== 'blurred'
      && name !== 'teaser' && !name.startsWith('to')
    );
  }

  /** Draws the symbol or its active win animation at the supplied cell bounds. */
  public draw(
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    blurAmount = 0,
    isWinning = false
  ): void {
    const idleHeight = Math.min(height, width / this.idleAspectRatio);
    const idleWidth = idleHeight * this.idleAspectRatio;
    if (blurAmount <= 0 && isWinning && this.winAnimationActive() && this.winAnimation) {
      const context = GameContext.context;
      context.save();
      context.beginPath();
      context.rect(centerX - idleWidth / 2, centerY - idleHeight / 2, idleWidth, idleHeight);
      context.clip();
      this.winAnimation.dimensions.setPosition(centerX, centerY);
      this.winAnimation.dimensions.setSize(idleWidth, idleHeight);
      this.winAnimation.draw();
      context.restore();
      return;
    }
    const amount = MathUtils.clamp(blurAmount, 0, 1);
    const context = GameContext.context;
    context.save();
    const originalAlpha = context.globalAlpha;
    context.beginPath();
    context.rect(centerX - idleWidth / 2, centerY - idleHeight / 2, idleWidth, idleHeight);
    context.clip();
    if (amount < 1) {
      this.normal.dimensions.setPosition(centerX, centerY);
      this.normal.dimensions.setSize(idleWidth, idleHeight);
      context.globalAlpha = originalAlpha * (1 - amount);
      this.normal.draw();
    }
    if (amount > 0) {
      this.blurred.dimensions.setPosition(centerX, centerY);
      this.blurred.dimensions.setSize(idleWidth, idleHeight);
      context.globalAlpha = originalAlpha * amount;
      this.blurred.draw();
    }
    context.restore();
  }

  /** Releases the texture pages owned by this icon's Spine atlas. */
  public dispose(): void {
    this.winAnimationActive.set(false);
    this.removeSpineEventListeners.forEach((remove) => remove());
    this.removeSpineEventListeners.clear();
    this.spineEventHandlers.clear();
    this.winAnimation = undefined;
  }

  private static async loadSpineAsset(
    id: string,
    paths: NonNullable<IconAssetPaths['spine']>
  ): Promise<SpineIconAsset | undefined> {
    try {
      return await GameLoader.loadSpine(paths.json, paths.atlas);
    } catch (error) {
      console.warn(`Unable to load the Spine animation for icon "${id}".`, error);
      return undefined;
    }
  }
}
