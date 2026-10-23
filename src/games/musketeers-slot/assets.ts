import {
  Atlas,
  GameLoader,
  Icon
} from '../../engine';

interface MusketeersSymbolDefinition {
  id: string;
  normal: string;
  blurred: string;
  spine?: { json: string; atlas: string };
}

interface MusketeersAssetManifest {
  symbols: MusketeersSymbolDefinition[];
  backgrounds: {
    portrait: { normal: string; freeSpins: string };
    landscape: { normal: string; freeSpins: string };
  };
  reelFrames: { normal: string; freeSpins: string };
  spinButton: { image: string; atlas: string };
}

interface MusketeersBackgrounds {
  portrait: { normal: HTMLImageElement; freeSpins: HTMLImageElement };
  landscape: { normal: HTMLImageElement; freeSpins: HTMLImageElement };
}

/** Loads the slot's data-driven asset catalog through the shared engine loader. */
export class MusketeersSlotAssets {
  public readonly symbols: ReadonlyMap<string, Icon>;
  public readonly backgrounds: MusketeersBackgrounds;
  public readonly reelFrames: { normal: HTMLImageElement; freeSpins: HTMLImageElement };
  public readonly spinButtonImage: HTMLImageElement;
  public readonly spinButtonAtlas: Atlas;

  private constructor(
    symbols: Map<string, Icon>,
    backgrounds: MusketeersBackgrounds,
    reelFrames: { normal: HTMLImageElement; freeSpins: HTMLImageElement },
    spinButtonImage: HTMLImageElement,
    spinButtonAtlas: Atlas
  ) {
    this.symbols = symbols;
    this.backgrounds = backgrounds;
    this.reelFrames = reelFrames;
    this.spinButtonImage = spinButtonImage;
    this.spinButtonAtlas = spinButtonAtlas;
  }

  public static async load(): Promise<MusketeersSlotAssets> {
    const manifestUrl = `${import.meta.env.BASE_URL}slot-machine/musketeers/assets.json`;
    const manifest = await GameLoader.loadJson<MusketeersAssetManifest>(manifestUrl);
    const resolve = (path: string): string => `${import.meta.env.BASE_URL}${path}`;
    const image = (path: string): Promise<HTMLImageElement> => GameLoader.loadImageUrl(resolve(path));

    const [backgrounds, reelFrames, spinButtonImage, spinButtonAtlas, icons] = await Promise.all([
      Promise.all([
        image(manifest.backgrounds.portrait.normal),
        image(manifest.backgrounds.portrait.freeSpins),
        image(manifest.backgrounds.landscape.normal),
        image(manifest.backgrounds.landscape.freeSpins)
      ]),
      Promise.all([image(manifest.reelFrames.normal), image(manifest.reelFrames.freeSpins)]),
      image(manifest.spinButton.image),
      GameLoader.loadAtlasUrl(resolve(manifest.spinButton.atlas)),
      Promise.all(manifest.symbols.map(async (definition) => {
        const icon = await Icon.load(definition.id, {
          normal: resolve(definition.normal),
          blurred: resolve(definition.blurred),
          spine: definition.spine
            ? { json: resolve(definition.spine.json), atlas: resolve(definition.spine.atlas) }
            : undefined
        });
        return [definition.id, icon] as const;
      }))
    ]);

    return new MusketeersSlotAssets(
      new Map(icons),
      {
        portrait: { normal: backgrounds[0], freeSpins: backgrounds[1] },
        landscape: { normal: backgrounds[2], freeSpins: backgrounds[3] }
      },
      { normal: reelFrames[0], freeSpins: reelFrames[1] },
      spinButtonImage,
      spinButtonAtlas
    );
  }

  public dispose(): void {
    this.symbols.forEach((icon) => icon.dispose());
  }
}
