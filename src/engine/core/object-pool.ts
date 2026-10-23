import { computedValue, signalValue } from 'reactive-values';
import type { ComputedValue, SignalValue } from 'reactive-values';

/**
 * Interface that must be implemented by objects managed by an ObjectPool.
 */
export interface Poolable {
  reset(): void;
}

/**
 * High-performance object pool with zero runtime allocations and reactive tracking.
 * @class ObjectPool
 */
export class ObjectPool<T extends Poolable> {
  /**
   * Stores idle pooled instances.
   * @property {T[]} items
   * @private
   * @readonly
   */
  private readonly items: T[] = [];

  /**
   * Factory function used to instantiate items.
   * @property {() => T} factory
   * @private
   * @readonly
   */
  private readonly factory: () => T;

  /**
   * Stores the maximum capacity of idle items.
   * @property {number} maxSize
   * @private
   * @readonly
   */
  private readonly maxSize: number;

  /**
   * Stores the reactive count of borrowed instances.
   * @property {SignalValue<number>} inUseCount
   * @private
   * @readonly
   */
  private readonly inUseCount: SignalValue<number>;

  /**
   * Stores the reactive count of idle available instances.
   * @property {SignalValue<number>} availableCount
   * @private
   * @readonly
   */
  private readonly availableCount: SignalValue<number>;

  /**
   * Derives the total number of managed instances.
   * @property {ComputedValue<number>} totalCount
   * @private
   * @readonly
   */
  private readonly totalCount: ComputedValue<number>;

  /**
   * Returns the count of idle instances available for immediate use.
   * @public
   * @return {number}
   */
  public get available(): number {
    return this.availableCount();
  }

  /**
   * Returns the count of borrowed instances currently in use.
   * @public
   * @return {number}
   */
  public get inUse(): number {
    return this.inUseCount();
  }

  /**
   * Returns the total count of instances managed by this pool.
   * @public
   * @return {number}
   */
  public get total(): number {
    return this.totalCount();
  }

  /**
   * Creates an object pool with pre-allocated instances.
   * @public
   * @return {void}
   */
  constructor(factory: () => T, initialSize = 0, maxSize = Infinity) {
    this.factory = factory;
    this.maxSize = Math.max(1, maxSize);
    this.inUseCount = signalValue(0);
    this.availableCount = signalValue(0);
    this.totalCount = computedValue(
      () => this.availableCount() + this.inUseCount(),
      [this.availableCount, this.inUseCount]
    );

    for (let index = 0; index < initialSize; index++) {
      this.items.push(this.factory());
    }
    this.availableCount.set(this.items.length);
  }

  /**
   * Borrows an instance from the pool or constructs a new one.
   * @public
   * @return {T}
   */
  public acquire(): T {
    this.inUseCount.set(this.inUseCount() + 1);
    const item = this.items.pop();
    if (item !== undefined) {
      this.availableCount.set(this.items.length);
      return item;
    }
    return this.factory();
  }

  /**
   * Returns an instance back to the pool, invoking its reset routine.
   * @public
   * @return {void}
   */
  public release(item: T): void {
    item.reset();
    if (this.inUseCount() > 0) {
      this.inUseCount.set(this.inUseCount() - 1);
    }
    if (this.items.length < this.maxSize) {
      this.items.push(item);
      this.availableCount.set(this.items.length);
    }
  }

  /**
   * Releases an entire collection of items back into the pool and clears the array.
   * @public
   * @return {void}
   */
  public releaseAll(activeItems: T[]): void {
    for (let index = 0; index < activeItems.length; index++) {
      const item = activeItems[index];
      item.reset();
      if (this.items.length < this.maxSize) {
        this.items.push(item);
      }
    }
    this.inUseCount.set(Math.max(0, this.inUseCount() - activeItems.length));
    this.availableCount.set(this.items.length);
    activeItems.length = 0;
  }

  /**
   * Clears all idle instances from memory.
   * @public
   * @return {void}
   */
  public clear(): void {
    this.items.length = 0;
    this.availableCount.set(0);
    this.inUseCount.set(0);
  }
}

/**
 * Global registry for game-wide pools following SOLID singleton design.
 * @class PoolRegistry
 */
export class PoolRegistry {
  /**
   * Stores registered pools by name.
   * @property {Map<string, ObjectPool<any>>} pools
   * @private
   * @readonly
   */
  private readonly pools = new Map<string, ObjectPool<any>>();

  /**
   * Registers a named object pool.
   * @public
   * @return {void}
   */
  public register<T extends Poolable>(name: string, pool: ObjectPool<T>): void {
    this.pools.set(name, pool);
  }

  /**
   * Retrieves a named object pool.
   * @public
   * @return {ObjectPool<T> | undefined}
   */
  public get<T extends Poolable>(name: string): ObjectPool<T> | undefined {
    return this.pools.get(name) as ObjectPool<T> | undefined;
  }

  /**
   * Checks if a pool exists.
   * @public
   * @return {boolean}
   */
  public has(name: string): boolean {
    return this.pools.has(name);
  }

  /**
   * Clears all registered pools.
   * @public
   * @return {void}
   */
  public clear(): void {
    for (const pool of this.pools.values()) {
      pool.clear();
    }
    this.pools.clear();
  }
}

export const GamePools = new PoolRegistry();
