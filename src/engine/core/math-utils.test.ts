import { describe, expect, it } from 'vitest';
import MathUtils from './math-utils';

describe('MathUtils', () => {
  it('clamps and smoothSteps numeric values', () => {
    expect(MathUtils.clamp(5, 0, 10)).toBe(5);
    expect(MathUtils.clamp(-5, 0, 10)).toBe(0);
    expect(MathUtils.clamp(15, 0, 10)).toBe(10);

    expect(MathUtils.smoothStep(0)).toBe(0);
    expect(MathUtils.smoothStep(1)).toBe(1);
    expect(MathUtils.smoothStep(0.5)).toBe(0.5);
  });

  it('interpolates numbers and angles', () => {
    expect(MathUtils.lerp(10, 20, 0.5)).toBe(15);
    expect(MathUtils.inverseLerp(10, 20, 15)).toBe(0.5);

    // Shortest-arc angle interpolation (e.g. 350 to 10 should go through 0, not backwards 340)
    expect(MathUtils.lerpAngle(350, 10, 0.5)).toBe(360);
    expect(MathUtils.lerpAngle(10, 350, 0.5)).toBe(0);
  });

  it('converts degrees and radians', () => {
    expect(MathUtils.degToRad(180)).toBeCloseTo(Math.PI);
    expect(MathUtils.radToDeg(Math.PI)).toBeCloseTo(180);
  });

  it('computes distances and angles', () => {
    expect(MathUtils.distanceSquared(0, 0, 3, 4)).toBe(25);
    expect(MathUtils.distance(0, 0, 3, 4)).toBe(5);
    expect(MathUtils.angleBetween(0, 0, 1, 0)).toBeCloseTo(0);
    expect(MathUtils.angleBetween(0, 0, 0, 1)).toBeCloseTo(Math.PI / 2);
  });

  it('verifies approximately equal floats', () => {
    expect(MathUtils.approximately(0.1 + 0.2, 0.3)).toBe(true);
    expect(MathUtils.approximately(1.0, 1.05)).toBe(false);
  });
});
