import { Dimensions } from '../../core';
import type { Atlas } from '../../assets';
import type { SpineEventHandler, SpineRecord } from '../../interfaces';

import { SpineRenderer } from './spine-renderer';
import { SpineRuntime } from './spine-runtime';

/**
 * High-level drawable wrapping a Spine skeleton and its runtime lifecycle.
 * @class SpineSprite
 */
export class SpineSprite {
  /**
   * Stores the reactive dimensions model.
   * @property {Dimensions} dimensions
   * @public
   * @readonly
   */
  public readonly dimensions: Dimensions;

  /**
   * Stores the underlying Spine evaluation runtime.
   * @property {SpineRuntime} runtime
   * @public
   * @readonly
   */
  public readonly runtime: SpineRuntime;

  /**
   * Stores the renderer instance.
   * @property {SpineRenderer} renderer
   * @private
   * @readonly
   */
  private readonly renderer = new SpineRenderer();

  /**
   * Stores the sprite atlas.
   * @property {Atlas} atlas
   * @private
   * @readonly
   */
  private readonly atlas: Atlas;

  /**
   * Reports whether skeleton animation is playing.
   * @public
   * @return {boolean}
   */
  public get isPlaying(): boolean {
    return this.runtime.isPlaying;
  }

  /**
   * Creates a Spine sprite instance.
   * @public
   * @return {void}
   */
  public constructor(
    data: SpineRecord | ArrayBuffer | Uint8Array,
    atlas: Atlas,
    x = 0,
    y = 0,
    pivotX = 0.5,
    pivotY = 0.5
  ) {
    this.atlas = atlas;
    this.runtime = new SpineRuntime(data, atlas);
    this.dimensions = new Dimensions(
      this.runtime.width,
      this.runtime.height,
      x,
      y,
      pivotX,
      pivotY
    );
  }

  /**
   * Draws the animated Spine skeleton to the canvas.
   * @public
   * @return {void}
   */
  public draw(): void {
    const width = this.dimensions.getWidth();
    const height = this.dimensions.getHeight();
    const centerX = this.dimensions.getX() + width *
      (0.5 - this.dimensions.getPivotX());
    const centerY = this.dimensions.getY() + height *
      (0.5 - this.dimensions.getPivotY());

    this.renderer.draw(
      this.runtime,
      this.atlas,
      centerX,
      centerY,
      width,
      height
    );
  }

  /**
   * Subscribes a listener to custom animation timeline events.
   * @public
   * @return {() => void}
   */
  public onEvent(name: string, handler: SpineEventHandler): () => void {
    return this.runtime.onEvent(name, handler);
  }

  /**
   * Plays an animation with optional loop and cross-fading.
   * @public
   * @return {void}
   */
  public play(name: string, loop = false, blendDuration = 0): void {
    this.runtime.play(name, loop, blendDuration);
  }

  /**
   * Smoothly cross-fades between animations over duration.
   * @public
   * @return {void}
   */
  public crossFade(name: string, duration: number, loop = false): void {
    this.runtime.crossFade(name, duration, loop);
  }

  /**
   * Sets interactive IK target position in world space.
   * @public
   * @return {void}
   */
  public setIkTarget(constraintName: string, worldX: number, worldY: number, mix = 1.0): void {
    this.runtime.setIkTarget(constraintName, worldX, worldY, mix);
  }

  /**
   * Clears interactive IK target override.
   * @public
   * @return {void}
   */
  public clearIkTarget(constraintName: string): void {
    this.runtime.clearIkTarget(constraintName);
  }
  
  /**
   * Queues an animation to follow current playback.
   * @public
   * @return {void}
   */
  public queue(name: string, loop = true): void {
    this.runtime.queue(name, loop);
  }

  /**
   * Sets active skin by name.
   * @public
   * @return {void}
   */
  public setSkin(name: string): void {
    this.runtime.setSkin(name);
  }

  /**
   * Advances skeleton simulation frame.
   * @public
   * @return {void}
   */
  public update(deltaSeconds: number): void {
    this.runtime.update(deltaSeconds);
  }
}
