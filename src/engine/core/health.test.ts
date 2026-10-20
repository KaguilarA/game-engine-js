import { describe, expect, it } from 'vitest';

import { Health } from './health';

describe('Health', () => {
  it('tracks damage exactly until health is depleted', () => {
    const health = new Health(3);

    expect(health.receiveDamage()).toEqual({
      wasDamaged: true,
      isDepleted: false
    });
    expect(health.receiveDamage()).toEqual({
      wasDamaged: true,
      isDepleted: false
    });
    expect(health.receiveDamage()).toEqual({
      wasDamaged: true,
      isDepleted: true
    });
    expect(health.current).toBe(0);
    expect(health.receiveDamage()).toEqual({
      wasDamaged: false,
      isDepleted: true
    });
  });

  it('restores health and rejects invalid values', () => {
    const health = new Health(2);

    health.receiveDamage();
    health.restore();

    expect(health.current).toBe(2);
    expect(() => new Health(0)).toThrow(RangeError);
    expect(() => health.receiveDamage(0)).toThrow(RangeError);
    expect(() => health.receiveDamage(Infinity)).toThrow(RangeError);
  });
});
