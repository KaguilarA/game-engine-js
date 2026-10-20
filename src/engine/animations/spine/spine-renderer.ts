import GameContext from '../../core/context';
import { mapAtlasUv } from '../../assets/map-atlas-uv';
import type { Atlas } from '../../assets/atlas';
import type { SpineBoneTransform } from '../../interfaces/spine-bone-transform';
import type { SpineRecord } from '../../interfaces/spine-record';
import type { SpineSlotPose } from '../../interfaces/spine-slot-pose';
import type { AtlasRegion } from '../../interfaces/atlas-region';
import { SpineRuntime } from './spine-runtime';

const REGION_TRIANGLES = [0, 1, 2, 2, 3, 0];

/** Canvas renderer for Spine region and mesh attachments. */
export class SpineRenderer {
  private readonly context = GameContext.context;
  private readonly tintedAtlases = new WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>();

  public draw(runtime: SpineRuntime, atlas: Atlas, centerX: number, centerY: number, width: number, height: number): void {
    const image = atlas.image;
    if (!image?.complete || image.naturalWidth === 0) return;
    const scaleX = width / Math.max(1, runtime.width);
    const scaleY = height / Math.max(1, runtime.height);
    const drawables = runtime.getDrawables();
    const clipEnds: string[] = [];
    const closeClipsAtSlot = (slotName: string): void => {
      while (clipEnds.at(-1) && clipEnds.at(-1) === slotName) {
        clipEnds.pop();
        this.context.restore();
      }
    };
    for (const drawable of drawables) {
      const attachment = drawable.attachment;
      const path = String(attachment.path ?? attachment.name ?? '');
      if (attachment.type === 'clipping') {
        const vertices = this.createWorldVertices(runtime, drawable.bone, drawable.slot.name,
          drawable.slot.attachmentName ?? path, attachment);
        if (vertices.length >= 6) {
          this.context.save();
          this.context.beginPath();
          this.context.moveTo(centerX + vertices[0] * scaleX, centerY - vertices[1] * scaleY);
          for (let index = 2; index + 1 < vertices.length; index += 2) {
            this.context.lineTo(centerX + vertices[index] * scaleX, centerY - vertices[index + 1] * scaleY);
          }
          this.context.closePath();
          this.context.clip();
          clipEnds.push(String(attachment.end ?? ''));
        }
        closeClipsAtSlot(drawable.slot.name);
        continue;
      }
      let region: AtlasRegion;
      try {
        region = atlas.getRegion(path);
      } catch {
        // Spine exports may contain optional attachments not present on the
        // currently loaded page. Skip only that attachment and keep rendering.
        closeClipsAtSlot(drawable.slot.name);
        continue;
      }
      const mesh = this.createMesh(runtime, drawable.bone, drawable.slot.name, drawable.slot.attachmentName ?? path, attachment);
      if (!mesh) {
        closeClipsAtSlot(drawable.slot.name);
        continue;
      }
      const color = this.multiplyColor(drawable.slot.color, attachment.color ?? 'FFFFFFFF');
      const tint = this.getTintedAtlas(image, color, drawable.slot.darkColor);
      this.drawMesh(tint, atlas, region, mesh.vertices, mesh.uvs, mesh.triangles, centerX, centerY, scaleX, scaleY,
        this.alpha(color), drawable.slot.blendMode);
      closeClipsAtSlot(drawable.slot.name);
    }
    while (clipEnds.length > 0) {
      clipEnds.pop();
      this.context.restore();
    }
  }

  private createMesh(
    runtime: SpineRuntime,
    bone: SpineBoneTransform,
    slotName: string,
    attachmentName: string,
    attachment: SpineRecord
  ): { vertices: number[]; uvs: number[]; triangles: number[] } | undefined {
    // Spine JSON omits `type` for ordinary region attachments; `mesh` is the
    // only attachment kind that consistently declares it in the slot data.
    if (attachment.type === 'region' || (!attachment.type && attachment.width && attachment.height)) {
      const w = Number(attachment.width ?? 0) * Number(attachment.scaleX ?? 1);
      const h = Number(attachment.height ?? 0) * Number(attachment.scaleY ?? 1);
      const rotation = Number(attachment.rotation ?? 0) * Math.PI / 180;
      const corners = [[-w / 2, -h / 2], [-w / 2, h / 2], [w / 2, h / 2], [w / 2, -h / 2]];
      const vertices = corners.flatMap(([x, y]) => {
        const rx = x * Math.cos(rotation) - y * Math.sin(rotation) + Number(attachment.x ?? 0);
        const ry = x * Math.sin(rotation) + y * Math.cos(rotation) + Number(attachment.y ?? 0);
        return this.transform(bone, rx, ry);
      });
      return { vertices, uvs: [0, 1, 0, 0, 1, 0, 1, 1], triangles: REGION_TRIANGLES };
    }
    if (attachment.type !== 'mesh' && attachment.type !== 'linkedmesh' && !attachment.uvs) return undefined;
    const vertices = this.createWorldVertices(runtime, bone, slotName, attachmentName, attachment);
    return { vertices, uvs: attachment.uvs ?? [], triangles: attachment.triangles ?? [] };
  }

  private createWorldVertices(
    runtime: SpineRuntime,
    bone: SpineBoneTransform,
    slotName: string,
    attachmentName: string,
    attachment: SpineRecord
  ): number[] {
    const sourceVertices = runtime.getAttachmentVertices(slotName, attachmentName, attachment.vertices ?? []);
    return attachment.bones
      ? this.computeWeightedVertices(runtime, attachment, sourceVertices)
      : this.computeUnweightedVertices(bone, sourceVertices);
  }

  private computeUnweightedVertices(bone: SpineBoneTransform, source: number[]): number[] {
    const vertices: number[] = [];
    for (let i = 0; i + 1 < source.length; i += 2) {
      vertices.push(...this.transform(bone, source[i], source[i + 1]));
    }
    return vertices;
  }

  private computeWeightedVertices(runtime: SpineRuntime, attachment: SpineRecord, source: number[]): number[] {
    const vertices: number[] = [];
    const bones: number[] = attachment.bones;
    let boneCursor = 0;
    let vertexCursor = 0;
    while (boneCursor < bones.length && vertexCursor < source.length) {
      const influenceCount = bones[boneCursor++];
      let worldX = 0;
      let worldY = 0;
      for (let influence = 0; influence < influenceCount; influence++) {
        const bone = runtime.getBonePose(bones[boneCursor++]);
        const x = source[vertexCursor++];
        const y = source[vertexCursor++];
        const weight = source[vertexCursor++];
        worldX += (bone.a * x + bone.b * y + bone.x) * weight;
        worldY += (bone.c * x + bone.d * y + bone.y) * weight;
      }
      vertices.push(worldX, worldY);
    }
    return vertices;
  }

  private transform(bone: SpineBoneTransform, x: number, y: number): [number, number] {
    return [bone.a * x + bone.b * y + bone.x, bone.c * x + bone.d * y + bone.y];
  }

  private drawMesh(
    image: HTMLImageElement | HTMLCanvasElement,
    atlas: Atlas,
    region: AtlasRegion,
    worldVertices: number[],
    localUvs: number[],
    triangles: number[],
    centerX: number,
    centerY: number,
    scaleX: number,
    scaleY: number,
    alpha: number,
    blendMode: SpineSlotPose['blendMode']
  ): void {
    const count = Math.min(worldVertices.length / 2, localUvs.length / 2);
    const positions = new Array<number>(count * 2);
    const uvs = new Array<number>(count * 2);
    for (let index = 0; index < count; index++) {
      positions[index * 2] = centerX + worldVertices[index * 2] * scaleX;
      positions[index * 2 + 1] = centerY - worldVertices[index * 2 + 1] * scaleY;
      const [u, v] = mapAtlasUv(
        region,
        atlas.width,
        atlas.height,
        localUvs[index * 2],
        localUvs[index * 2 + 1]
      );
      const sourceWidth = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
      const sourceHeight = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
      uvs[index * 2] = u * sourceWidth;
      uvs[index * 2 + 1] = v * sourceHeight;
    }
    const edgeCounts = new Map<string, number>();
    for (let index = 0; index + 2 < triangles.length; index += 3) {
      const a = triangles[index]; const b = triangles[index + 1]; const c = triangles[index + 2];
      this.addEdgeCount(edgeCounts, a, b);
      this.addEdgeCount(edgeCounts, b, c);
      this.addEdgeCount(edgeCounts, c, a);
    }
    for (let index = 0; index + 2 < triangles.length; index += 3) {
      const a = triangles[index]; const b = triangles[index + 1]; const c = triangles[index + 2];
      if (a < 0 || b < 0 || c < 0 || a >= count || b >= count || c >= count) continue;
      const expandEdges = [
        (edgeCounts.get(this.edgeKey(a, b)) ?? 0) > 1,
        (edgeCounts.get(this.edgeKey(b, c)) ?? 0) > 1,
        (edgeCounts.get(this.edgeKey(c, a)) ?? 0) > 1
      ] as const;
      this.drawTriangle(image, positions, uvs, a, b, c, alpha, blendMode, expandEdges);
    }
  }

  private drawTriangle(
    image: HTMLImageElement | HTMLCanvasElement,
    positions: number[],
    uvs: number[],
    ai: number,
    bi: number,
    ci: number,
    alpha: number,
    blendMode: SpineSlotPose['blendMode'],
    expandEdges: readonly [boolean, boolean, boolean]
  ): void {
    const ax = positions[ai * 2]; const ay = positions[ai * 2 + 1];
    const bx = positions[bi * 2]; const by = positions[bi * 2 + 1];
    const cx = positions[ci * 2]; const cy = positions[ci * 2 + 1];
    const au = uvs[ai * 2]; const av = uvs[ai * 2 + 1];
    const bu = uvs[bi * 2]; const bv = uvs[bi * 2 + 1];
    const cu = uvs[ci * 2]; const cv = uvs[ci * 2 + 1];
    const det = (bu - au) * (cv - av) - (cu - au) * (bv - av);
    if (!Number.isFinite(det) || Math.abs(det) < 1e-8) return;
    const inverse = 1 / det;
    const dx1 = bx - ax; const dy1 = by - ay; const dx2 = cx - ax; const dy2 = cy - ay;
    const du1 = bu - au; const dv1 = bv - av; const du2 = cu - au; const dv2 = cv - av;
    const a = (dx1 * dv2 - dx2 * dv1) * inverse;
    const b = (dy1 * dv2 - dy2 * dv1) * inverse;
    const c = (dx2 * du1 - dx1 * du2) * inverse;
    const d = (dy2 * du1 - dy1 * du2) * inverse;
    const e = ax - a * au - c * av;
    const f = ay - b * au - d * av;
    const clipVertices = this.expandSharedEdges(
      [[ax, ay], [bx, by], [cx, cy]],
      expandEdges,
      0.15
    );
    this.context.save();
    this.context.globalAlpha *= alpha;
    this.context.globalCompositeOperation = blendMode === 'normal' ? 'source-over'
      : blendMode === 'additive' ? 'lighter' : blendMode;
    this.context.beginPath();
    this.context.moveTo(clipVertices[0][0], clipVertices[0][1]);
    this.context.lineTo(clipVertices[1][0], clipVertices[1][1]);
    this.context.lineTo(clipVertices[2][0], clipVertices[2][1]);
    this.context.closePath();
    this.context.clip();
    this.context.transform(a, b, c, d, e, f);
    this.context.drawImage(image, 0, 0);
    this.context.restore();
  }

  private addEdgeCount(edgeCounts: Map<string, number>, first: number, second: number): void {
    const key = this.edgeKey(first, second);
    edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
  }

  private edgeKey(first: number, second: number): string {
    return first < second ? `${first}:${second}` : `${second}:${first}`;
  }

  private expandSharedEdges(
    vertices: readonly [number, number][],
    expandEdges: readonly [boolean, boolean, boolean],
    amount: number
  ): [[number, number], [number, number], [number, number]] {
    const area = (vertices[1][0] - vertices[0][0]) * (vertices[2][1] - vertices[0][1])
      - (vertices[1][1] - vertices[0][1]) * (vertices[2][0] - vertices[0][0]);
    if (Math.abs(area) < 1e-6) return [vertices[0], vertices[1], vertices[2]];
    const orientation = area > 0 ? 1 : -1;
    const lines = vertices.map((start, index) => {
      const end = vertices[(index + 1) % 3];
      const dx = end[0] - start[0];
      const dy = end[1] - start[1];
      const length = Math.hypot(dx, dy) || 1;
      const offset = expandEdges[index] ? amount : 0;
      const normalX = orientation * dy / length * offset;
      const normalY = -orientation * dx / length * offset;
      return {
        x: start[0] + normalX,
        y: start[1] + normalY,
        dx,
        dy
      };
    });
    const intersect = (previous: typeof lines[number], next: typeof lines[number]): [number, number] => {
      const determinant = previous.dx * next.dy - previous.dy * next.dx;
      if (Math.abs(determinant) < 1e-6) return [previous.x, previous.y];
      const betweenX = next.x - previous.x;
      const betweenY = next.y - previous.y;
      const distance = (betweenX * next.dy - betweenY * next.dx) / determinant;
      return [previous.x + distance * previous.dx, previous.y + distance * previous.dy];
    };
    return [
      intersect(lines[2], lines[0]),
      intersect(lines[0], lines[1]),
      intersect(lines[1], lines[2])
    ];
  }

  private alpha(color: string): number {
    if (color.length === 6) return 1;
    if (color.length !== 8 || !/^[\da-f]{8}$/i.test(color)) return 1;
    return Number.parseInt(color.slice(6, 8), 16) / 255;
  }

  private multiplyColor(first: string, second: string): string {
    const normalize = (color: string): string => color.length === 6 ? `${color}FF` : color;
    const a = normalize(first);
    const b = normalize(second);
    if (!/^[\da-f]{8}$/i.test(a) || !/^[\da-f]{8}$/i.test(b)) return a;
    return [0, 2, 4, 6].map((offset) => {
      const value = Math.round(Number.parseInt(a.slice(offset, offset + 2), 16)
        * Number.parseInt(b.slice(offset, offset + 2), 16) / 255);
      return value.toString(16).padStart(2, '0');
    }).join('').toUpperCase();
  }

  private getTintedAtlas(image: HTMLImageElement, light: string, dark?: string): HTMLImageElement | HTMLCanvasElement {
    const normalizedLight = light.length === 6 ? `${light}FF` : light;
    const normalizedDark = dark?.length === 6 ? dark : undefined;
    if ((!normalizedDark || !/^[\da-f]{6}$/i.test(normalizedDark))
      && (!/^[\da-f]{8}$/i.test(normalizedLight) || normalizedLight.slice(0, 6).toUpperCase() === 'FFFFFF')) return image;
    const key = `${normalizedLight}:${normalizedDark ?? ''}`;
    let atlasCache = this.tintedAtlases.get(image);
    if (!atlasCache) {
      atlasCache = new Map<string, HTMLCanvasElement>();
      this.tintedAtlases.set(image, atlasCache);
    }
    const cached = atlasCache.get(key);
    if (cached) return cached;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return image;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = pixels.data;
      const lightChannels = [0, 2, 4].map((offset) => Number.parseInt(normalizedLight.slice(offset, offset + 2), 16));
      const darkChannels = normalizedDark
        ? [0, 2, 4].map((offset) => Number.parseInt(normalizedDark.slice(offset, offset + 2), 16))
        : [0, 0, 0];
      for (let index = 0; index < data.length; index += 4) {
        for (let channel = 0; channel < 3; channel++) {
          const source = data[index + channel];
          data[index + channel] = normalizedDark
            ? Math.round((source * lightChannels[channel] + (255 - source) * darkChannels[channel]) / 255)
            : Math.round(source * lightChannels[channel] / 255);
        }
      }
      context.putImageData(pixels, 0, 0);
      atlasCache.set(key, canvas);
      return canvas;
    } catch {
      // Cross-origin/tainted canvas pages retain their original texture and
      // still receive slot opacity and blend mode during normal rendering.
      return image;
    }
  }
}
