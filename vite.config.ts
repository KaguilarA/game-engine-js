import { defineConfig } from 'vite';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const manifestRoute = '/slot-machine/musketeers/assets.json';
const manifestFile = 'slot-machine/musketeers/assets.json';
const publicRoot = join(process.cwd(), 'public');
const musketeersRoot = join(publicRoot, 'slot-machine', 'musketeers');

function walkFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(path) : [path];
  });
}

function createMusketeersManifest(): object {
  const files = walkFiles(musketeersRoot);
  const knownFiles = new Set(files);
  const assetUrl = (path: string): string => relative(publicRoot, path).split(sep).join('/');
  const exists = (path: string): boolean => knownFiles.has(path);
  const symbolsRoot = join(musketeersRoot, 'images', 'icons');
  const symbols = readdirSync(symbolsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((first, second) => first.name.localeCompare(second.name))
    .map((entry) => {
      const directory = join(symbolsRoot, entry.name);
      const normal = join(directory, `${entry.name}.png`);
      const blurred = join(directory, `${entry.name}_blurred.png`);
      const json = join(directory, 'animated', `${entry.name}.json`);
      const atlas = join(directory, 'animated', `${entry.name}.atlas`);
      if (!exists(normal) || !exists(blurred)) return undefined;
      return {
        id: entry.name,
        normal: assetUrl(normal),
        blurred: assetUrl(blurred),
        spine: exists(json) && exists(atlas)
          ? { json: assetUrl(json), atlas: assetUrl(atlas) }
          : undefined
      };
    })
    .filter((symbol) => symbol !== undefined);

  const background = join(musketeersRoot, 'images', 'elements', 'background');
  const buttonsRoot = join(publicRoot, 'slot-machine', 'common', 'buttons', 'btnSpin');
  const assetPath = (...parts: string[]): string => join(...parts);
  const backgroundAsset = (orientation: string, state: string): string =>
    assetUrl(assetPath(background, `background${orientation}`, `${state}.png`));
  const reelFrame = (state: string): string =>
    assetUrl(assetPath(background, 'reels', `${state}.png`));
  return {
    symbols,
    backgrounds: {
      portrait: { normal: backgroundAsset('Portrait', 'normal'), freeSpins: backgroundAsset('Portrait', 'freeSpins') },
      landscape: { normal: backgroundAsset('Landscape', 'normal'), freeSpins: backgroundAsset('Landscape', 'freeSpins') }
    },
    reelFrames: { normal: reelFrame('normal'), freeSpins: reelFrame('freeSpins') },
    spinButton: {
      image: assetUrl(join(buttonsRoot, 'spinbutton.png')),
      atlas: assetUrl(join(buttonsRoot, 'spinbutton.atlas'))
    }
  };
}

function musketeersManifestPlugin() {
  return {
    name: 'musketeers-asset-manifest',
    configureServer(server: { middlewares: { use: (handler: (request: { url?: string }, response: { setHeader: (name: string, value: string) => void; end: (body: string) => void }, next: () => void) => void) => void } }) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== manifestRoute) return next();
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify(createMusketeersManifest()));
      });
    },
    buildStart(this: { emitFile: (asset: { type: 'asset'; fileName: string; source: string }) => void }) {
      this.emitFile({ type: 'asset', fileName: manifestFile, source: JSON.stringify(createMusketeersManifest()) });
    }
  };
}

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/game-engine-js/' : '/',
  plugins: [musketeersManifestPlugin()]
}));
