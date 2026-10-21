import type { Atlas } from '../../assets/atlas';
import type { SpineEventHandler } from '../../interfaces/spine-event-handler';
import type { SpineRecord } from '../../interfaces/spine-record';
import Dimensions from '../../core/dimensions';
import { SpineRenderer } from './spine-renderer';
import { SpineRuntime } from './spine-runtime';

export class SpineSprite {
  public readonly dimensions: Dimensions;
  public readonly runtime: SpineRuntime;
  private readonly renderer = new SpineRenderer();
  private readonly atlas: Atlas;

  public get isPlaying(): boolean {
    return this.runtime.isPlaying;
  }

  public constructor(
    data: SpineRecord,
    atlas: Atlas,
    x = 0,
    y = 0,
    pivotX = 0.5,
    pivotY = 0.5
  ) {
    this.atlas = atlas;
    this.runtime = new SpineRuntime(data, atlas);
    this.dimensions = new Dimensions(
      this.runtime.width,
      this.runtime.height,
      x,
      y,
      pivotX,
      pivotY
    );
  }

  public draw(): void {
    const width = this.dimensions.getWidth();
    const height = this.dimensions.getHeight();
    const centerX = this.dimensions.getX() + width *
      (0.5 - this.dimensions.getPivotX());
    const centerY = this.dimensions.getY() + height *
      (0.5 - this.dimensions.getPivotY());

    this.renderer.draw(
      this.runtime,
      this.atlas,
      centerX,
      centerY,
      width,
      height
    );
  }

  public onEvent(name: string, handler: SpineEventHandler): () => void {
    return this.runtime.onEvent(name, handler);
  }

  public play(name: string, loop = false): void {
    this.runtime.play(name, loop);
  }
  
  public queue(name: string, loop = true): void {
    this.runtime.queue(name, loop);
  }

  public setSkin(name: string): void {
    this.runtime.setSkin(name);
  }

  public update(deltaSeconds: number): void {
    this.runtime.update(deltaSeconds);
  }
}
