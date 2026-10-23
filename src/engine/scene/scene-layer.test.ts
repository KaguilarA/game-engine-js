import { describe, expect, it, vi } from 'vitest';
import { SceneLayer } from './scene-layer';

describe('SceneLayer', () => {
  it('updates and draws in ascending z order with stable insertion order', () => {
    const calls: string[] = [];
    const createRenderable = (name: string, zIndex: number) => ({
      zIndex,
      draw: (): void => { calls.push(name); },
      update: (_deltaSeconds: number): void => { calls.push(`update:${name}`); }
    });
    const first = createRenderable('first', 1);
    const lower = createRenderable('lower', -1);
    const sameOrder = createRenderable('same-order', 1);
    const layer = new SceneLayer();
    layer.add(first, (deltaSeconds) => first.update(deltaSeconds));
    layer.add(lower, (deltaSeconds) => lower.update(deltaSeconds));
    layer.add(sameOrder, (deltaSeconds) => sameOrder.update(deltaSeconds));

    layer.update(1 / 60);
    layer.draw();

    expect(calls).toEqual([
      'update:first', 'update:lower', 'update:same-order',
      'lower', 'first', 'same-order'
    ]);
  });

  it('supports replacement and removal without duplicating renderables', () => {
    const draw = vi.fn();
    const one = { draw };
    const two = { draw };
    const layer = new SceneLayer({ updateObjects: false });
    layer.setObjects([one, two, one]);
    layer.setObjects([two]);
    layer.draw();

    expect(layer.getObjects()).toEqual([two]);
    expect(layer.remove(one)).toBe(false);
    expect(layer.remove(two)).toBe(true);
    expect(draw).toHaveBeenCalledOnce();
  });

  it('skips invisible layers and can disable automatic object updates', () => {
    const update = vi.fn();
    const draw = vi.fn();
    const layer = new SceneLayer({ visible: false });
    layer.add({ draw }, update);
    layer.update(1 / 60);
    layer.draw();

    expect(update).not.toHaveBeenCalled();
    expect(draw).not.toHaveBeenCalled();
  });
});
