/**
 * Pixel rectangle for one sprite frame stored in a Spine-style atlas page.
 */
export interface AtlasRegion {
  /**
   * Name shared by frames that form one atlas animation.
   * @property {string} name
   * @public
   */
  name: string;
  /**
   * Frame ordering within its named atlas animation.
   * @property {number} index
   * @public
   */
  index: number;
  /**
   * Horizontal source coordinate in the page image.
   * @property {number} x
   * @public
   */
  x: number;
  /**
   * Vertical source coordinate in the page image.
   * @property {number} y
   * @public
   */
  y: number;
  /**
   * Source width in page pixels.
   * @property {number} width
   * @public
   */
  width: number;
  /**
   * Source height in page pixels.
   * @property {number} height
   * @public
   */
  height: number;
}

/**
 * Ordered atlas frames with playback settings stored as region properties.
 */
export interface AtlasAnimation {
  /**
   * Clip name used to request this animation from the atlas.
   * @property {string} name
   * @public
   */
  name: string;
  /**
   * Ordered image regions for the clip.
   * @property {AtlasRegion[]} frames
   * @public
   */
  frames: AtlasRegion[];
  /**
   * Playback speed in frames per second.
   * @property {number} frameRate
   * @public
   */
  frameRate: number;
  /**
   * Whether playback repeats after the last frame.
   * @property {boolean} loop
   * @public
   */
  loop: boolean;
}

interface ParsedAtlasRegion extends AtlasRegion {
  frameRate: number;
  loop: boolean;
}

/**
 * Parses the text atlas format used by Spine and exposes its named frame clips.
 * @class SpriteAtlas
 */
export class SpriteAtlas {
  /**
   * Image page referenced at the top of the atlas file.
   * @property {string} pageName
   * @public
   * @readonly
   */
  public readonly pageName: string;
  /**
   * Pixel width declared by the atlas page.
   * @property {number} width
   * @public
   * @readonly
   */
  public readonly width: number;
  /**
   * Pixel height declared by the atlas page.
   * @property {number} height
   * @public
   * @readonly
   */
  public readonly height: number;
  /**
   * Parsed clips keyed by their region name.
   * @property {Map<string, AtlasAnimation>} animations
   * @private
   * @readonly
   */
  private readonly animations: Map<string, AtlasAnimation>;
  /**
   * Parses page metadata and groups repeated region names into animations.
   * @param text - Spine-compatible atlas text.
   * @public
   * @return {void}
   */
  public constructor(text: string) {
    const sections = this.parseSections(text);
    const page = sections[0] ?? [];
    if (!page[0]) {
      throw new Error('A atlas page is missing its name.');
    }
    const pageValues = this.readProperties(page.slice(1));
    const pageSize = this.readPair(pageValues.get('size'), 'page size');

    this.pageName = page[0];
    this.width = pageSize[0];
    this.height = pageSize[1];
    this.animations = new Map();

    sections.slice(1).forEach((lines) => {
      const region = this.parseRegion(lines);
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
  }

  /**
   * Groups Spine atlas records by indentation. Page and region names start
   * unindented; their properties are indented on following lines.
   * @param text - Raw Spine atlas contents.
   * @private
   * @return {string[][]}
   */
  private parseSections(text: string): string[][] {
    const sections: string[][] = [];
    text.split(/\r?\n/).forEach((line) => {
      if (!line.trim()) {
        return;
      }

      if (!/^\s/.test(line)) {
        sections.push([line.trim()]);
        return;
      }

      const section = sections.at(-1);
      if (!section) {
        throw new Error('Atlas properties appeared before the page name.');
      }

      section.push(line.trim());
    });

    return sections;
  }

  /**
   * Returns an animation clip by its atlas region name.
   * @param name - Name shared by the clip's region entries.
   * @public
   * @return {AtlasAnimation}
   */
  public getAnimation(name: string): AtlasAnimation {
    const animation = this.animations.get(name);
    if (!animation) {
      throw new Error(`Atlas animation "${name}" is missing from "${this.pageName}".`);
    }

    return animation;
  }

  /**
   * Returns one named region, requiring exactly one frame for that name.
   * @param name - Name of the static atlas region.
   * @public
   * @return {AtlasRegion}
   */
  public getRegion(name: string): AtlasRegion {
    const animation = this.getAnimation(name);
    if (animation.frames.length !== 1) {
      throw new Error(`Atlas region "${name}" in "${this.pageName}" is animated.`);
    }

    return animation.frames[0];
  }

  /**
   * Reads colon-separated properties from a Spine atlas block.
   * @param lines - Property lines excluding the block name.
   * @private
   * @return {Map<string, string>}
   */
  private readProperties(lines: string[]): Map<string, string> {
    return new Map(lines.map((line) => {
      const separator = line.indexOf(':');
      if (separator < 0) {
        throw new Error(`Invalid atlas property "${line}".`);
      }

      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    }));
  }

  /**
   * Reads a required pair of numeric values from an atlas property.
   * @param value - Comma-separated pair from the atlas.
   * @param propertyName - Property label included in parse errors.
   * @private
   * @return {[number, number]}
   */
  private readPair(
    value: string | undefined,
    propertyName: string
  ): [number, number] {
    const pair = value?.split(',').map((part) => Number(part.trim()));
    if (!pair || pair.length !== 2 || pair.some((part) => !Number.isFinite(part))) {
      throw new Error(`Invalid ${propertyName} in atlas for "${this.pageName ?? 'page'}".`);
    }

    return [pair[0], pair[1]];
  }

  /**
   * Converts region bounds and custom animation properties to a frame record.
   * @param lines - Region name and property lines.
   * @private
   * @return {ParsedAtlasRegion}
   */
  private parseRegion(lines: string[]): ParsedAtlasRegion {
    const properties = this.readProperties(lines.slice(1));
    const bounds = properties.has('bounds')
      ? this.readQuad(properties.get('bounds'), 'bounds')
      : this.readSeparateBounds(properties);
    const [x, y, width, height] = bounds;
    const index = Number(properties.get('index') ?? 0);
    const frameRate = Number(properties.get('fps') ?? 0);
    const loop = properties.get('loop') === 'true';

    if (
      !Number.isInteger(index)
      || !Number.isFinite(frameRate)
      || x < 0
      || y < 0
      || width <= 0
      || height <= 0
      || x + width > this.width
      || y + height > this.height
    ) {
      throw new Error(`Invalid bounds or playback settings for atlas region "${lines[0]}".`);
    }

    return { name: lines[0], index, x, y, width, height, frameRate, loop };
  }

  /**
   * Reads a four-value bounds property.
   * @param value - Comma-separated x, y, width, and height values.
   * @param propertyName - Property label included in parse errors.
   * @private
   * @return {[number, number, number, number]}
   */
  private readQuad(
    value: string | undefined,
    propertyName: string
  ): [number, number, number, number] {
    const quad = value?.split(',').map((part) => Number(part.trim()));
    if (!quad || quad.length !== 4 || quad.some((part) => !Number.isFinite(part))) {
      throw new Error(`Invalid ${propertyName} in atlas region.`);
    }

    return [quad[0], quad[1], quad[2], quad[3]];
  }

  /**
   * Reads x/y and size properties used by newer Spine atlas exports.
   * @param properties - Region properties.
   * @private
   * @return {[number, number, number, number]}
   */
  private readSeparateBounds(
    properties: Map<string, string>
  ): [number, number, number, number] {
    const [x, y] = this.readPair(properties.get('xy'), 'region position');
    const [width, height] = this.readPair(properties.get('size'), 'region size');

    return [x, y, width, height];
  }
}
