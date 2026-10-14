const imageModules = import.meta.glob<string>(
  '../assets/*.{png,jpg,jpeg,webp,gif,svg}',
  {
    eager: false,
    import: 'default',
    query: '?url'
  }
);

const audioModules = import.meta.glob<string>('../assets/*.mp3', {
  eager: false,
  import: 'default',
  query: '?url'
});

/**
 * Preloads and provides image and audio assets bundled by Vite.
 *
 * @remarks
 * Asset names are their filenames without extensions. For example,
 * `src/assets/player.png` is available as `player`.
 */
class Loader {
  private readonly images = new Map<string, HTMLImageElement>();
  private readonly audios = new Map<string, HTMLAudioElement>();
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

        await this.loadImage(name, url);
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

  private loadImage(name: string, url: string): Promise<void> {
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
