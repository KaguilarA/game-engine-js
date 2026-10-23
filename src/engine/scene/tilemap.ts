import GameContext from '../core/context';
import Dimensions from '../core/dimensions';
import { signalValue } from 'reactive-values';
import type { SignalValue } from 'reactive-values';

export interface TilemapOptions {
  image: CanvasImageSource;
  columns: number;
  tileWidth: number;
  tileHeight: number;
  mapWidth: number;
  mapHeight: number;
  x?: number;
  y?: number;
  spacing?: number;
  margin?: number;
  drawTileWidth?: number;
  drawTileHeight?: number;
}

/** Grid-based tilemap using zero for empty cells and one-based tileset indices. */
export class Tilemap {
  public readonly dimensions: Dimensions;
  public readonly mapWidth: number;
  public readonly mapHeight: number;
  private readonly image: CanvasImageSource;
  private readonly columns: number;
  private readonly tileWidth: number;
  private readonly tileHeight: number;
  private readonly spacing: number;
  private readonly margin: number;
  private readonly drawTileWidth: number;
  private readonly drawTileHeight: number;
  private readonly tilesetWidth: number;
  private readonly tilesetHeight: number;
  private readonly cells: SignalValue<readonly number[]>;

  public constructor(options: TilemapOptions) {
    this.assertPositiveInteger(options.columns, 'columns');
    this.assertPositiveInteger(options.tileWidth, 'tileWidth');
    this.assertPositiveInteger(options.tileHeight, 'tileHeight');
    this.assertPositiveInteger(options.mapWidth, 'mapWidth');
    this.assertPositiveInteger(options.mapHeight, 'mapHeight');
    this.image = options.image;
    const source = options.image as CanvasImageSource & {
      naturalWidth?: number;
      naturalHeight?: number;
      videoWidth?: number;
      videoHeight?: number;
      width?: number;
      height?: number;
    };
    this.tilesetWidth = source.naturalWidth ?? source.videoWidth ?? source.width ?? 0;
    this.tilesetHeight = source.naturalHeight ?? source.videoHeight ?? source.height ?? 0;
    this.columns = options.columns;
    this.tileWidth = options.tileWidth;
    this.tileHeight = options.tileHeight;
    this.spacing = options.spacing ?? 0;
    this.margin = options.margin ?? 0;
    this.drawTileWidth = options.drawTileWidth ?? options.tileWidth;
    this.drawTileHeight = options.drawTileHeight ?? options.tileHeight;
    if (this.spacing < 0 || this.margin < 0) throw new RangeError('Tile spacing and margin cannot be negative.');
    this.mapWidth = options.mapWidth;
    this.mapHeight = options.mapHeight;
    this.cells = signalValue<readonly number[]>(Array.from({ length: this.mapWidth * this.mapHeight }, () => 0));
    this.dimensions = new Dimensions(
      this.mapWidth * this.drawTileWidth,
      this.mapHeight * this.drawTileHeight,
      options.x ?? 0,
      options.y ?? 0
    );
  }

  public getTile(x: number, y: number): number {
    this.assertCell(x, y);
    return this.cells()[y * this.mapWidth + x];
  }

  public setTile(x: number, y: number, tileIndex: number): void {
    this.assertCell(x, y);
    if (!Number.isInteger(tileIndex) || tileIndex < 0) {
      throw new RangeError('Tile index must be a non-negative integer.');
    }
    const cells = this.cells().slice();
    cells[y * this.mapWidth + x] = tileIndex;
    this.cells.set(cells);
  }

  public fill(tileIndex: number): void {
    if (!Number.isInteger(tileIndex) || tileIndex < 0) {
      throw new RangeError('Tile index must be a non-negative integer.');
    }
    this.cells.set(this.cells().map(() => tileIndex));
  }

  public setTiles(tiles: ArrayLike<number>): void {
    const current = this.cells();
    if (tiles.length !== current.length) {
      throw new RangeError(`Tile data must contain exactly ${current.length} cells.`);
    }
    const next = new Array<number>(tiles.length);
    for (let index = 0; index < tiles.length; index++) {
      const tile = tiles[index];
      if (tile === undefined || !Number.isInteger(tile) || tile < 0) {
        throw new RangeError(`Tile at index ${index} must be a non-negative integer.`);
      }
      next[index] = tile;
    }
    this.cells.set(next);
  }

  public draw(): void {
    const context = GameContext.context;
    const cells = this.cells();
    const originX = this.dimensions.getX();
    const originY = this.dimensions.getY();
    const scaleX = this.dimensions.getScaleX();
    const scaleY = this.dimensions.getScaleY();
    context.save();
    context.translate(originX, originY);
    context.scale(scaleX, scaleY);
    try {
      for (let y = 0; y < this.mapHeight; y++) {
        for (let x = 0; x < this.mapWidth; x++) {
          const tile = cells[y * this.mapWidth + x];
          if (tile === 0) continue;
          const index = tile - 1;
          const sourceX = this.margin + (index % this.columns) * (this.tileWidth + this.spacing);
          const sourceY = this.margin + Math.floor(index / this.columns) * (this.tileHeight + this.spacing);
          if (sourceX + this.tileWidth > this.tilesetWidth || sourceY + this.tileHeight > this.tilesetHeight) {
            throw new RangeError(`Tile index ${tile} exceeds the tileset image bounds.`);
          }
          context.drawImage(
            this.image,
            sourceX,
            sourceY,
            this.tileWidth,
            this.tileHeight,
            x * this.drawTileWidth,
            y * this.drawTileHeight,
            this.drawTileWidth,
            this.drawTileHeight
          );
        }
      }
    } finally {
      context.restore();
    }
  }

  private assertCell(x: number, y: number): void {
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= this.mapWidth || y >= this.mapHeight) {
      throw new RangeError(`Tile coordinate (${x}, ${y}) is outside the map.`);
    }
  }

  private assertPositiveInteger(value: number, name: string): void {
    if (!Number.isInteger(value) || value <= 0) throw new RangeError(`${name} must be a positive integer.`);
  }
}
