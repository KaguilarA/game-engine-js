import Sprite from './sprite';

/** Shared position, size, animation, and drawing behavior for sprite entities. */
export abstract class SpriteEntity {
  protected readonly sprite: Sprite;

  protected constructor(sprite: Sprite) {
    this.sprite = sprite;
  }

  public get x(): number {
    return this.sprite.dimensions.getX();
  }

  public get y(): number {
    return this.sprite.dimensions.getY();
  }

  public get width(): number {
    return this.sprite.dimensions.getWidth();
  }

  public get height(): number {
    return this.sprite.dimensions.getHeight();
  }

  public get dimensions() {
    return this.sprite.dimensions;
  }

  public setPosition(x: number, y: number): void {
    this.sprite.dimensions.setPosition(x, y);
  }

  public setSize(width: number, height: number): void {
    this.sprite.dimensions.setSize(width, height);
  }

  public moveBy(x: number, y: number): void {
    this.setPosition(this.x + x, this.y + y);
  }

  public draw(): void {
    this.sprite.draw();
  }

  protected updateSprite(deltaSeconds: number): void {
    this.sprite.update(deltaSeconds);
  }
}
