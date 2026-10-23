import { describe, expect, it, vi } from 'vitest';

const { drawingContext } = vi.hoisted(() => ({
  drawingContext: {
    drawImage: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn()
  }
}));

vi.mock('../core/context', () => ({
  default: {
    context: drawingContext,
    gameDimensionsModel: { getHeight: (): number => 300, getWidth: (): number => 400 }
  }
}));

import { Tilemap } from './tilemap';

describe('Tilemap', () => {
  it('stores zero-based grid coordinates and draws one-based tileset indices', () => {
    const tileset = { width: 16, height: 8 } as HTMLCanvasElement;
    const tilemap = new Tilemap({
      image: tileset,
      columns: 2,
      tileWidth: 8,
      tileHeight: 8,
      mapWidth: 3,
      mapHeight: 1,
      x: 10,
      y: 20
    });
    tilemap.setTile(0, 0, 1);
    tilemap.setTile(1, 0, 2);

    expect(tilemap.getTile(0, 0)).toBe(1);
    expect(tilemap.getTile(2, 0)).toBe(0);
    tilemap.draw();

    expect(drawingContext.drawImage).toHaveBeenCalledTimes(2);
    expect(drawingContext.drawImage).toHaveBeenNthCalledWith(
      1, tileset, 0, 0, 8, 8, 0, 0, 8, 8
    );
    expect(drawingContext.drawImage).toHaveBeenNthCalledWith(
      2, tileset, 8, 0, 8, 8, 8, 0, 8, 8
    );
  });

  it('rejects invalid coordinates and data that does not match map size', () => {
    const tilemap = new Tilemap({
      image: { width: 8, height: 8 } as HTMLCanvasElement,
      columns: 1,
      tileWidth: 8,
      tileHeight: 8,
      mapWidth: 1,
      mapHeight: 1
    });
    expect(() => tilemap.getTile(1, 0)).toThrow(RangeError);
    expect(() => tilemap.setTiles([1, 2])).toThrow(RangeError);
    expect(() => tilemap.setTile(0, 0, -1)).toThrow(RangeError);
  });
});
