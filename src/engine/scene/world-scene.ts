import { Camera2D } from './camera2d';
import { SceneLayer } from './scene-layer';
import { signalValue } from 'reactive-values';
import type { SignalValue } from 'reactive-values';

/** Updates and draws a camera-driven 2D world composed of ordered layers. */
export class WorldScene {
  public readonly camera: Camera2D;
  private readonly layers: SignalValue<readonly SceneLayer[]> = signalValue<readonly SceneLayer[]>([]);
  private readonly insertionOrder = new Map<SceneLayer, number>();
  private nextInsertionOrder = 0;

  public constructor(camera = new Camera2D()) {
    this.camera = camera;
  }

  public addLayer(layer: SceneLayer): void {
    if (this.insertionOrder.has(layer)) return;
    this.insertionOrder.set(layer, this.nextInsertionOrder++);
    this.layers.set([...this.layers(), layer]);
  }

  public removeLayer(layer: SceneLayer): boolean {
    const layers = this.layers();
    const index = layers.indexOf(layer);
    if (index < 0) return false;
    this.layers.set(layers.filter((candidate) => candidate !== layer));
    this.insertionOrder.delete(layer);
    return true;
  }

  public getLayers(): readonly SceneLayer[] {
    return this.layers();
  }

  public update(deltaSeconds: number): void {
    this.camera.update(deltaSeconds);
    const layers = this.getOrderedLayers();
    for (const layer of layers) layer.update(deltaSeconds);
  }

  public draw(): void {
    const layers = this.getOrderedLayers();
    for (const layer of layers) layer.draw(this.camera);
  }

  private getOrderedLayers(): SceneLayer[] {
    return this.layers().slice().sort((a, b) => a.order() - b.order()
      || (this.insertionOrder.get(a) ?? 0) - (this.insertionOrder.get(b) ?? 0));
  }
}
