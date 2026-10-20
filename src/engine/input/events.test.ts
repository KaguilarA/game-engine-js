import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type KeyListener = (event: KeyboardEvent) => void;

describe('GameEvents', () => {
  const listeners = new Map<string, KeyListener>();
  const addEventListener = vi.fn(
    (type: string, listener: KeyListener): void => {
      listeners.set(type, listener);
    }
  );
  const removeEventListener = vi.fn(
    (type: string, listener: KeyListener): void => {
      if (listeners.get(type) === listener) {
        listeners.delete(type);
      }
    }
  );
  const canvas = {
    addEventListener: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({
      bottom: 600,
      height: 600,
      left: 0,
      right: 800,
      top: 0,
      width: 800
    })),
    getContext: vi.fn(() => ({ setTransform: vi.fn() })),
    height: 0,
    parentElement: null,
    removeEventListener: vi.fn(),
    style: {},
    width: 0
  } as unknown as HTMLCanvasElement;

  beforeEach(() => {
    listeners.clear();
    addEventListener.mockClear();
    removeEventListener.mockClear();
    vi.resetModules();
    vi.stubGlobal('window', {
      addEventListener,
      removeEventListener
    });
    vi.stubGlobal('document', {
      documentElement: { clientHeight: 600, clientWidth: 800 },
      fullscreenElement: null,
      getElementById: vi.fn(() => canvas)
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('registers keyboard listeners once and tracks pressed keys', async () => {
    const { default: gameEvents } = await import('./events');

    expect(addEventListener).toHaveBeenCalledTimes(3);

    listeners.get('keydown')?.({ key: 'ArrowLeft' } as KeyboardEvent);
    expect(gameEvents.isKeyPressed('ArrowLeft')).toBe(true);

    gameEvents.initEvents();
    expect(addEventListener).toHaveBeenCalledTimes(3);

    listeners.get('keyup')?.({ key: 'ArrowLeft' } as KeyboardEvent);
    expect(gameEvents.isKeyPressed('ArrowLeft')).toBe(false);
  });

  it('removes listeners and clears state when destroyed', async () => {
    const { default: gameEvents } = await import('./events');

    listeners.get('keydown')?.({ key: 'ArrowRight' } as KeyboardEvent);
    gameEvents.destroy();

    expect(gameEvents.isKeyPressed('ArrowRight')).toBe(false);
    expect(removeEventListener).toHaveBeenCalledTimes(3);

    gameEvents.initEvents();
    expect(addEventListener).toHaveBeenCalledTimes(6);
  });

  it('tracks virtual keys independently for each active touch pointer', async () => {
    const { default: gameEvents } = await import('./events');

    gameEvents.setPointerKey(1, 'ArrowLeft');
    gameEvents.setPointerKey(2, ' ');
    expect(gameEvents.isKeyPressed('ArrowLeft')).toBe(true);
    expect(gameEvents.isKeyPressed(' ')).toBe(true);

    gameEvents.setPointerKey(1, undefined);
    expect(gameEvents.isKeyPressed('ArrowLeft')).toBe(false);
    expect(gameEvents.isKeyPressed(' ')).toBe(true);

    gameEvents.setPointerKey(2, undefined);
    expect(gameEvents.isKeyPressed(' ')).toBe(false);
  });
});
