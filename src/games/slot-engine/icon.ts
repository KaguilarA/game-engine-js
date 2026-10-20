import { signalValue } from 'reactive-values';
import type { SignalValue } from 'reactive-values';

import GameContext from '../../engine/core/context';
import { MathUtils } from '../../engine/core/math-utils';
import { SpineSprite, type SpineEventHandler } from '../../engine/animations/spine';
import { Atlas } from '../../engine/assets/atlas';
import { AtlasParser } from '../../engine/assets/atlas-parser';
import type { SpineRecord } from '../../engine/interfaces/spine-record';
import Sprite from '../../engine/animations/sprites/sprite';
import type { IconAssetPaths } from './interfaces/icon-asset-paths';
import type { ReelSymbolVisual } from './interfaces/reel-symbol-visual';

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
  }

  /** Loads a symbol's normal, blurred, and optional Spine assets. */
  public static async load(id: string, paths: IconAssetPaths): Promise<Icon> {
    const [normalImage, blurredImage] = await Promise.all([
      this.loadImage(paths.normal),
      this.loadImage(paths.blurred)
    ]);
    const spineAsset = paths.spine
      ? await this.loadSpineAsset(id, paths.spine)
      : undefined;

    return new Icon(
      id,
      new Sprite(normalImage, normalImage.naturalWidth, normalImage.naturalHeight, 0, 0, 0.5, 0.5),
      new Sprite(blurredImage, blurredImage.naturalWidth, blurredImage.naturalHeight, 0, 0, 0.5, 0.5),
      spineAsset
    );
  }

  /** Starts the Spine presentation used while this symbol is part of a win. */
  public activateWinAnimation(): void {
    if (
      !this.spineAsset
      || !this.spineAsset.data.animations?.animation
      || !this.spineAsset.data.animations?.idle
    ) return;

    if (!this.winAnimation) {
      this.winAnimation = new SpineSprite(this.spineAsset.data, this.spineAsset.atlas, 0, 0, 0.5, 0.5);
      this.spineEventHandlers.forEach((handlers, name) => {
        handlers.forEach((handler) => {
          const removeListener = this.winAnimation?.onEvent(name, handler);
          if (removeListener) this.removeSpineEventListeners.add(removeListener);
        });
      });
    }
    this.winAnimation.play('animation', false);
    this.winAnimation.queue('idle', true);
    this.winAnimationActive.set(true);
    this.advanceWinAnimation(0);
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

  /** Draws the symbol or its active win animation at the supplied cell bounds. */
  public draw(
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    blurAmount = 0,
    isWinning = false
  ): void {
    if (blurAmount <= 0 && isWinning && this.winAnimationActive() && this.winAnimation) {
      this.winAnimation.dimensions.setPosition(centerX, centerY);
      this.winAnimation.dimensions.setSize(width, height);
      this.winAnimation.draw();
      return;
    }

    const amount = MathUtils.clamp(blurAmount, 0, 1);
    const context = GameContext.context;
    context.save();
    const originalAlpha = context.globalAlpha;
    if (amount < 1) {
      this.normal.dimensions.setPosition(centerX, centerY);
      this.normal.dimensions.setSize(width, height);
      context.globalAlpha = originalAlpha * (1 - amount);
      this.normal.draw();
    }
    if (amount > 0) {
      this.blurred.dimensions.setPosition(centerX, centerY);
      this.blurred.dimensions.setSize(width, height);
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
    if (this.spineAsset) this.spineAsset.atlas.image = undefined;
  }

  private static async loadSpineAsset(
    id: string,
    paths: NonNullable<IconAssetPaths['spine']>
  ): Promise<SpineIconAsset | undefined> {
    let atlas: Atlas | undefined;
    try {
      const [jsonResponse, atlasResponse] = await Promise.all([
        fetch(paths.json),
        fetch(paths.atlas)
      ]);
      if (!jsonResponse.ok || !atlasResponse.ok) {
        throw new Error(`Spine files for icon "${id}" could not be loaded.`);
      }

      atlas = new Atlas(new AtlasParser().parse(await atlasResponse.text()));
      const atlasUrl = new URL(paths.atlas, document.baseURI);
      const imageUrl = new URL(atlas.pageName, atlasUrl).toString();
      atlas.setPageImage(await this.loadImage(imageUrl));
      const data = JSON.parse(await jsonResponse.text()) as SpineRecord;
      return { atlas, data };
    } catch (error) {
      if (atlas) atlas.image = undefined;
      console.warn(`Unable to load the Spine animation for icon "${id}".`, error);
      return undefined;
    }
  }

  private static async loadImage(url: string): Promise<HTMLImageElement> {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  }
}
