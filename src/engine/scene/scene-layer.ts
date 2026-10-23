import { signalValue, type SignalValue } from 'reactive-values';
import type { SceneDrawable } from '../interfaces';
import type { Camera2D } from './camera2d';

export interface SceneLayerOptions {
  name?: string;
  order?: number;
  parallaxX?: number;
  parallaxY?: number;
  visible?: boolean;
  updateObjects?: boolean;
}

/**
 * Holds renderables in stable z-order and applies optional camera parallax.
 * @class SceneLayer
 */
export class SceneLayer {
  /**
   * Layer display name.
   * @property {string} name
   * @public
   * @readonly
   */
  public readonly name: string;

  /**
   * Stacking order among layers.
   * @property {SignalValue<number>} order
   * @public
   * @readonly
   */
  public readonly order: SignalValue<number>;

  /**
   * Horizontal parallax factor.
   * @property {SignalValue<number>} parallaxX
   * @public
   * @readonly
   */
  public readonly parallaxX: SignalValue<number>;

  /**
   * Vertical parallax factor.
   * @property {SignalValue<number>} parallaxY
   * @public
   * @readonly
   */
  public readonly parallaxY: SignalValue<number>;

  /**
   * Layer visibility state.
   * @property {SignalValue<boolean>} visible
   * @public
   * @readonly
   */
  public readonly visible: SignalValue<boolean>;

  /**
   * Whether layer updates contained objects each frame.
   * @property {SignalValue<boolean>} updateObjects
   * @public
   * @readonly
   */
  public readonly updateObjects: SignalValue<boolean>;

  /**
   * Reactive list of managed drawable objects.
   * @property {SignalValue<readonly SceneDrawable[]>} objects
   * @private
   * @readonly
   */
  private readonly objects: SignalValue<readonly SceneDrawable[]> = signalValue<readonly SceneDrawable[]>([]);

  /**
   * Object update callback mapping.
   * @property {Map<SceneDrawable, (deltaSeconds: number) => void>} updateCallbacks
   * @private
   * @readonly
   */
  private readonly updateCallbacks = new Map<SceneDrawable, (deltaSeconds: number) => void>();

  /**
   * Stable insertion order mapping.
   * @property {Map<SceneDrawable, number>} insertionOrder
   * @private
   */
  private insertionOrder = new Map<SceneDrawable, number>();

  /**
   * Next monotonic insertion index.
   * @property {number} nextInsertionOrder
   * @private
   */
  private nextInsertionOrder = 0;

  /**
   * Creates a scene layer with configured parallax and sorting.
   * @public
   * @return {void}
   */
  public constructor(options: SceneLayerOptions = {}) {
    this.name = options.name ?? 'Layer';
    this.order = signalValue(options.order ?? 0);
    this.parallaxX = signalValue(options.parallaxX ?? 1);
    this.parallaxY = signalValue(options.parallaxY ?? options.parallaxX ?? 1);
    this.visible = signalValue(options.visible ?? true);
    this.updateObjects = signalValue(options.updateObjects ?? true);
  }

  /**
   * Adds an object to this layer with an optional update callback.
   * @public
   * @return {void}
   */
  public add(object: SceneDrawable, update?: (deltaSeconds: number) => void): void {
    if (this.insertionOrder.has(object)) return;
    this.insertionOrder.set(object, this.nextInsertionOrder++);
    if (update) this.updateCallbacks.set(object, update);
    this.objects.set([...this.objects(), object]);
  }

  /**
   * Removes an object from this layer.
   * @public
   * @return {boolean}
   */
  public remove(object: SceneDrawable): boolean {
    const objects = this.objects();
    const index = objects.indexOf(object);
    if (index < 0) return false;
    this.objects.set(objects.filter((candidate) => candidate !== object));
    this.insertionOrder.delete(object);
    this.updateCallbacks.delete(object);
    return true;
  }

  /**
   * Clears all objects from this layer.
   * @public
   * @return {void}
   */
  public clear(): void {
    this.objects.set([]);
    this.insertionOrder.clear();
    this.updateCallbacks.clear();
  }

  /**
   * Replaces all objects in the layer.
   * @public
   * @return {void}
   */
  public setObjects(objects: readonly SceneDrawable[]): void {
    const current = this.objects();
    if (objects.length === current.length && objects.every((object, index) => object === current[index])) return;
    this.clear();
    for (const object of objects) this.add(object);
  }

  /**
   * Returns read-only array of contained objects.
   * @public
   * @return {readonly SceneDrawable[]}
   */
  public getObjects(): readonly SceneDrawable[] {
    return this.objects();
  }

  /**
   * Updates all active objects in this layer.
   * @public
   * @return {void}
   */
  public update(deltaSeconds: number): void {
    if (!this.visible()) return;
    if (this.updateObjects()) {
      for (const object of this.objects()) this.updateCallbacks.get(object)?.(deltaSeconds);
    }
  }

  /**
   * Renders objects in z-order with camera transform and parallax.
   * @public
   * @return {void}
   */
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

  /**
   * Resolves z-index value from object.
   * @private
   * @return {number}
   */
  private static getZIndex(object: SceneDrawable): number {
    const value = (object as SceneDrawable & { zIndex?: unknown }).zIndex;
    if (typeof value === 'number') return value;
    if (typeof value === 'function') return (value as SignalValue<number>)();
    return 0;
  }
}
