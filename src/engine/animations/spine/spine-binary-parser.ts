import type { SpineRecord } from '../../interfaces';

/**
 * Low-level binary stream reader for Spine .skel data.
 */
class BinaryReader {
  private readonly data: Uint8Array;
  private readonly view: DataView;
  private offset = 0;
  private strings: string[] = [];

  public constructor(buffer: ArrayBuffer | Uint8Array) {
    if (buffer instanceof Uint8Array) {
      this.data = buffer;
      this.view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    } else {
      this.data = new Uint8Array(buffer);
      this.view = new DataView(buffer);
    }
  }

  public get remaining(): number {
    return this.data.length - this.offset;
  }

  public readByte(): number {
    return this.data[this.offset++];
  }

  public readSByte(): number {
    const val = this.data[this.offset++];
    return val > 127 ? val - 256 : val;
  }

  public readBoolean(): boolean {
    return this.readByte() !== 0;
  }

  public readFloat(): number {
    const val = this.view.getFloat32(this.offset, false);
    this.offset += 4;
    return val;
  }

  public readInt(): number {
    const val = this.view.getInt32(this.offset, false);
    this.offset += 4;
    return val;
  }

  public readVarInt(optimizePositive = true): number {
    let b = this.readByte();
    let result = b & 0x7f;
    if ((b & 0x80) !== 0) {
      b = this.readByte();
      result |= (b & 0x7f) << 7;
      if ((b & 0x80) !== 0) {
        b = this.readByte();
        result |= (b & 0x7f) << 14;
        if ((b & 0x80) !== 0) {
          b = this.readByte();
          result |= (b & 0x7f) << 21;
          if ((b & 0x80) !== 0) {
            b = this.readByte();
            result |= (b & 0x7f) << 28;
          }
        }
      }
    }
    return optimizePositive ? result : (result >>> 1) ^ -(result & 1);
  }

  public readString(): string | undefined {
    let length = this.readVarInt(true);
    if (length === 0) return undefined;
    length--; // 1 = empty string ""
    if (length === 0) return '';

    const bytes = this.data.subarray(this.offset, this.offset + length);
    this.offset += length;
    return new TextDecoder('utf-8').decode(bytes);
  }

  public readStringRef(): string | undefined {
    if (this.strings.length === 0) {
      return this.readString();
    }
    const index = this.readVarInt(true);
    return index === 0 ? undefined : this.strings[index - 1];
  }

  public setStrings(strings: string[]): void {
    this.strings = strings;
  }

  public readColorHex(): string {
    const r = this.readByte().toString(16).padStart(2, '0');
    const g = this.readByte().toString(16).padStart(2, '0');
    const b = this.readByte().toString(16).padStart(2, '0');
    const a = this.readByte().toString(16).padStart(2, '0');
    return `${r}${g}${b}${a}`.toUpperCase();
  }
}

/**
 * Native parser for Spine .skel binary exports (Spine 3.8 and 4.x).
 * @class SpineBinaryParser
 */
export class SpineBinaryParser {
  /**
   * Determines whether the provided buffer contains Spine binary skeleton data.
   * @public
   * @return {boolean}
   */
  public static isBinary(buffer: ArrayBuffer | Uint8Array): boolean {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.length < 8) return false;
    return bytes[0] !== 0x7b;
  }

  /**
   * Parses a Spine binary buffer into normalized skeleton data.
   * @public
   * @return {SpineRecord}
   */
  public static parse(buffer: ArrayBuffer | Uint8Array): SpineRecord {
    const reader = new BinaryReader(buffer);

    // 1. Skeleton Header
    const hash = reader.readString() ?? '';
    const version = reader.readString() ?? '3.8.0';
    const x = reader.readFloat();
    const y = reader.readFloat();
    const width = reader.readFloat();
    const height = reader.readFloat();

    const isSpine4 = version.startsWith('4.');
    const fps = isSpine4 ? reader.readFloat() : 30;
    const images = reader.readString();
    const audio = isSpine4 ? reader.readString() : undefined;

    // Optional string table for Spine 4.0+
    if (isSpine4 && reader.remaining > 0) {
      const stringCount = reader.readVarInt(true);
      const strings: string[] = [];
      for (let i = 0; i < stringCount; i++) {
        strings.push(reader.readString() ?? '');
      }
      reader.setStrings(strings);
    }

    // 2. Bones
    const boneCount = reader.readVarInt(true);
    const bones: SpineRecord[] = [];
    const boneNames: string[] = [];

    for (let i = 0; i < boneCount; i++) {
      const name = reader.readStringRef() ?? `bone-${i}`;
      boneNames.push(name);
      const parentIndex = i === 0 ? -1 : reader.readVarInt(true) - 1;
      const rotation = reader.readFloat();
      const boneX = reader.readFloat();
      const boneY = reader.readFloat();
      const scaleX = reader.readFloat();
      const scaleY = reader.readFloat();
      const shearX = reader.readFloat();
      const shearY = reader.readFloat();
      const length = reader.readFloat();
      const transformMode = reader.readVarInt(true);
      const skinRequired = isSpine4 ? reader.readBoolean() : false;
      const color = reader.readColorHex();

      bones.push({
        name,
        parent: parentIndex >= 0 ? boneNames[parentIndex] : undefined,
        rotation,
        x: boneX,
        y: boneY,
        scaleX,
        scaleY,
        shearX,
        shearY,
        length,
        transformMode,
        skinRequired,
        color
      });
    }

    // 3. Slots
    const slotCount = reader.readVarInt(true);
    const slots: SpineRecord[] = [];
    const slotNames: string[] = [];

    for (let i = 0; i < slotCount; i++) {
      const name = reader.readStringRef() ?? `slot-${i}`;
      slotNames.push(name);
      const boneIndex = reader.readVarInt(true);
      const color = reader.readColorHex();
      const dark = reader.readColorHex();
      const attachment = reader.readStringRef() ?? undefined;
      const blendModeIndex = reader.readVarInt(true);
      const blendModes = ['normal', 'additive', 'multiply', 'screen'];
      const blend = blendModes[blendModeIndex] ?? 'normal';

      slots.push({
        name,
        bone: boneNames[boneIndex],
        color,
        dark: dark === '000000FF' ? undefined : dark,
        attachment,
        blend
      });
    }

    // 4. IK Constraints
    const ikCount = reader.readVarInt(true);
    const ik: SpineRecord[] = [];

    for (let i = 0; i < ikCount; i++) {
      const name = reader.readStringRef() ?? `ik-${i}`;
      const order = reader.readVarInt(true);
      const skinRequired = isSpine4 ? reader.readBoolean() : false;
      const ikBoneCount = reader.readVarInt(true);
      const constrainedBones: string[] = [];
      for (let b = 0; b < ikBoneCount; b++) {
        constrainedBones.push(boneNames[reader.readVarInt(true)]);
      }
      const targetBone = boneNames[reader.readVarInt(true)];
      const mix = reader.readFloat();
      const softness = reader.readFloat();
      const bendPositive = reader.readSByte() > 0;
      const compress = reader.readBoolean();
      const stretch = reader.readBoolean();

      ik.push({
        name,
        order,
        skinRequired,
        bones: constrainedBones,
        target: targetBone,
        mix,
        softness,
        bendPositive,
        compress,
        stretch
      });
    }

    // 5. Transform Constraints
    const transformConstraintCount = reader.readVarInt(true);
    for (let i = 0; i < transformConstraintCount; i++) {
      reader.readStringRef(); // name
      reader.readVarInt(true); // order
      if (isSpine4) reader.readBoolean();
      const count = reader.readVarInt(true);
      for (let c = 0; c < count; c++) reader.readVarInt(true);
      reader.readVarInt(true); // target
      reader.readFloat(); // mixRotate
      reader.readFloat(); // mixX
      reader.readFloat(); // mixY
      reader.readFloat(); // mixScaleX
      reader.readFloat(); // mixScaleY
      reader.readFloat(); // mixShearY
    }

    // 6. Path Constraints
    const pathConstraintCount = reader.readVarInt(true);
    for (let i = 0; i < pathConstraintCount; i++) {
      reader.readStringRef(); // name
      reader.readVarInt(true); // order
      if (isSpine4) reader.readBoolean();
      const count = reader.readVarInt(true);
      for (let c = 0; c < count; c++) reader.readVarInt(true);
      reader.readVarInt(true); // target slot
      reader.readVarInt(true); // positionMode
      reader.readVarInt(true); // spacingMode
      reader.readVarInt(true); // rotateMode
      reader.readFloat(); // offsetRotation
      reader.readFloat(); // position
      reader.readFloat(); // spacing
      reader.readFloat(); // mixRotate
      reader.readFloat(); // mixX
      reader.readFloat(); // mixY
    }

    // 7. Skins
    const skins: Record<string, Record<string, Record<string, SpineRecord>>> = {};
    const defaultSkin = this.readSkin(reader, isSpine4, slotNames);
    if (defaultSkin) skins.default = defaultSkin;

    const skinCount = reader.readVarInt(true);
    for (let i = 0; i < skinCount; i++) {
      const skinName = reader.readStringRef() ?? `skin-${i}`;
      const skin = this.readSkin(reader, isSpine4, slotNames);
      if (skin) skins[skinName] = skin;
    }

    // 8. Events
    const eventCount = reader.readVarInt(true);
    const events: Record<string, SpineRecord> = {};
    for (let i = 0; i < eventCount; i++) {
      const eventName = reader.readStringRef() ?? `event-${i}`;
      const intVal = reader.readVarInt(false);
      const floatVal = reader.readFloat();
      const strVal = reader.readString() ?? '';
      const audioPath = reader.readString();
      const volume = audioPath ? reader.readFloat() : 1;
      const balance = audioPath ? reader.readFloat() : 0;

      events[eventName] = {
        name: eventName,
        int: intVal,
        float: floatVal,
        string: strVal,
        audio: audioPath,
        volume,
        balance
      };
    }

    // 9. Animations
    const animationCount = reader.readVarInt(true);
    const animations: Record<string, SpineRecord> = {};

    for (let i = 0; i < animationCount; i++) {
      const animName = reader.readStringRef() ?? `animation-${i}`;
      const anim = this.readAnimation(reader, isSpine4, boneNames, slotNames);
      animations[animName] = anim;
    }

    return {
      skeleton: {
        hash,
        spine: version,
        x,
        y,
        width,
        height,
        fps,
        images,
        audio
      },
      bones,
      slots,
      ik,
      skins,
      events,
      animations
    };
  }

  private static readSkin(
    reader: BinaryReader,
    _isSpine4: boolean,
    slotNames: string[]
  ): Record<string, Record<string, SpineRecord>> | undefined {
    if (reader.remaining === 0) return undefined;
    const slotCount = reader.readVarInt(true);
    if (slotCount === 0) return {};

    const skinData: Record<string, Record<string, SpineRecord>> = {};

    for (let s = 0; s < slotCount; s++) {
      const slotIndex = reader.readVarInt(true);
      const slotName = slotNames[slotIndex];
      const attachmentCount = reader.readVarInt(true);
      const attachments: Record<string, SpineRecord> = {};

      for (let a = 0; a < attachmentCount; a++) {
        const placeholderName = reader.readStringRef() ?? `att-${a}`;
        const name = reader.readStringRef() ?? placeholderName;
        const typeIndex = reader.readByte();
        // 0=region, 1=boundingbox, 2=mesh, 3=linkedmesh, 4=path, 5=point, 6=clipping
        if (typeIndex === 0) {
          // Region Attachment
          const path = reader.readStringRef() ?? name;
          const rotation = reader.readFloat();
          const x = reader.readFloat();
          const y = reader.readFloat();
          const scaleX = reader.readFloat();
          const scaleY = reader.readFloat();
          const width = reader.readFloat();
          const height = reader.readFloat();
          const color = reader.readColorHex();

          attachments[placeholderName] = {
            type: 'region',
            name,
            path,
            rotation,
            x,
            y,
            scaleX,
            scaleY,
            width,
            height,
            color
          };
        } else if (typeIndex === 2) {
          // Mesh Attachment
          const path = reader.readStringRef() ?? name;
          const color = reader.readColorHex();
          const vertexCount = reader.readVarInt(true);
          const uvs: number[] = [];
          for (let u = 0; u < vertexCount * 2; u++) uvs.push(reader.readFloat());
          const triangleCount = reader.readVarInt(true);
          const triangles: number[] = [];
          for (let t = 0; t < triangleCount; t++) triangles.push(reader.readVarInt(true));

          const vertices: number[] = [];
          for (let v = 0; v < vertexCount * 2; v++) vertices.push(reader.readFloat());
          const hull = reader.readVarInt(true);

          attachments[placeholderName] = {
            type: 'mesh',
            name,
            path,
            color,
            uvs,
            triangles,
            vertices,
            hull
          };
        } else {
          // Other attachment types
          attachments[placeholderName] = { name, type: 'attachment' };
        }
      }

      skinData[slotName] = attachments;
    }

    return skinData;
  }

  private static readAnimation(
    reader: BinaryReader,
    _isSpine4: boolean,
    boneNames: string[],
    slotNames: string[]
  ): SpineRecord {
    const anim: SpineRecord = {
      bones: {},
      slots: {},
      ik: {},
      events: []
    };

    if (reader.remaining === 0) return anim;

    // Slot timelines
    const slotTimelineCount = reader.readVarInt(true);
    for (let s = 0; s < slotTimelineCount; s++) {
      const slotIndex = reader.readVarInt(true);
      const slotName = slotNames[slotIndex];
      const timelineCount = reader.readVarInt(true);
      const slotAnim: SpineRecord = {};

      for (let t = 0; t < timelineCount; t++) {
        const timelineType = reader.readByte();
        const frameCount = reader.readVarInt(true);

        if (timelineType === 0) {
          // Attachment timeline
          const frames: SpineRecord[] = [];
          for (let f = 0; f < frameCount; f++) {
            frames.push({
              time: reader.readFloat(),
              name: reader.readStringRef() ?? null
            });
          }
          slotAnim.attachment = frames;
        } else if (timelineType === 1) {
          // Color timeline
          const frames: SpineRecord[] = [];
          for (let f = 0; f < frameCount; f++) {
            frames.push({
              time: reader.readFloat(),
              color: reader.readColorHex()
            });
          }
          slotAnim.color = frames;
        }
      }
      anim.slots[slotName] = slotAnim;
    }

    // Bone timelines
    const boneTimelineCount = reader.readVarInt(true);
    for (let b = 0; b < boneTimelineCount; b++) {
      const boneIndex = reader.readVarInt(true);
      const boneName = boneNames[boneIndex];
      const timelineCount = reader.readVarInt(true);
      const boneAnim: SpineRecord = {};

      for (let t = 0; t < timelineCount; t++) {
        const timelineType = reader.readByte();
        const frameCount = reader.readVarInt(true);

        if (timelineType === 0) {
          // Rotate timeline
          const frames: SpineRecord[] = [];
          for (let f = 0; f < frameCount; f++) {
            frames.push({
              time: reader.readFloat(),
              angle: reader.readFloat()
            });
          }
          boneAnim.rotate = frames;
        } else if (timelineType === 1) {
          // Translate timeline
          const frames: SpineRecord[] = [];
          for (let f = 0; f < frameCount; f++) {
            frames.push({
              time: reader.readFloat(),
              x: reader.readFloat(),
              y: reader.readFloat()
            });
          }
          boneAnim.translate = frames;
        } else if (timelineType === 2) {
          // Scale timeline
          const frames: SpineRecord[] = [];
          for (let f = 0; f < frameCount; f++) {
            frames.push({
              time: reader.readFloat(),
              x: reader.readFloat(),
              y: reader.readFloat()
            });
          }
          boneAnim.scale = frames;
        } else if (timelineType === 3) {
          // Shear timeline
          const frames: SpineRecord[] = [];
          for (let f = 0; f < frameCount; f++) {
            frames.push({
              time: reader.readFloat(),
              x: reader.readFloat(),
              y: reader.readFloat()
            });
          }
          boneAnim.shear = frames;
        }
      }
      anim.bones[boneName] = boneAnim;
    }

    return anim;
  }
}
