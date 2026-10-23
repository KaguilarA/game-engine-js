import { describe, expect, it } from 'vitest';
import { Tilemap } from './tilemap';

describe('Tilemap', () => {
  it('initializes grid cells and updates cell values', () => {
    // Mock image canvas source
    const mockImage = { width: 128, height: 128 } as unknown as CanvasImageSource;

    const tilemap = new Tilemap({
      image: mockImage,
      columns: 4,
      tileWidth: 16,
      tileHeight: 16,
      mapWidth: 10,
      mapHeight: 8
    });

    expect(tilemap.mapWidth).toBe(10);
    expect(tilemap.mapHeight).toBe(8);
    expect(tilemap.getTile(0, 0)).toBe(0);

    tilemap.setTile(2, 3, 5);
    expect(tilemap.getTile(2, 3)).toBe(5);

    expect(() => tilemap.getTile(-1, 0)).toThrow(RangeError);
    expect(() => tilemap.getTile(10, 8)).toThrow(RangeError);
  });
});
