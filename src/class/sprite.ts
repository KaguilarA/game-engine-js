import GameContext from '../engine/context';
import Dimensions from '../engine/dimensions';

/**
 * Draws an image or sprite-sheet frame using reactive position, size, scale,
 * and pivot state.
 *
 * @remarks
 * The supplied image must be ready to draw before calling {@link draw}. The
 * optional frame settings support a single horizontal animation row; asset
 * loading remains the responsibility of the loader.
 *
 * `x` and `y` identify the image pivot. A pivot of `(0, 0)` draws from the
 * top-left corner, while `(0.5, 0.5)` draws from the center.
 */
export default class Sprite {
  /**
   * The reactive geometry used for position, size, scale, pivot, and bounds.
   */
  public readonly dimensions: Dimensions;
  private readonly image: CanvasImageSource;
  private readonly sourceX: number;
  private readonly sourceY: number;
  private readonly sourceWidth: number | undefined;
  private readonly sourceHeight: number | undefined;
  private readonly frameCount: number;
  private animationFrameRate = 0;
  private animationStart = 0;
  private animationEnd = 0;
  private animationLoop = false;
  private animationPlaying = false;
  private frameIndex = 0;
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
   */
  public update(deltaSeconds: number): void {
    if (
      !this.animationPlaying
      || this.animationFrameRate <= 0
      || this.animationEnd <= this.animationStart
    ) {
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
    this.animationLoop = loop;
    this.animationFrameRate = frameRate;
    this.animationPlaying = true;
    this.frameIndex = startFrame;
    this.frameElapsed = 0;
  }

  /**
   * Stops the current animation and selects a single frame.
   *
   * @param frame - The horizontal frame to display.
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
   */
  public get isAnimationPlaying(): boolean {
    return this.animationPlaying;
  }

  /**
   * Draws the image at its pivot position using the current scale.
   *
   * Negative scale values mirror the image around its pivot.
   */
  public draw(): void {
    const drawingContext = GameContext.context;
    const width = this.dimensions.getWidth();
    const height = this.dimensions.getHeight();
    const pivotX = this.dimensions.getPivotX();
    const pivotY = this.dimensions.getPivotY();
    const originX = pivotX === 0 ? 0 : -width * pivotX;
    const originY = pivotY === 0 ? 0 : -height * pivotY;
    const frameSourceX = (
      this.sourceX
      + this.frameIndex * (this.sourceWidth ?? 0)
    );

    drawingContext.save();

    try {
      drawingContext.translate(
        this.dimensions.getX(),
        this.dimensions.getY()
      );
      drawingContext.scale(
        this.dimensions.getScaleX(),
        this.dimensions.getScaleY()
      );

      if (this.sourceWidth !== undefined && this.sourceHeight !== undefined) {
        drawingContext.drawImage(
          this.image,
          frameSourceX,
          this.sourceY,
          this.sourceWidth,
          this.sourceHeight,
          originX,
          originY,
          width,
          height
        );
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
