import { describe, expect, it } from 'vitest';
import { Texture } from './texture';

describe('Rendering Texture', () => {
  it('manages visual state names and dimensions', () => {
    const texture = new Texture({}, 64, 64, 10, 20);

    expect(texture.stateName).toBe('idle');
    expect(texture.dimensions.getWidth()).toBe(64);
    expect(texture.dimensions.getHeight()).toBe(64);

    texture.setState('disabled');
    expect(texture.stateName).toBe('disabled');

    texture.setState('hover');
    expect(texture.stateName).toBe('hover');
  });
});
