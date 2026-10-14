import GameContext from '../engine/context';
import Dimensions from '../engine/dimensions';

/**
 * Draws a static image using reactive position, size, scale, and pivot state.
 *
 * @remarks
 * The supplied image must be ready to draw before calling {@link draw}. This
 * class intentionally does not load assets or manage animations; those
 * responsibilities belong to higher-level asset and animation systems.
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

  /**
   * Creates a static sprite.
   *
   * @param image - The image, canvas, or video source to draw.
   * @param width - The unscaled width to draw.
   * @param height - The unscaled height to draw.
   * @param x - The initial horizontal pivot position.
   * @param y - The initial vertical pivot position.
   * @param pivotX - The horizontal pivot ratio.
   * @param pivotY - The vertical pivot ratio.
   */
  constructor(
    image: CanvasImageSource,
    width: number,
    height: number,
    x = 0,
    y = 0,
    pivotX = 0,
    pivotY = 0
  ) {
    this.image = image;
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
      drawingContext.drawImage(
        this.image,
        originX,
        originY,
        width,
        height
      );
    } finally {
      drawingContext.restore();
    }
  }
}
