import GameContext from '../core/context';

/**
 * Draws an inline SVG icon on the game canvas.
 * @class CanvasIcon
 */
export default class CanvasIcon {
  /**
   * Stores the image state.
   * @property {Image} image
   * @private
   * @readonly
   */
  private readonly image = new Image();

  /**
   * Creates a canvas-ready image from inline SVG markup.
   * @public
   * @return {void}
   */
  constructor(svg: string, color = '#ffffff', filled = false) {
    this.image.addEventListener('error', () => {
      console.error('Failed to load a canvas icon.');
    });
    this.image.src = (
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        svg
          .replaceAll('currentColor', color)
          .replace('fill="none"', `fill="${filled ? color : 'none'}"`)
      )}`
    );
  }

  /**
   * Draws the icon inside a square at the requested top-left position.
   * @public
   * @return {void}
   */
  public draw(x: number, y: number, size: number): void {
    if (!this.image.complete || this.image.naturalWidth === 0) return;

    GameContext.drawImage(this.image, x, y, size, size);
  }
}
