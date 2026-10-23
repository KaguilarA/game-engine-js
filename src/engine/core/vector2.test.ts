import { describe, expect, it } from 'vitest';
import Vector2 from './vector2';

describe('Vector2 (Zero-Allocation)', () => {
  it('performs in-place mutable arithmetic', () => {
    const v = new Vector2(2, 3);
    const other = new Vector2(4, 5);

    v.add(other);
    expect(v.x).toBe(6);
    expect(v.y).toBe(8);

    v.sub(other);
    expect(v.x).toBe(2);
    expect(v.y).toBe(3);

    v.scale(2);
    expect(v.x).toBe(4);
    expect(v.y).toBe(6);

    v.divide(2);
    expect(v.x).toBe(2);
    expect(v.y).toBe(3);
  });

  it('computes dot, length, distance, and normalization without allocations', () => {
    const a = new Vector2(3, 4);
    expect(a.length()).toBe(5);
    expect(a.lengthSquared()).toBe(25);

    const b = new Vector2(6, 8);
    expect(a.distanceTo(b)).toBe(5);

    a.normalize();
    expect(a.length()).toBeCloseTo(1.0);
  });

  it('provides zero-allocation scratch instances', () => {
    Vector2.scratch1.set(10, 20);
    Vector2.scratch2.set(5, 5);
    Vector2.scratch1.sub(Vector2.scratch2);

    expect(Vector2.scratch1.x).toBe(5);
    expect(Vector2.scratch1.y).toBe(15);
  });
});
