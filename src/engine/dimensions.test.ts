import { describe, expect, it } from 'vitest';

import Dimensions from './dimensions';

describe('Dimensions', () => {
  it('uses zero dimensions, position, and pivot by default', () => {
    const dimensions = new Dimensions();

    expect(dimensions.getX()).toBe(0);
    expect(dimensions.getY()).toBe(0);
    expect(dimensions.getWidth()).toBe(0);
    expect(dimensions.getHeight()).toBe(0);
    expect(dimensions.getScaleX()).toBe(1);
    expect(dimensions.getScaleY()).toBe(1);
    expect(dimensions.getPivotX()).toBe(0);
    expect(dimensions.getPivotY()).toBe(0);
    expect(dimensions.getAspectRatio()).toBe(0);
    expect(dimensions.position()).toEqual({ x: 0, y: 0 });
    expect(dimensions.size()).toEqual({ width: 0, height: 0 });
  });

  it('initializes custom dimensions, position, and pivot', () => {
    const dimensions = new Dimensions(20, 10, -5, 8, 0.5, 1);

    expect(dimensions.position()).toEqual({ x: -5, y: 8 });
    expect(dimensions.size()).toEqual({ width: 20, height: 10 });
    expect(dimensions.getAspectRatio()).toBe(2);
    expect(dimensions.left()).toBe(-15);
    expect(dimensions.right()).toBe(5);
    expect(dimensions.top()).toBe(-2);
    expect(dimensions.bottom()).toBe(8);
  });

  it('updates position and size through their setters', () => {
    const dimensions = new Dimensions();

    dimensions.setX(-10);
    dimensions.setY(15);
    dimensions.setWidth(12);
    dimensions.setHeight(6);

    expect(dimensions.position()).toEqual({ x: -10, y: 15 });
    expect(dimensions.size()).toEqual({ width: 12, height: 6 });
    expect(dimensions.getAspectRatio()).toBe(2);

    dimensions.setPosition(4, -3);
    dimensions.setSize(30, 15);

    expect(dimensions.position()).toEqual({ x: 4, y: -3 });
    expect(dimensions.size()).toEqual({ width: 30, height: 15 });
  });

  it('applies independent and negative scale factors to derived dimensions', () => {
    const dimensions = new Dimensions(10, 20);

    dimensions.setScale(2, 0.5);
    expect(dimensions.scaledWidth()).toBe(20);
    expect(dimensions.scaledHeight()).toBe(10);
    expect(dimensions.area()).toBe(200);

    dimensions.setScale(-3, -0.5);
    expect(dimensions.scaledWidth()).toBe(30);
    expect(dimensions.scaledHeight()).toBe(10);
    expect(dimensions.area()).toBe(300);
  });

  it.each([
    [0, 0, 10, 30, 30, 50],
    [0.5, 0.5, 0, 20, 20, 40],
    [1, 1, -10, 10, 10, 30]
  ])(
    'calculates bounds for pivot (%s, %s)',
    (pivotX, pivotY, left, top, right, bottom) => {
      const dimensions = new Dimensions(20, 20, 10, 30, pivotX, pivotY);

      expect(dimensions.left()).toBe(left);
      expect(dimensions.top()).toBe(top);
      expect(dimensions.right()).toBe(right);
      expect(dimensions.bottom()).toBe(bottom);
    }
  );

  it('keeps an established ratio when width, height, or size changes while locked', () => {
    const dimensions = new Dimensions(20, 10);
    dimensions.setLockAspectRatio(true);

    dimensions.setWidth(40);
    expect(dimensions.size()).toEqual({ width: 40, height: 20 });

    dimensions.setHeight(15);
    expect(dimensions.size()).toEqual({ width: 30, height: 15 });

    dimensions.setSize(60, 1);
    expect(dimensions.size()).toEqual({ width: 60, height: 30 });
  });

  it('updates its ratio while unlocked and uses the current dimensions when locked', () => {
    const dimensions = new Dimensions(20, 10);

    dimensions.setSize(30, 20);
    expect(dimensions.getAspectRatio()).toBe(1.5);

    dimensions.setLockAspectRatio(true);
    dimensions.setWidth(15);
    expect(dimensions.size()).toEqual({ width: 15, height: 10 });

    dimensions.setLockAspectRatio(false);
    dimensions.setHeight(5);
    expect(dimensions.getAspectRatio()).toBe(3);
  });

  it('handles zero dimensions without producing invalid aspect ratios', () => {
    const dimensions = new Dimensions(0, 10);

    expect(dimensions.getAspectRatio()).toBe(0);

    dimensions.setLockAspectRatio(true);
    dimensions.setWidth(20);
    expect(dimensions.size()).toEqual({ width: 20, height: 10 });
    expect(dimensions.getAspectRatio()).toBe(2);

    dimensions.setWidth(0);
    expect(dimensions.size()).toEqual({ width: 0, height: 0 });
    expect(dimensions.getAspectRatio()).toBe(2);

    dimensions.setLockAspectRatio(false);
    expect(dimensions.getAspectRatio()).toBe(0);
  });

  it('reactively updates every computed value when its sources change', () => {
    const dimensions = new Dimensions(10, 20, 10, 20);

    dimensions.setScale(2, 3);
    dimensions.setPivot(0.5, 1);
    dimensions.setPosition(30, 60);
    dimensions.setSize(5, 4);

    expect(dimensions.scaledWidth()).toBe(10);
    expect(dimensions.scaledHeight()).toBe(12);
    expect(dimensions.area()).toBe(120);
    expect(dimensions.left()).toBe(25);
    expect(dimensions.right()).toBe(35);
    expect(dimensions.top()).toBe(48);
    expect(dimensions.bottom()).toBe(60);
    expect(dimensions.position()).toEqual({ x: 30, y: 60 });
    expect(dimensions.size()).toEqual({ width: 5, height: 4 });
  });

  it('rejects invalid numeric values and negative dimensions', () => {
    expect(() => new Dimensions(Number.NaN, 1)).toThrow(RangeError);
    expect(() => new Dimensions(1, Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => new Dimensions(-1, 1)).toThrow(RangeError);

    const dimensions = new Dimensions(1, 1);
    expect(() => dimensions.setPosition(Number.NEGATIVE_INFINITY, 0)).toThrow(RangeError);
    expect(() => dimensions.setSize(1, -1)).toThrow(RangeError);
    expect(() => dimensions.setScale(Number.NaN)).toThrow(RangeError);
    expect(() => dimensions.setPivot(0, Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});
