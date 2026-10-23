import { describe, expect, it } from 'vitest';
import Collision2D from './collision2d';
import { CircleBody } from '../entities/circle-body';

describe('Collision2D', () => {
  it('detects circle-circle overlaps', () => {
    expect(Collision2D.overlapsCircles(0, 0, 10, 15, 0, 10)).toBe(true);
    expect(Collision2D.overlapsCircles(0, 0, 5, 20, 0, 5)).toBe(false);
  });

  it('resolves vertical bounds for circle bodies', () => {
    const body = new CircleBody(10, 5, 10);
    body.setVelocity(0, -50);

    const collided = Collision2D.resolveCircleAgainstVerticalBounds(body, 10, 100, 0.5);
    expect(collided).toBe(true);
    expect(body.y).toBe(20);
    expect(body.velocityY).toBe(25);
  });

  it('computes AABB overlap normal and penetration', () => {
    const rectA = { x: 0, y: 0, width: 20, height: 20 };
    const rectB = { x: 15, y: 5, width: 20, height: 20 };

    const overlap = Collision2D.getAABBOverlap(rectA, rectB);
    expect(overlap).not.toBeNull();
    expect(overlap?.normalX).toBe(-1);
    expect(overlap?.penetration).toBe(5);
  });

  it('resolves one-way platform landings', () => {
    const platform = { x: 50, y: 100, width: 100, height: 20 };

    const landing = Collision2D.resolveOneWayPlatform(
      70, 95, 20, 10,
      85, 50,
      platform
    );
    expect(landing.landed).toBe(true);
    expect(landing.resolvedY).toBe(90);

    const jumpingThrough = Collision2D.resolveOneWayPlatform(
      70, 95, 20, 10,
      110, -50,
      platform
    );
    expect(jumpingThrough.landed).toBe(false);
  });
});
