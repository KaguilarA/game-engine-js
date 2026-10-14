import { describe, expect, it, vi } from 'vitest';

import { Player } from './player';

vi.mock('../engine/context', () => ({
  default: {
    context: {},
    gameDimensionsModel: {
      getHeight: () => 1080,
      getWidth: () => 1920
    }
  }
}));

vi.mock('../engine/events', () => ({
  default: {
    isKeyPressed: () => false
  }
}));

vi.mock('../engine/loader', () => ({
  default: {
    getImage: vi.fn(() => ({}))
  }
}));

describe('Player', () => {
  it('loses one life after exactly two projectile impacts', () => {
    const player = new Player();

    expect(player.takeDamage()).toBe(false);
    expect(player.takeDamage()).toBe(true);
    expect(player.takeDamage()).toBe(false);
    expect(player.takeDamage()).toBe(true);
  });

  it('positions the player above a reserved bottom interface area', () => {
    const player = new Player();

    player.setBottomMargin(200);
    player.update(0);

    expect(player.y).toBe(830);
  });
});
