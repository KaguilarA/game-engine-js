/** Grid and animation clip dimensions for the PNG sprite sheets in assets/. */
export interface SpriteSheetDefinition {
  frameWidth: number;
  frameHeight: number;
  rows: number;
  animationFrames: number;
  explosionX?: number;
  explosionFrames?: number;
}

export const SPRITE_SHEETS: Readonly<Record<string, SpriteSheetDefinition>> = {
  player: { frameWidth: 140, frameHeight: 120, rows: 1, animationFrames: 4 },
  player_jets: { frameWidth: 140, frameHeight: 120, rows: 1, animationFrames: 3 },
  enemyProjectile: { frameWidth: 50, frameHeight: 70, rows: 1, animationFrames: 4 },
  beetlemorph: {
    frameWidth: 100, frameHeight: 100, rows: 4, animationFrames: 2,
    explosionX: 200, explosionFrames: 1
  },
  eaglemorph: {
    frameWidth: 80, frameHeight: 80, rows: 4, animationFrames: 4,
    explosionX: 320, explosionFrames: 5
  },
  squidmorph: {
    frameWidth: 80, frameHeight: 80, rows: 4, animationFrames: 12,
    explosionX: 960, explosionFrames: 5
  },
  lobstermorph: {
    frameWidth: 100, frameHeight: 100, rows: 4, animationFrames: 9,
    explosionX: 900, explosionFrames: 5
  },
  phantommorph: {
    frameWidth: 100, frameHeight: 100, rows: 4, animationFrames: 8,
    explosionX: 800, explosionFrames: 4
  },
  rhinomorph: {
    frameWidth: 80, frameHeight: 80, rows: 4, animationFrames: 5,
    explosionX: 400, explosionFrames: 1
  },
  boss: {
    frameWidth: 220, frameHeight: 200, rows: 4, animationFrames: 6,
    explosionX: 1320, explosionFrames: 4
  },
  boss8: {
    frameWidth: 220, frameHeight: 200, rows: 8, animationFrames: 6,
    explosionX: 1320, explosionFrames: 4
  }
};

export function getSpriteSheet(name: string): SpriteSheetDefinition {
  const sheet = SPRITE_SHEETS[name];
  if (!sheet) throw new Error(`Sprite sheet metadata is missing for "${name}".`);
  return sheet;
}
