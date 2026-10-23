import type ObjectPool from './object-pool';
import type { Poolable } from '../interfaces/poolable';

/**
 * Global registry for game-wide pools following SOLID singleton design.
 * @class PoolRegistry
 */
class PoolRegistry {
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

export default new PoolRegistry();