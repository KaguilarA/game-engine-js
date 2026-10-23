import { describe, expect, it } from 'vitest';
import { CircleBody } from './circle-body';

describe('CircleBody', () => {
  it('manages position, velocity, and radius', () => {
    const circle = new CircleBody(10, 20, 15);

    expect(circle.x).toBe(10);
    expect(circle.y).toBe(20);
    expect(circle.radius).toBe(15);

    circle.setVelocity(100, -50);
    expect(circle.velocityX).toBe(100);
    expect(circle.velocityY).toBe(-50);

    circle.addVelocity(-50, 50);
    expect(circle.velocityX).toBe(50);
    expect(circle.velocityY).toBe(0);

    circle.update(1.0);
    expect(circle.x).toBe(60);
    expect(circle.y).toBe(20);
  });

  it('rejects invalid radius values', () => {
    expect(() => new CircleBody(0, 0, 0)).toThrow(RangeError);
    expect(() => new CircleBody(0, 0, -5)).toThrow(RangeError);
    expect(() => new CircleBody(0, 0, NaN)).toThrow(RangeError);
  });
});
