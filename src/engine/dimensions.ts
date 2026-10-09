import { computedValue, signalValue } from 'reactive-values';

export class Dimensions {
  private readonly height = signalValue(0);
  private readonly width = signalValue(0);
  private readonly x = signalValue(0);
  private readonly y = signalValue(0);

  public readonly area = computedValue(
    () => this.width() * this.height(),
    [this.width, this.height]
  );

  public readonly position = computedValue(
    () => ({
      x: this.x(),
      y: this.y()
    }),
    [this.x, this.y]
  );

  public readonly size = computedValue(
    () => ({
      width: this.width(),
      height: this.height()
    }),
    [this.width, this.height]
  );

  constructor(
    width = 0,
    height = 0,
    x = 0,
    y = 0
  ) {
    this.width.set(width);
    this.height.set(height);
    this.x.set(x);
    this.y.set(y);
  }

  public setPosition(x: number, y: number): void {
    this.x.set(x);
    this.y.set(y);
  }

  public setSize(width: number, height: number): void {
    this.width.set(width);
    this.height.set(height);
  }
}