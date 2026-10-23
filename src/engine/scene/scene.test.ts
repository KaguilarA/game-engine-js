import { describe, expect, it } from 'vitest';
import { Camera2D } from './camera2d';
import { SceneLayer } from './scene-layer';
import { WorldScene } from './world-scene';
import Dimensions from '../core/dimensions';

describe('Scene Graph & Camera2D', () => {
  it('converts world coordinates to screen and back', () => {
    const camera = new Camera2D({
      x: 100,
      y: 200,
      zoom: 2,
      viewportWidth: 800,
      viewportHeight: 600
    });

    const screenPos = camera.worldToScreen(100, 200);
    // Looking at (100, 200) should project to screen center (400, 300)
    expect(screenPos.x).toBe(400);
    expect(screenPos.y).toBe(300);

    const worldPos = camera.screenToWorld(400, 300);
    expect(worldPos.x).toBe(100);
    expect(worldPos.y).toBe(200);
  });

  it('smoothly follows a target Dimensions model', () => {
    const camera = new Camera2D({ x: 0, y: 0, smoothing: 1 });
    const target = new Dimensions(32, 32, 100, 200);

    camera.follow(target, 1);
    camera.update(1 / 60);

    expect(camera.x()).toBe(100);
    expect(camera.y()).toBe(200);

    camera.stopFollowing();
    target.setPosition(500, 500);
    camera.update(1 / 60);
    expect(camera.x()).toBe(100);
  });

  it('manages SceneLayer objects and sorting order', () => {
    const layer = new SceneLayer({ name: 'Entities', order: 1 });
    let updated = false;

    const dummy = {
      draw: () => {},
      zIndex: 5
    };

    layer.add(dummy, () => { updated = true; });
    expect(layer.getObjects().length).toBe(1);

    layer.update(1 / 60);
    expect(updated).toBe(true);

    expect(layer.remove(dummy)).toBe(true);
    expect(layer.getObjects().length).toBe(0);
  });

  it('coordinates layers in a WorldScene by layer order', () => {
    const scene = new WorldScene();
    const bgLayer = new SceneLayer({ name: 'Background', order: -1 });
    const fgLayer = new SceneLayer({ name: 'Foreground', order: 10 });

    scene.addLayer(fgLayer);
    scene.addLayer(bgLayer);

    expect(scene.getLayers().length).toBe(2);
    expect(scene.removeLayer(bgLayer)).toBe(true);
    expect(scene.getLayers().length).toBe(1);
  });
});
