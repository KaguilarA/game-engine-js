import { computedValue, signalValue } from 'reactive-values';

function assertFiniteNumber(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number.`);
  }
}

function assertNonNegativeDimension(value: number, name: string): void {
  assertFiniteNumber(value, name);

  if (value < 0) {
    throw new RangeError(`${name} must be greater than or equal to zero.`);
  }
}

/**
 * Reactive geometry model shared by resizable engine elements.
 *
 * @class Dimensions
 * @remarks
 * Stores an element's position, unscaled size, scale, pivot, and aspect-ratio
 * state. `x` and `y` identify the pivot position, so they are not necessarily
 * the top-left corner. `width` and `height` are non-negative, unscaled
 * dimensions. `scaleX` and `scaleY` are independent scale factors and may be
 * negative to represent a mirrored element. `pivotX` and `pivotY` are finite
 * ratios and may fall outside the usual `[0, 1]` range for external pivots.
 *
 * Derived values such as scaled dimensions and axis-aligned bounds are updated
 * reactively and can be used by sprites, containers, and other resizable
 * objects. Scaled dimensions and bounds use the absolute scale values, so a
 * negative scale changes orientation without making their measurements
 * negative.
 *
 * The pivot values are ratios: `0` places the origin at the top or left edge,
 * `0.5` places it at the center, and `1` places it at the bottom or right
 * edge. Scale affects calculated dimensions and bounds.
 *
 * @example
 * ```ts
 * const dimensions = new Dimensions(800, 600);
 * dimensions.setScale(0.5);
 * ```
 */
export default class Dimensions {
  /**
   * The unscaled horizontal position.
   *
   * @private
   * @property {Signal} x
   * @private
   * @readonly
   */
  private readonly x = signalValue(0);
  /**
   * The unscaled vertical position.
   *
   * @private
   * @property {Signal} y
   * @private
   * @readonly
   */
  private readonly y = signalValue(0);
  /**
   * The unscaled width.
   *
   * @private
   * @property {Signal} width
   * @private
   * @readonly
   */
  private readonly width = signalValue(0);
  /**
   * The unscaled height.
   *
   * @private
   * @property {Signal} height
   * @private
   * @readonly
   */
  private readonly height = signalValue(0);
  /**
   * The horizontal scale factor.
   *
   * @private
   * @property {Signal} scaleX
   * @private
   * @readonly
   */
  private readonly scaleX = signalValue(1);
  /**
   * The vertical scale factor.
   *
   * @private
   * @property {Signal} scaleY
   * @private
   * @readonly
   */
  private readonly scaleY = signalValue(1);
  /**
   * The horizontal pivot ratio.
   *
   * @private
   * @property {Signal} pivotX
   * @private
   * @readonly
   */
  private readonly pivotX = signalValue(0);
  /**
   * The vertical pivot ratio.
   *
   * @private
   * @property {Signal} pivotY
   * @private
   * @readonly
   */
  private readonly pivotY = signalValue(0);
  /**
   * Whether width and height updates preserve the current aspect ratio.
   *
   * @private
   * @property {Signal} lockAspectRatio
   * @private
   * @readonly
   */
  private readonly lockAspectRatio = signalValue(false);
  /**
   * The width-to-height ratio used when aspect-ratio locking is enabled.
   *
   * @private
   * @property {Signal} aspectRatio
   * @private
   * @readonly
   */
  private readonly aspectRatio = signalValue(0);

  /**
   * Reads the current horizontal pivot position.
   *
   * @property {() => number} getX
   * @public
   * @readonly
   */
  public readonly getX = (): number => this.x();
  /**
   * Reads the current vertical pivot position.
   *
   * @public
   * @property {() => number} getY
   * @readonly
   */
  public readonly getY = (): number => this.y();
  /**
   * Reads the current unscaled width.
   *
   * @public
   * @property {() => number} getWidth
   * @readonly
   */
  public readonly getWidth = (): number => this.width();
  /**
   * Reads the current unscaled height.
   *
   * @public
   * @property {() => number} getHeight
   * @readonly
   */
  public readonly getHeight = (): number => this.height();
  /**
   * Reads the current horizontal scale factor.
   *
   * @public
   * @property {() => number} getScaleX
   * @readonly
   */
  public readonly getScaleX = (): number => this.scaleX();
  /**
   * Reads the current vertical scale factor.
   *
   * @public
   * @property {() => number} getScaleY
   * @readonly
   */
  public readonly getScaleY = (): number => this.scaleY();
  /**
   * Reads the horizontal pivot ratio used for bounds calculations.
   *
   * @public
   * @property {() => number} getPivotX
   * @readonly
   */
  public readonly getPivotX = (): number => this.pivotX();
  /**
   * Reads the vertical pivot ratio used for bounds calculations.
   *
   * @public
   * @property {() => number} getPivotY
   * @readonly
   */
  public readonly getPivotY = (): number => this.pivotY();
  /**
   * Reads the current width-to-height ratio. The value is `0` if either
   * dimension is zero.
   *
   * @public
   * @property {() => number} getAspectRatio
   * @readonly
   */
  public readonly getAspectRatio = (): number => this.aspectRatio();

  /**
   * The current width after applying the absolute horizontal scale.
   * @property {() => number} scaledWidth
   * @public
   * @readonly
   */
  public readonly scaledWidth = computedValue(
    () => this.width() * Math.abs(this.scaleX()),
    [this.width, this.scaleX]
  );

  /**
   * The current height after applying the absolute vertical scale.
   * @property {() => number} scaledHeight
   * @public
   * @readonly
   */
  public readonly scaledHeight = computedValue(
    () => this.height() * Math.abs(this.scaleY()),
    [this.height, this.scaleY]
  );

  /**
   * The area calculated from the scaled width and height.
   * @property {() => number} area
   * @public
   * @readonly
   */
  public readonly area = computedValue(
    () => this.scaledWidth() * this.scaledHeight(),
    [this.width, this.height, this.scaleX, this.scaleY]
  );

  /**
   * The left edge of the element's axis-aligned bounding box.
   * @property {() => number} left
   * @public
   * @readonly
   */
  public readonly left = computedValue(
    () => this.x() - this.scaledWidth() * this.pivotX(),
    [this.x, this.width, this.scaleX, this.pivotX]
  );

  /**
   * The right edge of the element's axis-aligned bounding box.
   * @property {() => number} right
   * @public
   * @readonly
   */
  public readonly right = computedValue(
    () => this.x() + this.scaledWidth() * (1 - this.pivotX()),
    [this.x, this.width, this.scaleX, this.pivotX]
  );

  /**
   * The top edge of the element's axis-aligned bounding box.
   * @property {() => number} top
   * @public
   * @readonly
   */
  public readonly top = computedValue(
    () => this.y() - this.scaledHeight() * this.pivotY(),
    [this.y, this.height, this.scaleY, this.pivotY]
  );

  /**
   * The bottom edge of the element's axis-aligned bounding box.
   * @property {() => number} bottom
   * @public
   * @readonly
   */
  public readonly bottom = computedValue(
    () => this.y() + this.scaledHeight() * (1 - this.pivotY()),
    [this.y, this.height, this.scaleY, this.pivotY]
  );

  /**
   * The current position as a reactive `{ x, y }` object.
   *
   * @property
   * @readonly
   */
  public readonly position = computedValue(
    () => ({
      x: this.x(),
      y: this.y()
    }),
    [this.x, this.y]
  );

  /**
   * The current unscaled size as a reactive `{ width, height }` object.
   *
   * Use `scaledWidth` and `scaledHeight` when the rendered size is required.
   *
   * @property
   * @readonly
   */
  public readonly size = computedValue(
    () => ({
      width: this.width(),
      height: this.height()
    }),
    [this.width, this.height]
  );

  /**
   * Creates a reactive dimensions model.
   *
   * @param width - The initial unscaled width. Defaults to `0`.
   * @param height - The initial unscaled height. Defaults to `0`.
   * @param x - The initial horizontal position. Defaults to `0`.
   * @param y - The initial vertical position. Defaults to `0`.
   * @param pivotX - The horizontal pivot ratio. Defaults to `0`.
   * @param pivotY - The vertical pivot ratio. Defaults to `0`.
   */
  constructor(
    width = 0,
    height = 0,
    x = 0,
    y = 0,
    pivotX = 0,
    pivotY = 0
  ) {
    assertNonNegativeDimension(width, 'width');
    assertNonNegativeDimension(height, 'height');
    assertFiniteNumber(x, 'x');
    assertFiniteNumber(y, 'y');
    assertFiniteNumber(pivotX, 'pivotX');
    assertFiniteNumber(pivotY, 'pivotY');

    this.width.set(width);
    this.height.set(height);
    this.x.set(x);
    this.y.set(y);
    this.pivotX.set(pivotX);
    this.pivotY.set(pivotY);

    this.updateAspectRatio();
  }

  /**
   * Updates the aspect ratio when both unscaled dimensions are positive.
   *
   * A ratio of `0` means the current dimensions cannot establish a ratio.
   */
  private updateAspectRatio(): void {
    const width = this.width();
    const height = this.height();

    this.aspectRatio.set(
      width > 0 && height > 0
        ? width / height
        : 0
    );
  }

  /**
   * Updates the horizontal position.
   *
   * @param x - The new horizontal position.
   * @public
   * @return {void}
   */
  public setX(x: number): void {
    assertFiniteNumber(x, 'x');
    this.x.set(x);
  }

  /**
   * Updates the vertical position.
   *
   * @param y - The new vertical position.
   * @public
   * @return {void}
   */
  public setY(y: number): void {
    assertFiniteNumber(y, 'y');
    this.y.set(y);
  }

  /**
   * Updates the horizontal and vertical position together.
   *
   * @param x - The new horizontal position.
   * @param y - The new vertical position.
   * @public
   * @return {void}
   */
  public setPosition(x: number, y: number): void {
    assertFiniteNumber(x, 'x');
    assertFiniteNumber(y, 'y');
    this.x.set(x);
    this.y.set(y);
  }

  /**
   * Updates the width and, when enabled, derives the height from the locked
   * aspect ratio.
   *
   * @param width - The new unscaled width.
   * @public
   * @return {void}
   */
  public setWidth(width: number): void {
    assertNonNegativeDimension(width, 'width');
    this.width.set(width);

    if (this.lockAspectRatio() && this.aspectRatio() !== 0) {
      this.height.set(width / this.aspectRatio());
      return;
    }

    this.updateAspectRatio();
  }

  /**
   * Updates the height and, when enabled, derives the width from the locked
   * aspect ratio.
   *
   * @param height - The new unscaled height.
   * @public
   * @return {void}
   */
  public setHeight(height: number): void {
    assertNonNegativeDimension(height, 'height');
    this.height.set(height);

    if (this.lockAspectRatio() && this.aspectRatio() !== 0) {
      this.width.set(height * this.aspectRatio());
      return;
    }

    this.updateAspectRatio();
  }

  /**
   * Updates the width and height together.
   *
   * When aspect-ratio locking is enabled with a non-zero ratio, `width` is the
   * authoritative dimension and `height` is calculated from that ratio. The
   * `height` argument is ignored in that case.
   *
   * @param width - The new unscaled width.
   * @param height - The new unscaled height when aspect-ratio locking is off.
   * @public
   * @return {void}
   */
  public setSize(width: number, height: number): void {
    assertNonNegativeDimension(width, 'width');
    assertNonNegativeDimension(height, 'height');
    this.width.set(width);

    if (this.lockAspectRatio() && this.aspectRatio() !== 0) {
      this.height.set(width / this.aspectRatio());
      return;
    }

    this.height.set(height);
    this.updateAspectRatio();
  }

  /**
   * Updates the horizontal and vertical scale.
   *
   * If `scaleY` is omitted, the horizontal scale is used for both axes.
   * Negative scale values are supported; calculated dimensions use their
   * absolute values.
   *
   * @param scaleX - The horizontal scale factor.
   * @param scaleY - The vertical scale factor. Defaults to `scaleX`.
   * @public
   * @return {void}
   */
  public setScale(scaleX: number, scaleY: number = scaleX): void {
    assertFiniteNumber(scaleX, 'scaleX');
    assertFiniteNumber(scaleY, 'scaleY');
    this.scaleX.set(scaleX);
    this.scaleY.set(scaleY);
  }

  /**
   * Updates the origin/pivot ratios used to calculate the bounding box.
   *
   * @param pivotX - The horizontal ratio: `0` is left and `1` is right.
   * @param pivotY - The vertical ratio: `0` is top and `1` is bottom.
   * @public
   * @return {void}
   */
  public setPivot(pivotX: number, pivotY: number): void {
    assertFiniteNumber(pivotX, 'pivotX');
    assertFiniteNumber(pivotY, 'pivotY');
    this.pivotX.set(pivotX);
    this.pivotY.set(pivotY);
  }

  /**
   * Enables or disables aspect-ratio locking.
   *
   * The current positive width and height establish the ratio used by later
   * dimension updates. A zero-sized object has an unavailable ratio of `0`;
   * locking remains enabled, but dimensions cannot be derived until a positive
   * width and height establish a ratio.
   *
   * @param lock - `true` to enable aspect-ratio locking.
   * @public
   * @return {void}
   */
  public setLockAspectRatio(lock: boolean): void {
    if (typeof lock !== 'boolean') {
      throw new TypeError('lock must be a boolean.');
    }

    this.lockAspectRatio.set(lock);
    this.updateAspectRatio();
  }
}
