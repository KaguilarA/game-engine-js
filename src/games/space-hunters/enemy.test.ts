import { describe, expect, it, vi } from 'vitest';

import { Enemy } from './enemy';

const { drawImage } = vi.hoisted(() => ({
  drawImage: vi.fn()
}));

vi.mock('../../engine/loader', () => ({
  default: {
    getImage: vi.fn(() => ({})),
    getAtlas: vi.fn(() => ({
      getAnimation: (name: string) => {
        const isExplosion = name.startsWith('explosion-row-');
        const row = name.endsWith('row-1') ? 80 : 0;
        const frameCount = isExplosion ? 5 : 4;

        return {
          name,
          frameRate: isExplosion ? 14 : 7,
          loop: !isExplosion,
          frames: Array.from({ length: frameCount }, (_, index) => ({
            name,
            index,
            x: isExplosion ? 320 + index * 80 : index * 80,
            y: row,
            width: 80,
            height: 80
          }))
        };
      }
    }))
  }
}));

vi.mock('../../engine/context', () => ({
  default: {
    context: {
      drawImage,
      restore: vi.fn(),
      save: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn()
    }
  }
}));

describe('Enemy', () => {
  it('crops the enemy sheet using complete 80 by 80 cells', () => {
    const enemy = new Enemy(10, 10, 1, 30);

    enemy.draw();

    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      80,
      80,
      80,
      0,
      0,
      72,
      64
    );
  });

  it('requires exactly the configured number of consecutive hits', () => {
    const enemy = new Enemy(10, 10, 0, 30, 3);

    expect(enemy.hit(10, 10, 20, 20)).toBe(true);
    expect(enemy.isDefeated).toBe(false);
    expect(enemy.hit(10, 10, 20, 20)).toBe(true);
    expect(enemy.isDefeated).toBe(false);
    expect(enemy.hit(10, 10, 20, 20)).toBe(true);
    expect(enemy.isDefeated).toBe(true);
    expect(enemy.hit(10, 10, 20, 20)).toBe(false);
    expect(enemy.isAlive).toBe(true);

    enemy.update(1);
    expect(enemy.isAlive).toBe(false);
  });

  it('uses one hit by default', () => {
    const enemy = new Enemy(10, 10, 0, 10);

    expect(enemy.hit(10, 10, 20, 20)).toBe(true);
    expect(enemy.hit(10, 10, 20, 20)).toBe(false);
    enemy.update(1);

    expect(enemy.isDefeated).toBe(true);
    expect(enemy.isAlive).toBe(false);
  });
});
