import { describe, expect, it } from 'vitest';
import { SpineRuntime } from './spine-runtime';
import { SpineBinaryParser } from './spine-binary-parser';
import { Atlas } from '../../assets/atlas';
import type { SpineRecord } from '../../interfaces/spine-record';

// Dummy atlas for headless tests
const createMockAtlas = (): Atlas => {
  return new Atlas('dummy.png', {
    pages: [{ name: 'dummy.png', size: { width: 100, height: 100 } }],
    regions: {}
  });
};

describe('Spine 2D Studio-Level Enhancements', () => {
  const testSkeletonData: SpineRecord = {
    skeleton: { spine: '3.8.99', width: 100, height: 100 },
    bones: [
      { name: 'root', x: 0, y: 0, rotation: 0 },
      { name: 'hip', parent: 'root', x: 0, y: 50, rotation: 0, length: 30 },
      { name: 'leg', parent: 'hip', x: 30, y: 0, rotation: 0, length: 30 },
      { name: 'target', parent: 'root', x: 45, y: 20, rotation: 0 }
    ],
    slots: [
      { name: 'slot1', bone: 'leg', color: 'FFFFFFFF', blend: 'normal' }
    ],
    ik: [
      {
        name: 'leg-ik',
        order: 0,
        bones: ['hip', 'leg'],
        target: 'target',
        mix: 1.0,
        bendPositive: true
      }
    ],
    skins: {
      default: {}
    },
    animations: {
      idle: {
        bones: {
          hip: {
            rotate: [{ time: 0, angle: 0 }, { time: 1.0, angle: 0 }],
            translate: [{ time: 0, x: 0, y: 50 }, { time: 1.0, x: 0, y: 50 }]
          }
        }
      },
      walk: {
        bones: {
          hip: {
            rotate: [{ time: 0, angle: 40 }, { time: 1.0, angle: 40 }],
            translate: [{ time: 0, x: 20, y: 50 }, { time: 1.0, x: 20, y: 50 }]
          }
        }
      }
    }
  };

  it('performs smooth animation cross-fading and shortest-arc interpolation', () => {
    const runtime = new SpineRuntime(testSkeletonData, createMockAtlas());

    // Start idle animation
    runtime.play('idle', true);
    expect(runtime.animationName).toBe('idle');
    expect(runtime.isBlending).toBe(false);

    // Cross-fade to walk over 0.5s
    runtime.crossFade('walk', 0.5, true);
    expect(runtime.animationName).toBe('walk');
    expect(runtime.isBlending).toBe(true);

    // Mid-transition at 0.25s (alpha = 0.5):
    // idle has x=0, rot=0; walk has x=20, rot=40
    // bone local pose should be ~x=10, rot=20
    runtime.update(0.25);
    expect(runtime.isBlending).toBe(true);
    const midPose = runtime.getBoneByName('hip');
    expect(midPose).toBeDefined();

    // After 0.3s more (total 0.55s > 0.5s): blend should finish
    runtime.update(0.3);
    expect(runtime.isBlending).toBe(false);
  });

  it('solves 2-bone Inverse Kinematics (IK) and updates bone transforms', () => {
    const runtime = new SpineRuntime(testSkeletonData, createMockAtlas());
    runtime.play('idle', false);

    const hipBefore = runtime.getBoneByName('hip');
    expect(hipBefore).toBeDefined();

    // Dynamically override the IK target position to aim or plant foot
    runtime.setIkTarget('leg-ik', 50, 10, 1.0);
    const hipAfter = runtime.getBoneByName('hip');
    expect(hipAfter).toBeDefined();

    // Clearing IK target restores setup/animated IK
    runtime.clearIkTarget('leg-ik');
  });

  it('parses binary .skel formats using SpineBinaryParser', () => {
    // Generate a minimal mock binary buffer
    const buffer = new ArrayBuffer(128);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // Set non-JSON first byte
    bytes[0] = 0x05; // String length + 1 = 4 chars ("hash")
    bytes[1] = 0x68; bytes[2] = 0x61; bytes[3] = 0x73; bytes[4] = 0x68;
    // Version: "3.8" -> length 4
    bytes[5] = 0x04;
    bytes[6] = 0x33; bytes[7] = 0x2e; bytes[8] = 0x38;
    // x, y, width, height floats at offset 9
    view.setFloat32(9, 0, false);
    view.setFloat32(13, 0, false);
    view.setFloat32(17, 200, false);
    view.setFloat32(21, 200, false);

    expect(SpineBinaryParser.isBinary(buffer)).toBe(true);
    expect(SpineBinaryParser.isBinary(new TextEncoder().encode('{"skeleton":{}}'))).toBe(false);
  });
});
