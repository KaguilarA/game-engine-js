import { AtlasAnimationCatalog } from './atlas-animation-catalog';
import type { AtlasAnimation } from '../interfaces/atlas-animation';
import type { AtlasPageData } from '../interfaces/atlas-page-data';
import type { AtlasRegion } from '../interfaces/atlas-region';

/** Provides page metadata, image ownership, and named region lookups. */
export class Atlas {
  public readonly pageName: string;
  public readonly width: number;
  public readonly height: number;
  public image: HTMLImageElement | undefined;
  private readonly catalog: AtlasAnimationCatalog;

  public constructor(page: AtlasPageData) {
    this.pageName = page.pageName;
    this.width = page.width;
    this.height = page.height;
    this.catalog = new AtlasAnimationCatalog(this.pageName, page.regions);
  }

  public getAnimation(name: string): AtlasAnimation {
    return this.catalog.getAnimation(name);
  }

  public getRegion(name: string): AtlasRegion {
    const animation = this.getAnimation(name);
    if (animation.frames.length !== 1) {
      throw new Error(`Atlas region "${name}" in "${this.pageName}" is animated.`);
    }
    return animation.frames[0];
  }

  public setPageImage(image: HTMLImageElement): void {
    this.image = image;
  }
}
