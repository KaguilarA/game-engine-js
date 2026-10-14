import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type ImageEventName = 'error' | 'load';
type ImageListener = () => void;
type AudioEventName = 'error' | 'canplaythrough';

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

class TestAudio {
  public currentTime = 0;
  public preload = '';
  private readonly listeners = new Map<AudioEventName, () => void>();

  public constructor(_: string) {}

  public addEventListener(
    type: AudioEventName,
    listener: () => void
  ): void {
    this.listeners.set(type, listener);
  }

  public load(): void {
    queueMicrotask(() => {
      this.listeners.get('canplaythrough')?.();
    });
  }

  public cloneNode(): TestAudio {
    return this;
  }

  public play(): Promise<void> {
    return Promise.resolve();
  }
}

describe('GameLoader', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('Image', TestImage);
    vi.stubGlobal('Audio', TestAudio);
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

  it('loads every MP3 asset and exposes each one by filename', async () => {
    const { default: gameLoader } = await import('./loader');

    await gameLoader.loadAll();

    for (const name of [
      'boom1',
      'boom2',
      'boom3',
      'boom4',
      'lose',
      'newgame',
      'scream',
      'slide',
      'win'
    ]) {
      expect(gameLoader.hasAudio(name)).toBe(true);
      expect(gameLoader.getAudio(name)).toBeInstanceOf(TestAudio);
    }
  });

  it('throws when an image has not been loaded', async () => {
    const { default: gameLoader } = await import('./loader');

    expect(() => gameLoader.getImage('missing')).toThrow(
      'Image asset "missing" has not been loaded.'
    );
  });

  it('throws when an audio has not been loaded', async () => {
    const { default: gameLoader } = await import('./loader');

    expect(() => gameLoader.getAudio('missing')).toThrow(
      'Audio asset "missing" has not been loaded.'
    );
  });
});
