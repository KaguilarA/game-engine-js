import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('GameContext', () => {
  let viewportWidth = 1920;
  let viewportHeight = 1080;
  let resizeListener: (() => void) | undefined;
  let pointerDownListener: ((event: PointerEvent) => void) | undefined;
  const drawingContext = {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    setTransform: vi.fn()
  } as unknown as CanvasRenderingContext2D;
  const canvas = {
    addEventListener: vi.fn(
      (type: string, listener: (event: PointerEvent) => void): void => {
        if (type === 'pointerdown') {
          pointerDownListener = listener;
        }
      }
    ),
    getContext: vi.fn(() => drawingContext),
    getBoundingClientRect: vi.fn(() => ({
      bottom: viewportHeight,
      height: viewportHeight,
      left: 0,
      right: viewportWidth,
      top: 0,
      width: viewportWidth
    })),
    height: 0,
    removeEventListener: vi.fn(),
    style: {},
    width: 0
  } as unknown as HTMLCanvasElement;

  beforeEach(() => {
    viewportWidth = 1920;
    viewportHeight = 1080;
    resizeListener = undefined;
    pointerDownListener = undefined;
    vi.clearAllMocks();
    vi.resetModules();

    vi.stubGlobal('document', {
      documentElement: {
        get clientHeight(): number {
          return viewportHeight;
        },
        get clientWidth(): number {
          return viewportWidth;
        }
      },
      getElementById: vi.fn(() => canvas)
    });
    vi.stubGlobal('window', {
      addEventListener: vi.fn(
        (type: string, listener: () => void): void => {
          if (type === 'resize') {
            resizeListener = listener;
          }
        }
      ),
      devicePixelRatio: 1,
      removeEventListener: vi.fn()
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the landscape game area and preserves the full logical area by default', async () => {
    const { default: gameContext } = await import('./context');

    expect(gameContext.isPortrait).toBe(false);
    expect(gameContext.gameDimensionsModel.size()).toEqual({
      height: 1080,
      width: 1920
    });
    expect(drawingContext.setTransform).toHaveBeenLastCalledWith(
      1,
      0,
      0,
      1,
      0,
      0
    );
  });

  it('switches to the portrait game area and preserves proportions on resize', async () => {
    const { default: gameContext } = await import('./context');
    viewportWidth = 390;
    viewportHeight = 844;

    resizeListener?.();

    expect(gameContext.isPortrait).toBe(true);
    expect(gameContext.gameDimensionsModel.size()).toEqual({
      height: 1920,
      width: 1080
    });
    expect(drawingContext.setTransform).toHaveBeenLastCalledWith(
      390 / 1080,
      0,
      0,
      390 / 1080,
      0,
      (844 - 1920 * (390 / 1080)) * 0.5
    );
  });

  it('maps canvas pointer input to logical game coordinates', async () => {
    const { default: gameContext } = await import('./context');
    const listener = vi.fn();
    gameContext.addPointerDownListener(listener);

    pointerDownListener?.({
      clientX: 960,
      clientY: 540
    } as PointerEvent);

    expect(listener).toHaveBeenCalledWith(960, 540);
  });
});
