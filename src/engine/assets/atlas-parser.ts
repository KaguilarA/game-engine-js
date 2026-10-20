import type { AtlasPageData } from '../interfaces/atlas-page-data';
import type { ParsedAtlasRegion } from '../interfaces/parsed-atlas-region';

/** Parses and validates one text atlas page and its region records. */
export class AtlasParser {
  private pageName = '';
  private pageWidth = 0;
  private pageHeight = 0;

  public parse(text: string): AtlasPageData {
    const sections = this.parseSections(text);
    const page = sections[0] ?? [];
    if (!page[0]) throw new Error('An atlas page is missing its name.');
    const pageValues = this.readProperties(page.slice(1));
    const [width, height] = this.readPair(pageValues.get('size'), 'page size');
    this.pageName = page[0];
    this.pageWidth = width;
    this.pageHeight = height;
    return {
      pageName: this.pageName,
      width,
      height,
      regions: sections.slice(1).map((section) => this.parseRegion(section))
    };
  }

  private parseSections(text: string): string[][] {
    const sections: string[][] = [];
    text.split(/\r?\n/).forEach((line) => {
      if (!line.trim()) return;
      const section = sections.at(-1);
      if (section && line.includes(':')) {
        section.push(line.trim());
        return;
      }
      if (!/^\s/.test(line)) {
        sections.push([line.trim()]);
        return;
      }
      if (!section) throw new Error('Atlas properties appeared before the page name.');
      section.push(line.trim());
    });
    return sections;
  }

  private readProperties(lines: string[]): Map<string, string> {
    return new Map(lines.map((line) => {
      const separator = line.indexOf(':');
      if (separator < 0) throw new Error(`Invalid atlas property "${line}".`);
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    }));
  }

  private readPair(value: string | undefined, propertyName: string): [number, number] {
    const pair = value?.split(',').map((part) => Number(part.trim()));
    if (!pair || pair.length !== 2 || pair.some((part) => !Number.isFinite(part))) {
      throw new Error(`Invalid ${propertyName} in atlas for "${this.pageName || 'page'}".`);
    }
    return [pair[0], pair[1]];
  }

  private readQuad(value: string | undefined, propertyName: string): [number, number, number, number] {
    const quad = value?.split(',').map((part) => Number(part.trim()));
    if (!quad || quad.length !== 4 || quad.some((part) => !Number.isFinite(part))) {
      throw new Error(`Invalid ${propertyName} in atlas region.`);
    }
    return [quad[0], quad[1], quad[2], quad[3]];
  }

  private parseRegion(lines: string[]): ParsedAtlasRegion {
    const properties = this.readProperties(lines.slice(1));
    const bounds = properties.has('bounds')
      ? this.readQuad(properties.get('bounds'), 'bounds')
      : [
          ...this.readPair(properties.get('xy'), 'region position'),
          ...this.readPair(properties.get('size'), 'region size')
        ];
    const [x, y, width, height] = bounds;
    const rotated = properties.get('rotate') === 'true' || properties.get('rotate') === '90';
    const frameRate = Number(properties.get('fps') ?? 0);
    const indexValue = Number(properties.get('index') ?? 0);
    const originalSize = properties.has('orig')
      ? this.readPair(properties.get('orig'), 'region original size')
      : [width, height];
    const offset = properties.has('offset')
      ? this.readPair(properties.get('offset'), 'region offset')
      : [0, 0];
    const packedWidth = rotated ? height : width;
    const packedHeight = rotated ? width : height;
    if (
      bounds.some((part) => !Number.isFinite(part))
      || !Number.isFinite(frameRate) || x < 0 || y < 0 || width <= 0 || height <= 0
      || x + packedWidth > this.pageWidth || y + packedHeight > this.pageHeight
    ) throw new Error(`Invalid bounds or playback settings for atlas region "${lines[0]}".`);
    return {
      name: lines[0],
      index: Number.isInteger(indexValue) && indexValue >= 0 ? indexValue : 0,
      x,
      y,
      width,
      height,
      frameRate,
      loop: properties.get('loop') === 'true',
      rotated,
      originalWidth: originalSize[0],
      originalHeight: originalSize[1],
      offsetX: offset[0],
      offsetY: offset[1]
    };
  }
}
