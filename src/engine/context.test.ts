import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('GameContext', () => {
  let viewportWidth = 1920;
  let viewportHeight = 1080;
  let resizeListener: (() => void) | undefined;
  let pointerDownListener: ((event: PointerEvent) => void) | undefined;
  const drawingContext = {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 10 })),
    restore: vi.fn(),
    save: vi.fn(),
    setTransform: vi.fn(),
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
    requestFullscreen: vi.fn(() => Promise.resolve()),
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
      fullscreenElement: null,
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

  it('uses the viewport as the reactive game area by default', async () => {
    const { default: gameContext } = await import('./context');

    expect(gameContext.isPortrait).toBe(false);
    expect(gameContext.gameDimensionsModel.size()).toEqual({
      height: 1080,
      width: 1920
    });
    expect(gameContext.viewportWidth()).toBe(1920);
    expect(gameContext.viewportHeight()).toBe(1080);
    expect(gameContext.viewportUnit()).toBe(1080);
    expect(drawingContext.setTransform).toHaveBeenLastCalledWith(
      1,
      0,
      0,
      1,
      0,
      0
    );
  });

  it('updates the game area to match the viewport on resize', async () => {
    const { default: gameContext } = await import('./context');
    const { default: gameEvents } = await import('./events');
    gameEvents.initEvents();
    viewportWidth = 390;
    viewportHeight = 844;

    resizeListener?.();

    expect(gameContext.isPortrait).toBe(true);
    expect(gameContext.gameDimensionsModel.size()).toEqual({
      height: 844,
      width: 390
    });
    expect(gameContext.viewportWidth()).toBe(390);
    expect(gameContext.viewportHeight()).toBe(844);
    expect(gameContext.viewportUnit()).toBe(390);
    expect(drawingContext.setTransform).toHaveBeenLastCalledWith(
      1,
      0,
      0,
      1,
      0,
      0
    );
  });

  it('maps canvas pointer input to logical game coordinates', async () => {
    const { default: gameEvents } = await import('./events');
    const listener = vi.fn();
    gameEvents.initEvents();
    gameEvents.addPointerDownListener(listener);

    pointerDownListener?.({
      clientX: 960,
      clientY: 540,
      pointerId: 1
    } as PointerEvent);

    expect(listener).toHaveBeenCalledWith({ id: 1, x: 960, y: 540 });
  });

  it('draws circles in logical game coordinates', async () => {
    const { default: gameContext } = await import('./context');

    gameContext.drawCircle(100, 200, 30, '#ffffff');

    expect(drawingContext.beginPath).toHaveBeenCalledOnce();
    expect(drawingContext.arc).toHaveBeenCalledWith(
      100,
      200,
      30,
      0,
      Math.PI * 2
    );
    expect(drawingContext.fill).toHaveBeenCalledOnce();
  });

  it('requests fullscreen mode for the canvas', async () => {
    const { default: gameContext } = await import('./context');

    await gameContext.toggleFullscreen();

    expect(canvas.requestFullscreen).toHaveBeenCalledOnce();
  });

  it('draws text respecting maxWidth and scales font down if needed', async () => {
    const { default: gameContext } = await import('./context');

    // "VERY LONG TEXT STRING" is 21 characters -> measureText mock returns 210 width
    // with maxWidth = 100, scale = 100 / 210 ~= 0.476 -> font size 24 scaled down to 11
    gameContext.drawText('VERY LONG TEXT STRING', 100, 100, 24, '#ffffff', 'left', 100);

    expect(drawingContext.fillText).toHaveBeenCalledWith(
      'VERY LONG TEXT STRING',
      100,
      100,
      100
    );
    expect(drawingContext.font).toBe('11px sans-serif');
  });
});
