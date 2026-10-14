import Dimensions from './dimensions';

const LANDSCAPE_WIDTH = 1920;
const LANDSCAPE_HEIGHT = 1080;
const PORTRAIT_WIDTH = 1080;
const PORTRAIT_HEIGHT = 1920;

type PointerDownListener = (x: number, y: number) => void;
type PointerListener = (pointer: GamePointer) => void;

export interface GamePointer {
  id: number;
  x: number;
  y: number;
}

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
  private readonly pointerDownListeners = new Set<PointerDownListener>();
  private readonly pointerStartListeners = new Set<PointerListener>();
  private readonly pointerMoveListeners = new Set<PointerListener>();
  private readonly pointerEndListeners = new Set<PointerListener>();
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;

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

  /**
   * Indicates whether the current device is a phone with touch input.
   */
  public get isMobileDevice(): boolean {
    const userAgent = navigator.userAgent;
    const isMobileUserAgent = /Android|iPhone|iPod|IEMobile|Opera Mini/i.test(
      userAgent
    );
    const isSmallTouchDevice = (
      navigator.maxTouchPoints > 0
      && Math.min(
        this.dimensions.getWidth(),
        this.dimensions.getHeight()
      ) <= 768
    );

    return isMobileUserAgent || isSmallTouchDevice;
  }

  public get context(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * Indicates whether the game canvas is currently displayed fullscreen.
   */
  public get isFullscreen(): boolean {
    return document.fullscreenElement === this.canvas;
  }

  private getGamePointer(event: PointerEvent): GamePointer {
    const bounds = this.canvas.getBoundingClientRect();

    return {
      id: event.pointerId,
      x: (event.clientX - bounds.left - this.offsetX) / this.scale,
      y: (event.clientY - bounds.top - this.offsetY) / this.scale
    };
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    const pointer = this.getGamePointer(event);
    this.pointerDownListeners.forEach((listener) => {
      listener(pointer.x, pointer.y);
    });
    this.pointerStartListeners.forEach((listener) => listener(pointer));
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const pointer = this.getGamePointer(event);
    this.pointerMoveListeners.forEach((listener) => listener(pointer));
  };

  private readonly onPointerEnd = (event: PointerEvent): void => {
    const pointer = this.getGamePointer(event);
    this.pointerEndListeners.forEach((listener) => listener(pointer));
  };

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
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerEnd);
    this.canvas.addEventListener('pointercancel', this.onPointerEnd);
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

    this.scale = scale;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
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

  /**
   * Draws a filled circle in logical game coordinates.
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
   * Enters or exits fullscreen mode for the game canvas.
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

  /**
   * Registers a listener that receives pointer positions in game coordinates.
   *
   * @returns A function that unregisters the listener.
   */
  public addPointerDownListener(listener: PointerDownListener): () => void {
    this.pointerDownListeners.add(listener);

    return () => {
      this.pointerDownListeners.delete(listener);
    };
  }

  public addPointerStartListener(listener: PointerListener): () => void {
    this.pointerStartListeners.add(listener);

    return () => {
      this.pointerStartListeners.delete(listener);
    };
  }

  public addPointerMoveListener(listener: PointerListener): () => void {
    this.pointerMoveListeners.add(listener);

    return () => {
      this.pointerMoveListeners.delete(listener);
    };
  }

  public addPointerEndListener(listener: PointerListener): () => void {
    this.pointerEndListeners.add(listener);

    return () => {
      this.pointerEndListeners.delete(listener);
    };
  }

  public destroy(): void {
    window.removeEventListener('resize', this.resizeCanvas);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerEnd);
    this.canvas.removeEventListener('pointercancel', this.onPointerEnd);
    this.pointerDownListeners.clear();
    this.pointerStartListeners.clear();
    this.pointerMoveListeners.clear();
    this.pointerEndListeners.clear();
  }
}

const GameContext = new Context();

export default GameContext;