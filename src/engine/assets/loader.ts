import { Atlas } from './atlas';
import { AtlasParser } from './atlas-parser';
import type { SpineRecord } from '../interfaces/spine-record';

export interface LoadedSpineAsset {
  readonly atlas: Atlas;
  readonly data: SpineRecord;
}

const imageModules = import.meta.glob<string>(
  '../../assets/*.{png,jpg,jpeg,webp,gif,svg}',
  {
    eager: false,
    import: 'default',
    query: '?url'
  }
);

const audioModules = import.meta.glob<string>('../../assets/*.mp3', {
  eager: false,
  import: 'default',
  query: '?url'
});

const atlasModules = import.meta.glob<string>('../../assets/*.atlas', {
  eager: true,
  import: 'default',
  query: '?raw'
});

/**
 * Preloads and provides image and audio assets bundled by Vite.
 *
 * @remarks
 * Asset names are their filenames without extensions. For example,
 * `src/assets/player.png` is available as `player`.
 * @class Loader
 */
class Loader {
  /**
   * Stores the images state.
   * @property {Map<string, HTMLImageElement>} images
   * @private
   * @readonly
   */
  private readonly images = new Map<string, HTMLImageElement>();
  /**
   * Parsed Spine-format atlases keyed by their PNG asset name.
   * @property {Map<string, Atlas>} atlases
   * @private
   * @readonly
   */
  private readonly atlases = new Map<string, Atlas>();
  /**
   * Stores the audios state.
   * @property {Map<string, HTMLAudioElement>} audios
   * @private
   * @readonly
   */
  private readonly audios = new Map<string, HTMLAudioElement>();
  private readonly imageRequests = new Map<string, Promise<HTMLImageElement>>();
  private readonly jsonRequests = new Map<string, Promise<unknown>>();
  private readonly atlasRequests = new Map<string, Promise<Atlas>>();
  /**
   * Stores the loading state.
   * @property {Promise<void> | undefined} loading
   * @private
   */
  private loading: Promise<void> | undefined;

  /**
   * Loads every supported image and MP3 audio asset in `src/assets`.
   *
   * Concurrent calls share the same pending operation. A failed image rejects
   * the returned promise with its asset name and URL.
   */
  public loadAll(): Promise<void> {
    if (!this.loading) {
      this.loading = Promise.all([
        this.loadImages(),
        this.loadAtlases(),
        this.loadAudios()
      ]).then(() => undefined).catch((error: unknown) => {
        this.loading = undefined;
        throw error;
      });
    }

    return this.loading;
  }

  /**
   * Gets a preloaded image by filename without its extension.
   *
   * @param name - The asset name, for example `player`.
   * @returns The loaded image asset.
   * @throws {Error} When the requested image has not been loaded.
   */
  public getImage(name: string): HTMLImageElement {
    const image = this.images.get(name);

    if (!image) {
      throw new Error(`Image asset "${name}" has not been loaded.`);
    }

    return image;
  }

  /**
   * Determines whether an image asset is ready to use.
   *
   * @param name - The asset name, for example `player`.
   * @returns `true` when the image has been loaded successfully.
   */
  public hasImage(name: string): boolean {
    return this.images.has(name);
  }

  /** Loads and caches an image from any URL, sharing concurrent requests. */
  public loadImageUrl(url: string): Promise<HTMLImageElement> {
    const cached = this.imageRequests.get(url);
    if (cached) return cached;
    const request = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image), { once: true });
      image.addEventListener('error', () => reject(new Error(`Failed to load image from "${url}".`)), { once: true });
      image.src = url;
    }).catch((error: unknown) => {
      this.imageRequests.delete(url);
      throw error;
    });
    this.imageRequests.set(url, request);
    return request;
  }

  /** Loads and caches JSON from any URL, sharing concurrent requests. */
  public loadJson<T>(url: string): Promise<T> {
    const cached = this.jsonRequests.get(url) as Promise<T> | undefined;
    if (cached) return cached;
    const request = fetch(url).then(async (response) => {
      if (!response.ok) throw new Error(`Failed to load JSON from "${url}" (${response.status}).`);
      return await response.json() as T;
    }).catch((error: unknown) => {
      this.jsonRequests.delete(url);
      throw error;
    });
    this.jsonRequests.set(url, request);
    return request;
  }

  /** Loads a Spine atlas and its page image from paths relative to the atlas. */
  public loadAtlasUrl(url: string): Promise<Atlas> {
    const cached = this.atlasRequests.get(url);
    if (cached) return cached;
    const request = fetch(url).then(async (response) => {
      if (!response.ok) throw new Error(`Failed to load atlas from "${url}" (${response.status}).`);
      const atlas = new Atlas(new AtlasParser().parse(await response.text()));
      const pageUrl = new URL(atlas.pageName, new URL(url, document.baseURI)).toString();
      atlas.setPageImage(await this.loadImageUrl(pageUrl));
      return atlas;
    }).catch((error: unknown) => {
      this.atlasRequests.delete(url);
      throw error;
    });
    this.atlasRequests.set(url, request);
    return request;
  }

  /** Loads a Spine JSON and atlas together using the shared asset cache. */
  public async loadSpine(jsonUrl: string, atlasUrl: string): Promise<LoadedSpineAsset> {
    const [data, atlas] = await Promise.all([
      this.loadJson<SpineRecord>(jsonUrl),
      this.loadAtlasUrl(atlasUrl)
    ]);
    return { data, atlas };
  }

  /**
   * Returns a parsed atlas associated with a loaded PNG asset.
   * @param name - Asset name shared by the PNG and `.atlas` file.
   * @public
   * @return {Atlas}
   */
  public getAtlas(name: string): Atlas {
    const atlas = this.atlases.get(name);
    if (!atlas) {
      throw new Error(`Sprite atlas "${name}.atlas" has not been loaded.`);
    }

    return atlas;
  }

  /**
   * Gets a preloaded MP3 asset by filename without its extension.
   *
   * @param name - The asset name, for example `boom1`.
   * @returns The loaded audio asset.
   * @throws {Error} When the requested audio has not been loaded.
   */
  public getAudio(name: string): HTMLAudioElement {
    const audio = this.audios.get(name);

    if (!audio) {
      throw new Error(`Audio asset "${name}" has not been loaded.`);
    }

    return audio;
  }

  /**
   * Determines whether an audio asset is ready to use.
   *
   * @param name - The asset name, for example `newgame`.
   * @returns `true` when the audio has been loaded successfully.
   */
  public hasAudio(name: string): boolean {
    return this.audios.has(name);
  }

  /**
   * Plays a preloaded sound effect without interrupting another instance.
   *
   * A fresh clone allows overlapping effects, such as several explosions,
   * to play independently.
   *
   * @param name - The asset name without the `.mp3` extension.
   */
  public playAudio(name: string): void {
    const audio = this.getAudio(name).cloneNode(true) as HTMLAudioElement;
    audio.currentTime = 0;

    const playback = audio.play();

    if (playback) {
      void playback.catch((error: unknown) => {
        console.warn(`Unable to play audio asset "${name}".`, error);
      });
    }
  }

  private async loadImages(): Promise<void> {
    await Promise.all(
      Object.entries(imageModules).map(async ([path, loadUrl]) => {
        const url = await loadUrl();
        const name = this.getAssetName(path);

        await this.preloadImage(name, url);
      })
    );
  }

  private async loadAudios(): Promise<void> {
    await Promise.all(
      Object.entries(audioModules).map(async ([path, loadUrl]) => {
        const url = await loadUrl();
        const name = this.getAssetName(path);

        await this.loadAudio(name, url);
      })
    );
  }

  /**
   * Parses every Spine-format atlas and validates its page image name.
   * @private
   * @return {void}
   */
  private async loadAtlases(): Promise<void> {
    Object.entries(atlasModules).forEach(([path, text]) => {
      const name = this.getAssetName(path);
      const atlas = new Atlas(new AtlasParser().parse(text));
      if (atlas.pageName !== `${name}.png`) {
        throw new Error(
          `Atlas "${name}.atlas" references "${atlas.pageName}" instead of "${name}.png".`
        );
      }

      this.atlases.set(name, atlas);
    });
  }

  private getAssetName(path: string): string {
    const filename = path.split('/').at(-1);

    if (!filename) {
      throw new Error(`Unable to determine an asset name from "${path}".`);
    }

    const extensionIndex = filename.lastIndexOf('.');

    if (extensionIndex <= 0) {
      throw new Error(`Asset "${path}" must have a filename extension.`);
    }

    return filename.slice(0, extensionIndex);
  }

  private preloadImage(name: string, url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const image = new Image();

      image.addEventListener(
        'load',
        () => {
          this.images.set(name, image);
          resolve();
        },
        { once: true }
      );
      image.addEventListener(
        'error',
        () => {
          reject(
            new Error(`Failed to load image asset "${name}" from "${url}".`)
          );
        },
        { once: true }
      );
      image.src = url;
    });
  }

  private loadAudio(name: string, url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audio.preload = 'auto';

      audio.addEventListener(
        'canplaythrough',
        () => {
          this.audios.set(name, audio);
          resolve();
        },
        { once: true }
      );
      audio.addEventListener(
        'error',
        () => {
          reject(
            new Error(`Failed to load audio asset "${name}" from "${url}".`)
          );
        },
        { once: true }
      );
      audio.load();
    });
  }
}

const GameLoader = new Loader();

export default GameLoader;
