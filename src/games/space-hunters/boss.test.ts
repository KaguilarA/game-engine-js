import { describe, expect, it, vi } from 'vitest';

import { Boss } from './boss';

const { drawImage } = vi.hoisted(() => ({
  drawImage: vi.fn()
}));

vi.mock('../../engine/assets/loader', () => ({
  default: {
    getImage: vi.fn(() => ({})),
    getAtlas: vi.fn(() => ({
      getAnimation: (name: string) => {
        const isExplosion = name.startsWith('explosion-');
        const row = name.endsWith('aegis-core') ? 400
          : name.endsWith('void-empress') ? 800
            : 0;
        const frameCount = isExplosion ? 5 : 6;

        return {
          name,
          frameRate: isExplosion ? 14 : 7,
          loop: !isExplosion,
          frames: Array.from({ length: frameCount }, (_, index) => ({
            name,
            index,
            x: isExplosion ? 1200 + index * 200 : index * 200,
            y: row,
            width: 200,
            height: 200
          }))
        };
      }
    }))
  }
}));

vi.mock('../../engine/core/context', () => ({
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

describe('Boss', () => {
  it('crops boss sheets using complete 200 by 200 cells', () => {
    const boss = new Boss(1, 200, 200);

    boss.draw();

    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      200,
      200,
      -95,
      -95,
      190,
      190
    );
  });

  it('uses the complete explosion strip from the boss sheet', () => {
    const boss = new Boss(1, 200, 200);

    for (let hit = 0; hit < 12; hit++) {
      expect(boss.hit(200, 200, 20, 20)).toBe(true);
    }
    boss.draw();

    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(),
      1200,
      0,
      200,
      200,
      -95,
      -95,
      190,
      190
    );
  });

  it('uses a single shot for the first boss', () => {
    const boss = new Boss(1, 200, 200);

    expect(boss.getShotOrigins()).toHaveLength(1);
    expect(boss.isVulnerable).toBe(true);
    expect(boss.name).toBe('HIVE MOTHER');
  });

  it('opens and closes the second boss shield on a timer', () => {
    const boss = new Boss(2, 200, 200);

    expect(boss.isShielded).toBe(false);
    boss.update(2, 1000);
    expect(boss.isShielded).toBe(true);
    expect(boss.getShotOrigins()).toHaveLength(3);
    expect(boss.name).toBe('AEGIS CORE');
  });

  it('has a vulnerability window and two attacks for the third boss', () => {
    const boss = new Boss(3, 200, 200);

    expect(boss.isVulnerable).toBe(false);
    boss.update(1.5, 1000);
    expect(boss.isVulnerable).toBe(true);
    expect(boss.getShotOrigins()).toHaveLength(2);
    expect(boss.name).toBe('VOID EMPRESS');
  });
});
