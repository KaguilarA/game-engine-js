import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type ImageEventName = 'error' | 'load';
type ImageListener = () => void;

class TestImage {
  private readonly listeners = new Map<ImageEventName, ImageListener>();

  public addEventListener(
    type: ImageEventName,
    listener: ImageListener
  ): void {
    this.listeners.set(type, listener);
  }

  public set src(_: string) {
    queueMicrotask(() => {
      this.listeners.get('load')?.();
    });
  }
}

describe('GameLoader', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('Image', TestImage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads every image asset and exposes each one by filename', async () => {
    const { default: gameLoader } = await import('./loader');

    await gameLoader.loadAll();

    for (const name of [
      'background1080x1920',
      'background1920x1080',
      'beetlemorph',
      'boss',
      'boss8',
      'eaglemorph',
      'enemyProjectile',
      'lobstermorph',
      'phantommorph',
      'player',
      'player_jets',
      'rhinomorph',
      'squidmorph'
    ]) {
      expect(gameLoader.hasImage(name)).toBe(true);
      expect(gameLoader.getImage(name)).toBeInstanceOf(TestImage);
    }
  });

  it('throws when an image has not been loaded', async () => {
    const { default: gameLoader } = await import('./loader');

    expect(() => gameLoader.getImage('missing')).toThrow(
      'Image asset "missing" has not been loaded.'
    );
  });
});
