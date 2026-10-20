import type { AtlasAnimation } from '../interfaces/atlas-animation';
import type { ParsedAtlasRegion } from '../interfaces/parsed-atlas-region';

/** Groups parsed atlas regions into frame-ordered named animations. */
export class AtlasAnimationCatalog {
  private readonly animations = new Map<string, AtlasAnimation>();

  public constructor(pageName: string, regions: ParsedAtlasRegion[]) {
    regions.forEach((region) => {
      const frames = this.animations.get(region.name)?.frames ?? [];
      frames.push(region);
      frames.sort((first, second) => first.index - second.index);
      this.animations.set(region.name, {
        name: region.name,
        frames,
        frameRate: region.frameRate,
        loop: region.loop
      });
    });
    this.pageName = pageName;
  }

  private readonly pageName: string;

  public getAnimation(name: string): AtlasAnimation {
    const animation = this.animations.get(name);
    if (!animation) {
      throw new Error(`Atlas animation "${name}" is missing from "${this.pageName}".`);
    }
    return animation;
  }
}
