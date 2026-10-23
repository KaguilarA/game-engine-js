import { Dimensions, GameContext } from '../../core';
import type { AtlasAnimation, AtlasRegion } from '../../interfaces';

/**
 * Draws an image or sprite-sheet frame using reactive position, size, scale,
 * and pivot state.
 *
 * @remarks
 * The supplied image must be ready to draw before calling {@link draw}. The
 * optional frame settings support a single horizontal animation row; asset
 * loading remains the responsibility of the loader.
 *
 * @class Sprite
 *
 * `x` and `y` identify the image pivot. A pivot of `(0, 0)` draws from the
 * top-left corner, while `(0.5, 0.5)` draws from the center.
 */
export default class Sprite {
  /**
   * The reactive geometry used for position, size, scale, pivot, and bounds.
   * @property {Dimensions} dimensions
   * @public
   * @readonly
   */
  public readonly dimensions: Dimensions;
  /**
   * Image, canvas, or video source used to render this sprite.
   * @property {CanvasImageSource} image
   * @private
   * @readonly
   */
  private readonly image: CanvasImageSource;
  /**
   * Stores the source x state.
   * @property {number} sourceX
   * @private
   */
  private sourceX: number;
  /**
   * Stores the source y state.
   * @property {number} sourceY
   * @private
   */
  private sourceY: number;
  /**
   * Stores the source width state.
   * @property {number | undefined} sourceWidth
   * @private
   * @readonly
   */
  private readonly sourceWidth: number | undefined;
  /**
   * Stores the source height state.
   * @property {number | undefined} sourceHeight
   * @private
   * @readonly
   */
  private readonly sourceHeight: number | undefined;
  /**
   * Stores the frame count state.
   * @property {number} frameCount
   * @private
   */
  private frameCount: number;
  /**
   * Stores the number of animation frames in each horizontal sheet row.
   * @property {number} animationFramesPerRow
   * @private
   */
  private animationFramesPerRow: number;
  /**
   * Stores per-frame atlas bounds when the current clip comes from an atlas.
   * @property {AtlasRegion[] | undefined} atlasFrames
   * @private
   */
  private atlasFrames: readonly AtlasRegion[] | undefined;
  /**
   * Stores the animation frame rate state.
   * @property {number} animationFrameRate
   * @private
   */
  private animationFrameRate = 0;
  /**
   * Stores the animation start state.
   * @property {number} animationStart
   * @private
   */
  private animationStart = 0;
  /**
   * Stores the animation end state.
   * @property {number} animationEnd
   * @private
   */
  private animationEnd = 0;
  /**
   * Stores the animation loop state.
   * @property {boolean} animationLoop
   * @private
   */
  private animationLoop = false;
  /**
   * Stores the animation playing state.
   * @property {boolean} animationPlaying
   * @private
   */
  private animationPlaying = false;
  /**
   * Stores the frame index state.
   * @property {number} frameIndex
   * @private
   */
  private frameIndex = 0;
  /**
   * Stores the frame elapsed state.
   * @property {number} frameElapsed
   * @private
   */
  private frameElapsed = 0;

  /**
   * Creates a sprite.
   *
   * @param image - The image, canvas, or video source to draw.
   * @param width - The unscaled width to draw.
   * @param height - The unscaled height to draw.
   * @param x - The initial horizontal pivot position.
   * @param y - The initial vertical pivot position.
   * @param pivotX - The horizontal pivot ratio.
   * @param pivotY - The vertical pivot ratio.
   * @param sourceX - The source frame's horizontal position.
   * @param sourceY - The source frame's vertical position.
   * @param sourceWidth - The source frame's width. Defaults to the full image.
   * @param sourceHeight - The source frame's height. Defaults to the full image.
   * @param frameCount - The number of horizontal frames. Defaults to `1`.
   * @param frameRate - The animation speed in frames per second. Defaults to `0`.
   * @public
   * @return {void}
   */
  constructor(
    image: CanvasImageSource,
    width: number,
    height: number,
    x = 0,
    y = 0,
    pivotX = 0,
    pivotY = 0,
    sourceX = 0,
    sourceY = 0,
    sourceWidth?: number,
    sourceHeight?: number,
    frameCount = 1,
    frameRate = 0
  ) {
    this.image = image;
    this.sourceX = sourceX;
    this.sourceY = sourceY;
    this.sourceWidth = sourceWidth;
    this.sourceHeight = sourceHeight;
    this.frameCount = frameCount;
    this.animationFramesPerRow = frameCount;
    this.animationFrameRate = frameRate;
    this.animationEnd = frameCount - 1;
    this.dimensions = new Dimensions(
      width,
      height,
      x,
      y,
      pivotX,
      pivotY
    );
  }

  /**
   * Advances the horizontal sprite-sheet animation.
   *
   * @param deltaSeconds - The elapsed time since the previous update.
   * @public
   * @return {void}
   */
  public update(deltaSeconds: number): void {
    if (!this.animationPlaying || this.animationFrameRate <= 0) return;
    if (this.animationEnd <= this.animationStart) {
      if (!this.animationLoop) {
        this.animationPlaying = false;
        this.frameElapsed = 0;
      }
      return;
    }

    this.frameElapsed += deltaSeconds;
    const frameDuration = 1 / this.animationFrameRate;

    while (this.frameElapsed >= frameDuration) {
      this.frameElapsed -= frameDuration;
      if (this.frameIndex < this.animationEnd) {
        this.frameIndex += 1;
      } else if (this.animationLoop) {
        this.frameIndex = this.animationStart;
      } else {
        this.animationPlaying = false;
        this.frameElapsed = 0;
        break;
      }
    }
  }

  /**
   * Starts a frame range animation.
   *
   * @param startFrame - The first horizontal frame to draw.
   * @param frameCount - The number of frames to play.
   * @param frameRate - The animation speed in frames per second.
   * @param loop - Whether to restart at the first frame after the last frame.
   * @public
   * @return {void}
   */
  public play(
    startFrame: number,
    frameCount: number,
    frameRate: number,
    loop = false
  ): void {
    const endFrame = startFrame + frameCount - 1;

    if (
      startFrame < 0
      || frameCount <= 0
      || endFrame >= this.frameCount
      || frameRate <= 0
    ) {
      throw new RangeError('Invalid sprite animation range.');
    }

    this.animationStart = startFrame;
    this.animationEnd = endFrame;
    this.animationFramesPerRow = frameCount;
    this.atlasFrames = undefined;
    this.animationLoop = loop;
    this.animationFrameRate = frameRate;
    this.animationPlaying = true;
    this.frameIndex = startFrame;
    this.frameElapsed = 0;
  }

  /**
   * Starts a named animation using its frame bounds and playback data from an atlas.
   * @param animation - Parsed atlas animation with ordered regions.
   * @public
   * @return {void}
   */
  public playAtlasClip(animation: AtlasAnimation): void {
    if (animation.frames.length === 0) {
      throw new RangeError(`Atlas animation "${animation.name}" has no frames.`);
    }

    this.frameCount = animation.frames.length;
    this.atlasFrames = animation.frames;

    if (animation.frames.length === 1) {
      this.animationStart = 0;
      this.animationEnd = 0;
      this.animationLoop = false;
      this.animationPlaying = false;
      this.frameIndex = 0;
      this.frameElapsed = 0;
      return;
    }

    this.play(
      0,
      animation.frames.length,
      animation.frameRate,
      animation.loop
    );
    this.atlasFrames = animation.frames;
  }

  /**
   * Starts an animation clip at an explicit cell in a multi-row sprite sheet.
   * @param sourceX - Horizontal source coordinate of the first frame.
   * @param sourceY - Vertical source coordinate of the first frame.
   * @param frameCount - Number of horizontal frames in the clip.
   * @param frameRate - Playback speed in frames per second.
   * @param loop - Whether playback returns to the first frame at the end.
   * @param framesPerRow - Number of frames before the clip continues on the next sheet row.
   * @public
   * @return {void}
   */
  public playClip(
    sourceX: number,
    sourceY: number,
    frameCount: number,
    frameRate: number,
    loop = false,
    framesPerRow = frameCount
  ): void {
    if (sourceX < 0 || sourceY < 0 || framesPerRow <= 0) {
      throw new RangeError('Sprite clip coordinates must be non-negative.');
    }

    this.sourceX = sourceX;
    this.sourceY = sourceY;
    this.frameCount = frameCount;
    this.animationFramesPerRow = framesPerRow;
    this.play(0, frameCount, frameRate, loop);
    this.animationFramesPerRow = framesPerRow;
  }

  /**
   * Stops the current animation and selects a single frame.
   *
   * @param frame - The horizontal frame to display.
   * @public
   * @return {void}
   */
  public setFrame(frame: number): void {
    if (frame < 0 || frame >= this.frameCount) {
      throw new RangeError('Invalid sprite frame.');
    }

    this.animationPlaying = false;
    this.frameIndex = frame;
    this.frameElapsed = 0;
  }

  /**
   * Indicates whether a non-looping animation is still playing.
   *
   * @public
   * @return {boolean} Whether the current animation is still playing.
   */
  public get isAnimationPlaying(): boolean {
    return this.animationPlaying;
  }

  /**
   * Draws the image at its pivot position using the current scale.
   *
   * Negative scale values mirror the image around its pivot.
   *
   * @param rotation - The rotation around the pivot, in radians.
   * @public
   * @return {void}
   */
  public draw(rotation = 0): void {
    const drawingContext = GameContext.context;
    const width = this.dimensions.getWidth();
    const height = this.dimensions.getHeight();
    const pivotX = this.dimensions.getPivotX();
    const pivotY = this.dimensions.getPivotY();
    const originX = pivotX === 0 ? 0 : -width * pivotX;
    const originY = pivotY === 0 ? 0 : -height * pivotY;
    const atlasFrame = this.atlasFrames?.[this.frameIndex];
    const framesPerRow = Math.max(1, this.animationFramesPerRow);
    const frameSourceX = atlasFrame?.x ?? this.sourceX
      + (this.frameIndex % framesPerRow) * (this.sourceWidth ?? 0);
    const frameSourceY = atlasFrame?.y ?? this.sourceY
      + Math.floor(this.frameIndex / framesPerRow) * (this.sourceHeight ?? 0);
    const sourceWidth = atlasFrame?.width ?? this.sourceWidth;
    const sourceHeight = atlasFrame?.height ?? this.sourceHeight;

    drawingContext.save();

    try {
      drawingContext.translate(
        this.dimensions.getX(),
        this.dimensions.getY()
      );
      drawingContext.rotate(rotation);
      drawingContext.scale(
        this.dimensions.getScaleX(),
        this.dimensions.getScaleY()
      );

      if (sourceWidth !== undefined && sourceHeight !== undefined) {
        if (atlasFrame?.rotated) {
          const packedWidth = sourceHeight;
          const packedHeight = sourceWidth;
          drawingContext.translate(originX + width / 2, originY + height / 2);
          drawingContext.rotate(-Math.PI / 2);
          drawingContext.scale(height / packedWidth, width / packedHeight);
          drawingContext.drawImage(
            this.image,
            frameSourceX,
            frameSourceY,
            packedWidth,
            packedHeight,
            -packedWidth / 2,
            -packedHeight / 2,
            packedWidth,
            packedHeight
          );
        } else {
          drawingContext.drawImage(
            this.image,
            frameSourceX,
            frameSourceY,
            sourceWidth,
            sourceHeight,
            originX,
            originY,
            width,
            height
          );
        }
      } else {
        drawingContext.drawImage(
          this.image,
          originX,
          originY,
          width,
          height
        );
      }
    } finally {
      drawingContext.restore();
    }
  }
}
