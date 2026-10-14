import Dimensions from './dimensions';

class Context {
  private readonly dimensions = new Dimensions(
    document.documentElement.clientWidth,
    document.documentElement.clientHeight
  );

  public readonly canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  public get dimensionsModel(): Dimensions {
    return this.dimensions;
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
    this.syncCanvasDimensions();
  };

  /**
   * Syncs the physical pixel buffer and CSS style of the canvas with Dimensions.
   */
  public syncCanvasDimensions(pixelRatio = window.devicePixelRatio || 1): void {
    const scaledWidth = this.dimensions.scaledWidth();
    const scaledHeight = this.dimensions.scaledHeight();

    this.canvas.width = Math.floor(scaledWidth * pixelRatio);
    this.canvas.height = Math.floor(scaledHeight * pixelRatio);
    this.canvas.style.width = `${scaledWidth}px`;
    this.canvas.style.height = `${scaledHeight}px`;
  }

  public clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
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