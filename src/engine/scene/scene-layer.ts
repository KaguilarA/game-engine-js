import type { SceneDrawable } from '../interfaces/renderable';
import type { Camera2D } from './camera2d';
import { signalValue } from 'reactive-values';
import type { SignalValue } from 'reactive-values';

export interface SceneLayerOptions {
  name?: string;
  order?: number;
  parallaxX?: number;
  parallaxY?: number;
  visible?: boolean;
  updateObjects?: boolean;
}

/** Holds renderables in stable z-order and applies optional camera parallax. */
export class SceneLayer {
  public readonly name: string;
  public readonly order: SignalValue<number>;
  public readonly parallaxX: SignalValue<number>;
  public readonly parallaxY: SignalValue<number>;
  public readonly visible: SignalValue<boolean>;
  public readonly updateObjects: SignalValue<boolean>;
  private readonly objects: SignalValue<readonly SceneDrawable[]> = signalValue<readonly SceneDrawable[]>([]);
  private readonly updateCallbacks = new Map<SceneDrawable, (deltaSeconds: number) => void>();
  private insertionOrder = new Map<SceneDrawable, number>();
  private nextInsertionOrder = 0;

  public constructor(options: SceneLayerOptions = {}) {
    this.name = options.name ?? 'Layer';
    this.order = signalValue(options.order ?? 0);
    this.parallaxX = signalValue(options.parallaxX ?? 1);
    this.parallaxY = signalValue(options.parallaxY ?? options.parallaxX ?? 1);
    this.visible = signalValue(options.visible ?? true);
    this.updateObjects = signalValue(options.updateObjects ?? true);
  }

  public add(object: SceneDrawable, update?: (deltaSeconds: number) => void): void {
    if (this.insertionOrder.has(object)) return;
    this.insertionOrder.set(object, this.nextInsertionOrder++);
    if (update) this.updateCallbacks.set(object, update);
    this.objects.set([...this.objects(), object]);
  }

  public remove(object: SceneDrawable): boolean {
    const objects = this.objects();
    const index = objects.indexOf(object);
    if (index < 0) return false;
    this.objects.set(objects.filter((candidate) => candidate !== object));
    this.insertionOrder.delete(object);
    this.updateCallbacks.delete(object);
    return true;
  }

  public clear(): void {
    this.objects.set([]);
    this.insertionOrder.clear();
    this.updateCallbacks.clear();
  }

  public setObjects(objects: readonly SceneDrawable[]): void {
    const current = this.objects();
    if (objects.length === current.length && objects.every((object, index) => object === current[index])) return;
    this.clear();
    for (const object of objects) this.add(object);
  }

  public getObjects(): readonly SceneDrawable[] {
    return this.objects();
  }

  public update(deltaSeconds: number): void {
    if (!this.visible()) return;
    if (this.updateObjects()) {
      for (const object of this.objects()) this.updateCallbacks.get(object)?.(deltaSeconds);
    }
  }

  public draw(camera?: Camera2D): void {
    if (!this.visible()) return;
    const drawObjects = (): void => {
      const ordered = this.objects().slice().sort((a, b) => {
        const aOrder = SceneLayer.getZIndex(a);
        const bOrder = SceneLayer.getZIndex(b);
        return aOrder - bOrder
          || (this.insertionOrder.get(a) ?? 0) - (this.insertionOrder.get(b) ?? 0);
      });
      for (const object of ordered) object.draw();
    };
    if (camera) camera.withTransform(drawObjects, this.parallaxX(), this.parallaxY());
    else drawObjects();
  }

  private static getZIndex(object: SceneDrawable): number {
    const value = (object as SceneDrawable & { zIndex?: unknown }).zIndex;
    if (typeof value === 'number') return value;
    if (typeof value === 'function') return (value as SignalValue<number>)();
    return 0;
  }
}
