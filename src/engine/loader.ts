const imageModules = import.meta.glob<string>(
  '../assets/*.{png,jpg,jpeg,webp,gif,svg}',
  {
    eager: false,
    import: 'default',
    query: '?url'
  }
);

/**
 * Preloads and provides image assets bundled by Vite.
 *
 * @remarks
 * Asset names are their filenames without extensions. For example,
 * `src/assets/player.png` is available as `player`.
 */
class Loader {
  private readonly images = new Map<string, HTMLImageElement>();
  private loading: Promise<void> | undefined;

  /**
   * Loads every supported image in `src/assets`.
   *
   * Concurrent calls share the same pending operation. A failed image rejects
   * the returned promise with its asset name and URL.
   */
  public loadAll(): Promise<void> {
    if (!this.loading) {
      this.loading = this.loadImages().catch((error: unknown) => {
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

  private async loadImages(): Promise<void> {
    await Promise.all(
      Object.entries(imageModules).map(async ([path, loadUrl]) => {
        const url = await loadUrl();
        const name = this.getAssetName(path);

        await this.loadImage(name, url);
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
}

const GameLoader = new Loader();

export default GameLoader;
