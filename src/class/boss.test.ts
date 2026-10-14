import { describe, expect, it, vi } from 'vitest';

import { Boss } from './boss';

const { drawImage } = vi.hoisted(() => ({
  drawImage: vi.fn()
}));

vi.mock('../engine/loader', () => ({
  default: {
    getImage: vi.fn(() => ({}))
  }
}));

vi.mock('../engine/context', () => ({
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
  it('crops boss sheets using complete 220 by 200 cells', () => {
    const boss = new Boss(1, 200, 200);

    boss.draw();

    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      220,
      200,
      -95,
      -85,
      190,
      170
    );
  });

  it('uses exactly the four explosion frames in the sheet', () => {
    const boss = new Boss(1, 200, 200);

    for (let hit = 0; hit < 12; hit++) {
      expect(boss.hit(200, 200, 20, 20)).toBe(true);
    }
    boss.draw();

    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(),
      1320,
      0,
      220,
      200,
      -95,
      -85,
      190,
      170
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
