import Dimensions from './dimensions';

const LANDSCAPE_WIDTH = 1920;
const LANDSCAPE_HEIGHT = 1080;
const PORTRAIT_WIDTH = 1080;
const PORTRAIT_HEIGHT = 1920;

class Context {
  private readonly dimensions = new Dimensions(
    document.documentElement.clientWidth,
    document.documentElement.clientHeight
  );
  private readonly gameDimensions = new Dimensions(
    LANDSCAPE_WIDTH,
    LANDSCAPE_HEIGHT
  );

  public readonly canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  public get dimensionsModel(): Dimensions {
    return this.dimensions;
  }

  /**
   * Gets the logical game area used by entities and rendering.
   *
   * Landscape uses `1920 x 1080`; portrait uses `1080 x 1920`.
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

  public get context(): CanvasRenderingContext2D {
    return this.ctx;
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
    window.addEventListener('resize', this.resizeCanvas);
  }

  private resizeCanvas = (): void => {
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;

    this.dimensions.setSize(width, height);
    this.gameDimensions.setSize(
      this.isPortrait ? PORTRAIT_WIDTH : LANDSCAPE_WIDTH,
      this.isPortrait ? PORTRAIT_HEIGHT : LANDSCAPE_HEIGHT
    );
    this.syncCanvasDimensions();
  };

  /**
   * Syncs the physical pixel buffer and CSS style of the canvas with Dimensions.
   *
   * The logical game area is fitted uniformly inside the viewport. This
   * prevents portrait or unusually shaped viewports from cropping entities.
   */
  public syncCanvasDimensions(pixelRatio = window.devicePixelRatio || 1): void {
    const viewportWidth = this.dimensions.getWidth();
    const viewportHeight = this.dimensions.getHeight();
    const gameWidth = this.gameDimensions.getWidth();
    const gameHeight = this.gameDimensions.getHeight();
    const scale = Math.min(
      viewportWidth / gameWidth,
      viewportHeight / gameHeight
    );
    const offsetX = (viewportWidth - gameWidth * scale) * 0.5;
    const offsetY = (viewportHeight - gameHeight * scale) * 0.5;

    this.canvas.width = Math.floor(viewportWidth * pixelRatio);
    this.canvas.height = Math.floor(viewportHeight * pixelRatio);
    this.canvas.style.width = `${viewportWidth}px`;
    this.canvas.style.height = `${viewportHeight}px`;
    this.ctx.setTransform(
      pixelRatio * scale,
      0,
      0,
      pixelRatio * scale,
      pixelRatio * offsetX,
      pixelRatio * offsetY
    );
  }

  public clear(): void {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  /**
   * Draws an image in logical game coordinates.
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

  public drawText(
    text: string,
    x: number,
    y: number,
    size: number,
    color: string,
    align: CanvasTextAlign = 'left'
  ): void {
    this.ctx.fillStyle = color;
    this.ctx.font = `${size}px sans-serif`;
    this.ctx.textAlign = align;
    this.ctx.fillText(text, x, y);
  }

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

  public destroy(): void {
    window.removeEventListener('resize', this.resizeCanvas);
  }
}

const GameContext = new Context();

export default GameContext;