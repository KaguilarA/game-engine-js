export interface PatternIcon {
  /**
   * Asset identifier used to load the sprite sheet.
   * @property {string} imageName
   * @public
   */
  imageName: string;
  /**
   * Height of one source animation frame.
   * @property {number} sourceHeight
   * @public
   */
  sourceHeight: number;
  /**
   * Width of one source animation frame.
   * @property {number} sourceWidth
   * @public
   */
  sourceWidth: number;
  /**
   * Horizontal offset of the first displayed frame.
   * @property {number} sourceX
   * @public
   */
  sourceX: number;
  /**
   * Vertical offset of the first displayed frame.
   * @property {number} sourceY
   * @public
   */
  sourceY: number;
}

/**
 * Sprite frame definitions used as the board's matchable patterns.
 */
export const PATTERN_ICONS: readonly PatternIcon[] = [
  {
    imageName: 'beetlemorph',
    sourceHeight: 100,
    sourceWidth: 100,
    sourceX: 0,
    sourceY: 0
  },
  {
    imageName: 'eaglemorph',
    sourceHeight: 80,
    sourceWidth: 80,
    sourceX: 0,
    sourceY: 0
  },
  {
    imageName: 'lobstermorph',
    sourceHeight: 100,
    sourceWidth: 100,
    sourceX: 0,
    sourceY: 0
  },
  {
    imageName: 'phantommorph',
    sourceHeight: 100,
    sourceWidth: 100,
    sourceX: 0,
    sourceY: 0
  },
  {
    imageName: 'rhinomorph',
    sourceHeight: 80,
    sourceWidth: 80,
    sourceX: 0,
    sourceY: 0
  },
  {
    imageName: 'squidmorph',
    sourceHeight: 80,
    sourceWidth: 80,
    sourceX: 0,
    sourceY: 0
  }
];
