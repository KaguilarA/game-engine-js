import { computedValue, signalValue } from 'reactive-values';

export class GameContext {
  private height = signalValue(document.documentElement.clientHeight);
  private width = signalValue(document.documentElement.clientWidth);
  public canvas: HTMLCanvasElement = document.createElement('canvas');

  public size = computedValue(
    () => ({
      width: this.width(),
      height: this.height()
    }),
    [this.width, this.height]
  );

  private get context(): CanvasRenderingContext2D | null {
    return this.canvas.getContext('2d');
  }

  constructor() {
    this.canvas.id = 'game-canvas';

    this.width.effect(
      width => this.canvas.width = width
    );

    this.height.effect(
      height => this.canvas.height = height
    );

    window.addEventListener('resize', this.resizeCanvas);
  }

  private resizeCanvas = (): void => {
    this.width.set(document.documentElement.clientWidth);
    this.height.set(document.documentElement.clientHeight);
  };

  public clear(): void {
    const context = this.context;

    if (!context) return;

    context.clearRect(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
  }

  public drawRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string
  ): void {
    const context = this.context;

    if (!context) return;

    context.fillStyle = color;
    context.fillRect(x, y, width, height);
  }

  public destroy(): void {
    window.removeEventListener('resize', this.resizeCanvas);
  }
}