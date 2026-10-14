import GameContext from './context';

/**
 * Draws an inline SVG icon on the game canvas.
 */
export default class CanvasIcon {
  private readonly image = new Image();

  constructor(svg: string, color = '#ffffff') {
    this.image.addEventListener('error', () => {
      console.error('Failed to load a canvas icon.');
    });
    this.image.src = (
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        svg.replaceAll('currentColor', color)
      )}`
    );
  }

  public draw(x: number, y: number, size: number): void {
    if (!this.image.complete || this.image.naturalWidth === 0) return;

    GameContext.drawImage(this.image, x, y, size, size);
  }
}
