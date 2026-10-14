import { afterEach, describe, expect, it, vi } from 'vitest';

import Sprite from './sprite';

const { drawingContext } = vi.hoisted(() => ({
  drawingContext: {
    drawImage: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn()
  } as unknown as CanvasRenderingContext2D
}));

vi.mock('../engine/context', () => ({
  default: {
    context: drawingContext
  }
}));

describe('Sprite', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('draws the image at its top-left pivot position', () => {
    const sprite = new Sprite(
      {} as CanvasImageSource,
      20,
      10,
      5,
      8
    );

    sprite.draw();

    expect(drawingContext.save).toHaveBeenCalledOnce();
    expect(drawingContext.translate).toHaveBeenCalledWith(5, 8);
    expect(drawingContext.scale).toHaveBeenCalledWith(1, 1);
    expect(drawingContext.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      20,
      10
    );
    expect(drawingContext.restore).toHaveBeenCalledOnce();
  });

  it('uses the pivot and negative scale to mirror the image', () => {
    const sprite = new Sprite(
      {} as CanvasImageSource,
      20,
      10,
      50,
      30,
      0.5,
      0.5
    );

    sprite.dimensions.setScale(-2, 3);
    sprite.draw();

    expect(drawingContext.translate).toHaveBeenCalledWith(50, 30);
    expect(drawingContext.scale).toHaveBeenCalledWith(-2, 3);
    expect(drawingContext.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      -10,
      -5,
      20,
      10
    );
  });

  it('restores the drawing context when drawing fails', () => {
    vi.mocked(drawingContext.drawImage).mockImplementation(() => {
      throw new Error('Image is not drawable.');
    });
    const sprite = new Sprite(
      {} as CanvasImageSource,
      20,
      10
    );

    expect(() => sprite.draw()).toThrow('Image is not drawable.');
    expect(drawingContext.restore).toHaveBeenCalledOnce();
  });
});
