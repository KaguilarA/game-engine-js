import Dimensions from './dimensions';
import { computedValue, signalValue } from 'reactive-values';

type PointerDownListener = (x: number, y: number) => void;
type PointerListener = (pointer: GamePointer) => void;

export interface GamePointer {
  id: number;
  x: number;
  y: number;
}

class Context {
  public readonly canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  private readonly dimensions = new Dimensions(
    this.getParentDimensions().width,
    this.getParentDimensions().height
  );
  private readonly gameDimensions = new Dimensions(
    this.getParentDimensions().width,
    this.getParentDimensions().height
  );
  private readonly ctx: CanvasRenderingContext2D;
  private readonly pointerDownListeners = new Set<PointerDownListener>();
  private readonly pointerStartListeners = new Set<PointerListener>();
  private readonly pointerMoveListeners = new Set<PointerListener>();
  private readonly pointerEndListeners = new Set<PointerListener>();
  private readonly resizeObserver: ResizeObserver | null = null;
  /**
   * Reactive viewport width in CSS pixels.
   */
  public readonly viewportWidth = signalValue(
    this.getParentDimensions().width
  );

  /**
   * Reactive viewport height in CSS pixels.
   */
  public readonly viewportHeight = signalValue(
    this.getParentDimensions().height
  );

  /**
   * Reactive base unit for responsive game geometry.
   */
  public readonly viewportUnit = computedValue(
    () => Math.min(this.viewportWidth(), this.viewportHeight()),
    [this.viewportWidth, this.viewportHeight]
  );

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
   * Indicates whether the current device is a phone or tablet with touch input.
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

  public get context(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * Indicates whether the game canvas is currently displayed fullscreen.
   */
  public get isFullscreen(): boolean {
    return document.fullscreenElement === this.canvas;
  }

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

  private getGamePointer(event: PointerEvent): GamePointer {
    const bounds = this.canvas.getBoundingClientRect();
    const clientWidth = bounds.width > 0 ? bounds.width : this.dimensions.getWidth();
    const clientHeight = bounds.height > 0 ? bounds.height : this.dimensions.getHeight();
    const scaleX = this.dimensions.getWidth() / clientWidth;
    const scaleY = this.dimensions.getHeight() / clientHeight;

    return {
      id: event.pointerId,
      x: (event.clientX - bounds.left) * scaleX,
      y: (event.clientY - bounds.top) * scaleY
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
    if (typeof ResizeObserver !== 'undefined' && this.canvas.parentElement) {
      this.resizeObserver = new ResizeObserver(this.resizeCanvas);
      this.resizeObserver.observe(this.canvas.parentElement);
    }
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerEnd);
    this.canvas.addEventListener('pointercancel', this.onPointerEnd);
  }

  private resizeCanvas = (): void => {
    const { width, height } = this.getParentDimensions();

    this.dimensions.setSize(width, height);
    this.gameDimensions.setSize(width, height);
    this.viewportWidth.set(width);
    this.viewportHeight.set(height);
    this.syncCanvasDimensions();
  };

  /**
   * Syncs the physical pixel buffer and CSS style of the canvas with the
   * viewport. Device pixel ratio improves raster clarity without changing the
   * game coordinate system.
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
    this.resizeObserver?.disconnect();
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
