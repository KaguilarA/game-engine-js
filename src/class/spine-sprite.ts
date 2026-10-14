import { SkeletonRenderer } from '@esotericsoftware/spine-canvas';
import {
  AnimationState,
  Physics,
  Skeleton
} from '@esotericsoftware/spine-core';

import GameContext from '../engine/context';
import Dimensions from '../engine/dimensions';

/**
 * Renders and updates a Spine skeleton in the engine's Canvas 2D context.
 *
 * @remarks
 * The skeleton, its `AnimationState`, and its attachments must be created by
 * the official Spine runtime before constructing this class. Asset loading and
 * atlas parsing belong outside the sprite so the class can focus on lifecycle,
 * geometry, animation updates, and rendering.
 *
 * The skeleton's setup-pose bounds are used to initialize `Dimensions`.
 * `x` and `y` represent the pivot position. The pivot is applied relative to
 * those setup-pose bounds before the skeleton is rendered.
 */
export default class SpineSprite {
  private static readonly renderer = new SkeletonRenderer(
    GameContext.context
  );

  /**
   * The Spine skeleton rendered by this sprite.
   */
  public readonly skeleton: Skeleton;

  /**
   * The animation state applied to the skeleton before rendering.
   */
  public readonly animationState: AnimationState;

  /**
   * The reactive geometry shared with other engine elements.
   */
  public readonly dimensions: Dimensions;

  /**
   * Creates a Spine sprite from an initialized skeleton and animation state.
   *
   * @param skeleton - The initialized Spine skeleton to render.
   * @param animationState - The animation state that controls the skeleton.
   * @param x - The initial horizontal pivot position.
   * @param y - The initial vertical pivot position.
   * @param pivotX - The horizontal pivot ratio.
   * @param pivotY - The vertical pivot ratio.
   */
  constructor(
    skeleton: Skeleton,
    animationState: AnimationState,
    x = 0,
    y = 0,
    pivotX = 0,
    pivotY = 0
  ) {
    this.skeleton = skeleton;
    this.animationState = animationState;
    this.dimensions = new Dimensions(
      skeleton.data.width,
      skeleton.data.height,
      x,
      y,
      pivotX,
      pivotY
    );
  }

  /**
   * Advances the animation state and applies its pose to the skeleton.
   *
   * @param deltaSeconds - The elapsed time since the previous update.
   */
  public update(deltaSeconds: number): void {
    this.animationState.update(deltaSeconds);
    this.animationState.apply(this.skeleton);
    this.skeleton.updateWorldTransform(Physics.update);
  }

  /**
   * Sets an animation on the specified Spine track.
   *
   * @param trackIndex - The animation track to use.
   * @param animationName - The name of the animation in the skeleton data.
   * @param loop - Whether the animation should loop.
   */
  public setAnimation(
    trackIndex: number,
    animationName: string,
    loop = true
  ): void {
    this.animationState.setAnimation(trackIndex, animationName, loop);
  }

  /**
   * Draws the current skeleton pose through the official Spine Canvas
   * renderer.
   */
  public draw(): void {
    const width = this.dimensions.getWidth();
    const height = this.dimensions.getHeight();
    const pivotX = this.dimensions.getPivotX();
    const pivotY = this.dimensions.getPivotY();

    this.skeleton.x = (
      this.dimensions.getX()
      - this.skeleton.data.x
      - width * pivotX
    );
    this.skeleton.y = (
      this.dimensions.getY()
      - this.skeleton.data.y
      - height * pivotY
    );
    this.skeleton.scaleX = this.dimensions.getScaleX();
    this.skeleton.scaleY = this.dimensions.getScaleY();

    SpineSprite.renderer.draw(this.skeleton);
  }
}
