/**
 * Interface that must be implemented by objects managed by an ObjectPool.
 */
export interface Poolable {
  reset(): void;
}