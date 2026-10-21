import { signalValue } from 'reactive-values';
import type { SignalValue } from 'reactive-values';

import GameContext from '../../engine/core/context';
import type { GamePointer } from '../../engine/interfaces/game-pointer';

export interface ScratchCardBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const COVERAGE_INTERVAL = 0.08;
const REVEAL_THRESHOLD = 0.42;

/** Owns the scratchable coating, pointer strokes, and reactive reveal progress. */
export class ScratchSurface {
  public readonly scratchedRatio: SignalValue<number> = signalValue(0);
  public readonly revealed: SignalValue<boolean> = signalValue(false);

  private readonly canvas = document.createElement('canvas');
  private readonly context: CanvasRenderingContext2D;
  private readonly getCardBounds: () => ScratchCardBounds;
  private readonly lastPoint = signalValue<GamePointer | undefined>(undefined);
  private readonly dirty = signalValue(false);
  private readonly checkElapsed = signalValue(0);

  public constructor(getCardBounds: () => ScratchCardBounds) {
    this.getCardBounds = getCardBounds;
    const context = this.canvas.getContext('2d');
    if (context === null) throw new Error('Failed to initialize scratch-card surface.');
    this.context = context;
  }

  /** Clears card progress and restores the coating. */
  public reset(): void {
    this.lastPoint.set(undefined);
    this.dirty.set(false);
    this.checkElapsed.set(0);
    this.scratchedRatio.set(0);
    this.revealed.set(false);
    this.resize(true);
  }

  /** Rebuilds the backing canvas when the responsive card size changes. */
  public resize(forceRepaint = false): void {
    const bounds = this.getCardBounds();
    const width = bounds.width;
    const height = bounds.height - 106;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const backingWidth = Math.max(1, Math.round(width * pixelRatio));
    const backingHeight = Math.max(1, Math.round(height * pixelRatio));
    const dimensionsChanged = this.canvas.width !== backingWidth || this.canvas.height !== backingHeight;
    if (!dimensionsChanged && !forceRepaint) return;
    if (dimensionsChanged) {
      this.canvas.width = backingWidth;
      this.canvas.height = backingHeight;
      this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    }
    this.paintCoating(width, height);
    this.scratchedRatio.set(0);
    this.revealed.set(false);
  }

  /** Begins a stroke only when the pointer lands on the scratchable area. */
  public begin(pointer: GamePointer): void {
    if (this.revealed() || !this.contains(pointer)) return;
    this.lastPoint.set(pointer);
    this.erase(pointer, pointer);
    this.dirty.set(true);
  }

  /** Erases along the active pointer path. */
  public move(pointer: GamePointer): void {
    const previous = this.lastPoint();
    if (previous === undefined || this.revealed()) return;
    this.erase(previous, pointer);
    this.lastPoint.set(pointer);
    this.dirty.set(true);
  }

  /** Ends the active pointer path and measures any final unreported change. */
  public end(): void {
    this.lastPoint.set(undefined);
    this.measureIfDirty();
  }

  /** Updates reactive scratch coverage at a bounded rate during pointer drags. */
  public update(deltaSeconds: number): void {
    if (!this.dirty()) return;
    this.checkElapsed.set(this.checkElapsed() + deltaSeconds);
    if (this.checkElapsed() < COVERAGE_INTERVAL) return;
    this.dirty.set(false);
    this.checkElapsed.set(0);
    this.measureCoverage();
  }

  /** Draws the current coating over the card's revealed content. */
  public draw(bounds: ScratchCardBounds): void {
    this.ensureSize();
    GameContext.drawImage(this.canvas, bounds.x, bounds.y + 58, bounds.width, bounds.height - 106);
  }

  /** Cancels a drag, for example when the shared pause control is activated. */
  public cancel(): void {
    this.lastPoint.set(undefined);
  }

  private measureIfDirty(): void {
    if (!this.dirty()) return;
    this.dirty.set(false);
    this.checkElapsed.set(0);
    this.measureCoverage();
  }

  private measureCoverage(): void {
    this.ensureSize();
    const bounds = this.getCardBounds();
    const pixelRatio = this.canvas.width / Math.max(1, bounds.width);
    const sampleStep = Math.max(1, Math.round(pixelRatio * 8));
    const pixels = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
    let total = 0;
    let erased = 0;
    for (let y = 0; y < this.canvas.height; y += sampleStep) {
      for (let x = 0; x < this.canvas.width; x += sampleStep) {
        total++;
        if (pixels[(y * this.canvas.width + x) * 4 + 3] < 128) erased++;
      }
    }
    const ratio = total === 0 ? 0 : erased / total;
    this.scratchedRatio.set(ratio);
    if (!this.revealed() && ratio >= REVEAL_THRESHOLD) this.revealed.set(true);
  }

  private contains(pointer: GamePointer): boolean {
    const bounds = this.getCardBounds();
    return pointer.x >= bounds.x && pointer.x <= bounds.x + bounds.width
      && pointer.y >= bounds.y + 58 && pointer.y <= bounds.y + bounds.height - 48;
  }

  private erase(from: GamePointer, to: GamePointer): void {
    const bounds = this.getCardBounds();
    const areaY = bounds.y + 58;
    const brush = Math.max(15, Math.min(25, bounds.width * 0.055));
    this.context.globalCompositeOperation = 'destination-out';
    this.context.lineWidth = brush * 2;
    this.context.lineCap = 'round';
    this.context.beginPath();
    this.context.moveTo(from.x - bounds.x, from.y - areaY);
    this.context.lineTo(to.x - bounds.x, to.y - areaY);
    this.context.stroke();
    this.context.beginPath();
    this.context.arc(to.x - bounds.x, to.y - areaY, brush, 0, Math.PI * 2);
    this.context.fill();
    this.context.globalCompositeOperation = 'source-over';
  }

  private ensureSize(): void {
    const bounds = this.getCardBounds();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    if (this.canvas.width !== Math.round(bounds.width * pixelRatio)
      || this.canvas.height !== Math.round((bounds.height - 106) * pixelRatio)) {
      this.resize();
    }
  }

  private paintCoating(width: number, height: number): void {
    this.context.globalCompositeOperation = 'source-over';
    const gradient = this.context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#d9e1e2');
    gradient.addColorStop(0.5, '#a9b8bb');
    gradient.addColorStop(1, '#edf0e9');
    this.context.fillStyle = gradient;
    this.context.fillRect(0, 0, width, height);
    this.context.fillStyle = 'rgba(47, 69, 76, 0.12)';
    for (let x = 9; x < width; x += 18) {
      for (let y = 8; y < height; y += 18) this.context.fillRect(x, y, 2, 2);
    }
    this.context.fillStyle = '#40555b';
    this.context.font = `bold ${Math.max(15, Math.min(24, height * 0.12))}px sans-serif`;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';
    this.context.fillText('SCRATCH HERE', width / 2, height / 2);
  }
}
