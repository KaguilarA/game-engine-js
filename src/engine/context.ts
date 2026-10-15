import Dimensions from './dimensions';
import { computedValue, signalValue } from 'reactive-values';

/**
 * Owns canvas sizing, responsive dimensions, and drawing helpers.
 * @class Context
 */
class Context {
  /**
   * Canvas element owned by this engine context.
   * @property {HTMLCanvasElement} canvas
   * @public
   * @readonly
   */
  public readonly canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  /**
   * Stores the dimensions state.
   * @property {Dimensions} dimensions
   * @private
   * @readonly
   */
  private readonly dimensions = new Dimensions(
    this.getParentDimensions().width,
    this.getParentDimensions().height
  );
  /**
   * Stores the game dimensions state.
   * @property {Dimensions} gameDimensions
   * @private
   * @readonly
   */
  private readonly gameDimensions = new Dimensions(
    this.getParentDimensions().width,
    this.getParentDimensions().height
  );
  /**
   * Stores the ctx state.
   * @property {CanvasRenderingContext2D} ctx
   * @private
   * @readonly
   */
  private readonly ctx: CanvasRenderingContext2D;
  /**
   * Reactive viewport width in CSS pixels.
   * @property {Signal} viewportWidth
   * @public
   * @readonly
   */
  public readonly viewportWidth = signalValue(
    this.getParentDimensions().width
  );

  /**
   * Reactive viewport height in CSS pixels.
   * @property {Signal} viewportHeight
   * @public
   * @readonly
   */
  public readonly viewportHeight = signalValue(
    this.getParentDimensions().height
  );

  /**
   * Reactive minimum viewport dimension, used as a stable scale for
   * responsive game geometry.
   * @property {() => number} viewportUnit
   * @public
   * @readonly
   */
  public readonly viewportUnit = computedValue(
    () => Math.min(this.viewportWidth(), this.viewportHeight()),
    [this.viewportWidth, this.viewportHeight]
  );

  /**
   * Returns dimensions for the full canvas viewport.
   * @public
   * @return {Dimensions}
   */
  public get dimensionsModel(): Dimensions {
    return this.dimensions;
  }

  /**
   * Gets the logical game area used by entities and rendering. Its dimensions
   * always match the viewport in CSS pixels.
   */
  public get gameDimensionsModel(): Dimensions {
    return this.gameDimensions;
  }

  /**
   * Determines whether the current viewport is taller than it is wide.
   */
  public get isPortrait(): boolean {
    return this.dimensions.getHeight() > this.dimensions.getWidth();
  }

  /**
   * Reports touch-oriented devices, including tablets.
   * @public
   * @return {boolean}
   */
  public get isMobileDevice(): boolean {
    const userAgent = navigator.userAgent;
    const isMobileUserAgent = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Windows Phone|Tablet|Silk|Kindle/i.test(
      userAgent
    );
    const isIPadOS = /Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1;
    const isPhoneOrTabletTouchScreen = (
      navigator.maxTouchPoints > 0
      && Math.min(
        screen.width,
        screen.height
      ) <= 1024
    );

    return isMobileUserAgent || isIPadOS || isPhoneOrTabletTouchScreen;
  }

  /**
   * Exposes the 2D rendering context for advanced game-specific drawing.
   * @public
   * @return {CanvasRenderingContext2D}
   */
  public get context(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * Reports whether the game canvas currently fills the browser display.
   * @public
   * @return {boolean}
   */
  public get isFullscreen(): boolean {
    return document.fullscreenElement === this.canvas;
  }

  /**
   * Measures the containing element before calculating canvas scale.
   * @private
   * @return {void}
   */
  private getParentDimensions(): { width: number; height: number } {
    const parent = this.canvas?.parentElement;
    const width = (parent && parent.clientWidth > 0)
      ? parent.clientWidth
      : (typeof document !== 'undefined' && document.documentElement ? document.documentElement.clientWidth : 800);
    const height = (parent && parent.clientHeight > 0)
      ? parent.clientHeight
      : (typeof document !== 'undefined' && document.documentElement ? document.documentElement.clientHeight : 600);

    return {
      width: width > 0 ? width : 800,
      height: height > 0 ? height : 600
    };
  }

  constructor() {
    if (!this.canvas) {
      throw new Error('Failed to find the canvas element with id "game-canvas".');
    }

    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to initialize 2D rendering context.');
    }
    this.ctx = context;

    this.resizeCanvas();
  }

  /**
   * Stores the resize canvas state.
   * @property {() => void} resizeCanvas
   * @private
   */
  private resizeCanvas = (): void => {
    const { width, height } = this.getParentDimensions();

    this.dimensions.setSize(width, height);
    this.gameDimensions.setSize(width, height);
    this.viewportWidth.set(width);
    this.viewportHeight.set(height);
    this.syncCanvasDimensions();
  };

  /**
   * Recalculates logical viewport dimensions after a browser resize.
   *
   * `GameEvents` invokes this method when the browser viewport changes.
   *
   * @public
   * @return {void}
   */
  public updateViewport(): void {
    this.resizeCanvas();
  }

  /**
   * Synchronizes backing-store size and scale with the logical viewport.
   * @public
   * @return {void}
   */
  public syncCanvasDimensions(pixelRatio = window.devicePixelRatio || 1): void {
    const viewportWidth = this.dimensions.getWidth();
    const viewportHeight = this.dimensions.getHeight();
    this.canvas.width = Math.floor(viewportWidth * pixelRatio);
    this.canvas.height = Math.floor(viewportHeight * pixelRatio);
    this.canvas.style.width = `${viewportWidth}px`;
    this.canvas.style.height = `${viewportHeight}px`;
    this.ctx.setTransform(
      pixelRatio,
      0,
      0,
      pixelRatio,
      0,
      0
    );
  }

  /**
   * Clears the full logical canvas.
   * @public
   * @return {void}
   */
  public clear(): void {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  /**
   * Draws an image in logical game coordinates.
   * @public
   * @return {void}
   */
  public drawImage(
    image: CanvasImageSource,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    this.ctx.drawImage(image, x, y, width, height);
  }

  /**
   * Draws fitted text with the requested alignment and fill color.
   * @public
   * @return {void}
   */
  public drawText(
    text: string,
    x: number,
    y: number,
    size: number,
    color: string,
    align: CanvasTextAlign = 'left',
    maxWidth?: number
  ): void {
    const canvasWidth = this.gameDimensions.getWidth();
    let limitWidth = maxWidth;

    if (limitWidth === undefined || limitWidth <= 0) {
      if (align === 'center') {
        limitWidth = Math.max(16, Math.min(x, canvasWidth - x) * 2 - 24);
      } else if (align === 'right') {
        limitWidth = Math.max(16, x - 16);
      } else {
        limitWidth = Math.max(16, canvasWidth - x - 16);
      }
    }

    let fontSize = size;
    this.ctx.font = `${fontSize}px sans-serif`;
    const measuredWidth = this.ctx.measureText(text).width;

    if (limitWidth !== undefined && limitWidth > 0 && measuredWidth > limitWidth) {
      const scale = limitWidth / measuredWidth;
      fontSize = Math.max(9, Math.floor(size * scale));
      this.ctx.font = `${fontSize}px sans-serif`;
    }

    this.ctx.fillStyle = color;
    this.ctx.textAlign = align;

    if (limitWidth !== undefined && limitWidth > 0) {
      this.ctx.fillText(text, x, y, limitWidth);
    } else {
      this.ctx.fillText(text, x, y);
    }
  }

  /**
   * Draws a filled rectangle in logical canvas coordinates.
   * @public
   * @return {void}
   */
  public drawRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string
  ): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);
  }

  /**
   * Draws a filled circle in logical canvas coordinates.
   * @public
   * @return {void}
   */
  public drawCircle(
    x: number,
    y: number,
    radius: number,
    color: string
  ): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Enters or exits fullscreen mode for the game container.
   * @public
   * @return {Promise<void>}
   */
  public async toggleFullscreen(): Promise<void> {
    if (this.isFullscreen) {
      if (document.exitFullscreen === undefined) {
        throw new Error('Fullscreen exit is not supported by this browser.');
      }

      await document.exitFullscreen();
      return;
    }

    if (this.canvas.requestFullscreen === undefined) {
      throw new Error('Fullscreen is not supported by this browser.');
    }

    await this.canvas.requestFullscreen();
  }

}

const GameContext = new Context();

export default GameContext;
