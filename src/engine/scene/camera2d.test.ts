import { describe, expect, it, vi } from 'vitest';

const { drawingContext } = vi.hoisted(() => ({
  drawingContext: {
    restore: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn()
  }
}));

vi.mock('../core/context', () => ({
  default: {
    context: drawingContext,
    gameDimensionsModel: {
      getHeight: (): number => 600,
      getWidth: (): number => 800
    }
  }
}));

import { Camera2D } from './camera2d';

describe('Camera2D', () => {
  it('converts between world and screen coordinates with zoom', () => {
    const camera = new Camera2D({ x: 100, y: 80, zoom: 2, viewportWidth: 800, viewportHeight: 600 });
    const screen = camera.worldToScreen(110, 90);

    expect(screen).toEqual({ x: 420, y: 320 });
    expect(camera.screenToWorld(screen.x, screen.y)).toEqual({ x: 110, y: 90 });
  });

  it('follows a target and applies a balanced canvas transform', () => {
    const camera = new Camera2D({ x: 0, y: 0, zoom: 1.5, viewportWidth: 800, viewportHeight: 600 });
    const target = { getX: (): number => 100, getY: (): number => 50 } as never;
    camera.follow(target);
    camera.update(1 / 60);
    const draw = vi.fn();
    camera.withTransform(draw);

    expect(camera.x()).toBe(100);
    expect(camera.y()).toBe(50);
    expect(drawingContext.save).toHaveBeenCalled();
    expect(draw).toHaveBeenCalledOnce();
    expect(drawingContext.restore).toHaveBeenCalled();
  });
});
