import { describe, expect, it } from 'vitest';
import { PhysicsBody } from './physics';

describe('PhysicsBody', () => {
  it('initializes with default position and zero motion', () => {
    const body = new PhysicsBody(10, 20);

    expect(body.x()).toBe(10);
    expect(body.y()).toBe(20);
    expect(body.velocityX()).toBe(0);
    expect(body.velocityY()).toBe(0);
    expect(body.accelerationX()).toBe(0);
    expect(body.accelerationY()).toBe(0);
  });

  it('integrates velocity and acceleration over delta time', () => {
    const body = new PhysicsBody(0, 0);
    body.setVelocity(10, 20);
    body.accelerationX.set(2);
    body.accelerationY.set(4);

    // After 1 second:
    // x = 0 + 10*1 + 0.5*2*(1^2) = 11
    // y = 0 + 20*1 + 0.5*4*(1^2) = 22
    // vx = 10 + 2*1 = 12
    // vy = 20 + 4*1 = 24
    body.update(1.0);

    expect(body.x()).toBe(11);
    expect(body.y()).toBe(22);
    expect(body.velocityX()).toBe(12);
    expect(body.velocityY()).toBe(24);
  });

  it('translates position and stops motion', () => {
    const body = new PhysicsBody(5, 5);
    body.translate(10, -5);

    expect(body.x()).toBe(15);
    expect(body.y()).toBe(0);

    body.setVelocity(50, -50);
    body.accelerationX.set(100);
    body.stop();

    expect(body.velocityX()).toBe(0);
    expect(body.velocityY()).toBe(0);
    expect(body.accelerationX()).toBe(0);
    expect(body.accelerationY()).toBe(0);
  });

  it('rejects invalid non-finite numbers', () => {
    const body = new PhysicsBody();

    expect(() => body.setPosition(NaN, 0)).toThrow(RangeError);
    expect(() => body.setVelocity(0, Infinity)).toThrow(RangeError);
    expect(() => body.update(-1)).toThrow(RangeError);
  });
});
