export interface PatternIcon {
  /**
   * Asset identifier used to load the sprite sheet.
   * @property {string} imageName
   * @public
   */
  imageName: string;
  /**
   * Name of the static region in the sprite's atlas.
   * @property {string} regionName
   * @public
   */
  regionName: string;
}

/**
 * Sprite frame definitions used as the board's matchable patterns.
 */
export const PATTERN_ICONS: readonly PatternIcon[] = [
  {
    imageName: 'beetlemorph',
    regionName: 'icon'
  },
  {
    imageName: 'eaglemorph',
    regionName: 'icon'
  },
  {
    imageName: 'lobstermorph',
    regionName: 'icon'
  },
  {
    imageName: 'phantommorph',
    regionName: 'icon'
  },
  {
    imageName: 'rhinomorph',
    regionName: 'icon'
  },
  {
    imageName: 'squidmorph',
    regionName: 'icon'
  }
];
