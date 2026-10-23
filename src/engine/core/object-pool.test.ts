import { describe, expect, it } from 'vitest';
import { ObjectPool, GamePools, type Poolable } from './object-pool';

class TestBullet implements Poolable {
  public x = 0;
  public y = 0;
  public active = false;

  public reset(): void {
    this.x = 0;
    this.y = 0;
    this.active = false;
  }
}

describe('ObjectPool (Zero-Allocation)', () => {
  it('pre-allocates and reuses instances without heap churn', () => {
    let creations = 0;
    const pool = new ObjectPool(() => {
      creations++;
      return new TestBullet();
    }, 5);

    expect(creations).toBe(5);
    expect(pool.available).toBe(5);
    expect(pool.inUse).toBe(0);

    const b1 = pool.acquire();
    b1.x = 100;
    b1.active = true;

    expect(pool.available).toBe(4);
    expect(pool.inUse).toBe(1);

    pool.release(b1);
    expect(b1.x).toBe(0); // Reset was executed
    expect(b1.active).toBe(false);
    expect(pool.available).toBe(5);
    expect(pool.inUse).toBe(0);
    expect(creations).toBe(5); // No extra instance was constructed
  });

  it('releases an entire array of active items without reallocating arrays', () => {
    const pool = new ObjectPool(() => new TestBullet(), 3);
    const bullets = [pool.acquire(), pool.acquire(), pool.acquire()];

    expect(pool.inUse).toBe(3);
    expect(bullets.length).toBe(3);

    pool.releaseAll(bullets);
    expect(pool.inUse).toBe(0);
    expect(bullets.length).toBe(0);
  });

  it('registers in global GamePools singleton', () => {
    const bulletPool = new ObjectPool(() => new TestBullet(), 2);
    GamePools.register('bullets', bulletPool);

    expect(GamePools.has('bullets')).toBe(true);
    expect(GamePools.get<TestBullet>('bullets')).toBe(bulletPool);
  });
});
