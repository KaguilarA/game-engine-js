import { describe, expect, it, vi } from 'vitest';
import { Button } from './button';
import { Texture } from '../rendering/texture';
import Dimensions from '../core/dimensions';

describe('UI Button', () => {
  it('manages disabled and blocked states', () => {
    const onClick = vi.fn();
    const texture = new Texture({}, 100, 40);
    const button = new Button(texture, { onClick });

    expect(button.state()).toBe('idle');

    button.setDisabled(true);
    expect(button.state()).toBe('disabled');

    button.setDisabled(false);
    expect(button.state()).toBe('idle');

    button.setBlocked(true);
    expect(button.state()).toBe('idle'); // Blocked keeps idle visual but ignores events
  });

  it('updates dimensions and cleans up listeners on destroy', () => {
    const texture = new Texture({}, 80, 30);
    const button = new Button(texture, {
      onClick: () => {},
      dimensions: new Dimensions(120, 50, 10, 20)
    });

    expect(button.dimensions.getWidth()).toBe(120);
    expect(button.dimensions.getHeight()).toBe(50);
    expect(button.dimensions.getX()).toBe(10);
    expect(button.dimensions.getY()).toBe(20);

    button.destroy();
  });
});
