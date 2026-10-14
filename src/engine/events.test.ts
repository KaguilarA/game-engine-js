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

  beforeEach(() => {
    listeners.clear();
    addEventListener.mockClear();
    removeEventListener.mockClear();
    vi.resetModules();
    vi.stubGlobal('window', {
      addEventListener,
      removeEventListener
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('registers keyboard listeners once and tracks pressed keys', async () => {
    const { default: gameEvents } = await import('./events');

    expect(addEventListener).toHaveBeenCalledTimes(2);

    listeners.get('keydown')?.({ key: 'ArrowLeft' } as KeyboardEvent);
    expect(gameEvents.isKeyPressed('ArrowLeft')).toBe(true);

    gameEvents.initEvents();
    expect(addEventListener).toHaveBeenCalledTimes(2);

    listeners.get('keyup')?.({ key: 'ArrowLeft' } as KeyboardEvent);
    expect(gameEvents.isKeyPressed('ArrowLeft')).toBe(false);
  });

  it('removes listeners and clears state when destroyed', async () => {
    const { default: gameEvents } = await import('./events');

    listeners.get('keydown')?.({ key: 'ArrowRight' } as KeyboardEvent);
    gameEvents.destroy();

    expect(gameEvents.isKeyPressed('ArrowRight')).toBe(false);
    expect(removeEventListener).toHaveBeenCalledTimes(2);

    gameEvents.initEvents();
    expect(addEventListener).toHaveBeenCalledTimes(4);
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
