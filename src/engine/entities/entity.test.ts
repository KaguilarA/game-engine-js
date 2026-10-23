import { describe, expect, it, vi } from 'vitest';
import { Component } from './component';
import { Entity } from './entity';
import { Prefab, PrefabRegistry } from './prefab';
import { TransformComponent } from './transform-component';

class CounterComponent extends Component {
  public updates = 0;
  public draws = 0;
  public detached = false;

  public override update(): void { this.updates++; }
  public override draw(): void { this.draws++; }
  protected override onDetach(): void { this.detached = true; }
}

describe('Entity components and prefabs', () => {
  it('owns a transform and updates and draws only enabled components', () => {
    const entity = new Entity({ name: 'hero', x: 12, y: 18, width: 24, height: 32 });
    const component = entity.addComponent(new CounterComponent());

    entity.update(1 / 60);
    entity.draw();
    component.enabled.set(false);
    entity.update(1 / 60);
    entity.draw();

    expect(entity.name).toBe('hero');
    expect(entity.getComponent(CounterComponent)).toBe(component);
    expect(entity.getComponent(TransformComponent)).toBe(entity.transform);
    expect([entity.dimensions.getX(), entity.dimensions.getY()]).toEqual([12, 18]);
    expect(component.updates).toBe(1);
    expect(component.draws).toBe(1);
  });

  it('detaches components when removed or the entity is destroyed', () => {
    const entity = new Entity();
    const first = entity.addComponent(new CounterComponent());
    const second = entity.addComponent(new CounterComponent());

    expect(entity.removeComponent(first)).toBe(true);
    entity.destroy();

    expect(first.detached).toBe(true);
    expect(second.detached).toBe(true);
    expect(entity.active()).toBe(false);
  });

  it('instantiates registered prefabs with caller supplied transform values', () => {
    const registry = new PrefabRegistry();
    const create = vi.fn((overrides) => new Entity({ name: 'enemy', width: 16, height: 16, ...overrides }));
    registry.register('enemy', new Prefab(create));

    const enemy = registry.instantiate('enemy', { x: 40, y: 72 });

    expect(enemy.name).toBe('enemy');
    expect([enemy.dimensions.getX(), enemy.dimensions.getY()]).toEqual([40, 72]);
    expect(create).toHaveBeenCalledOnce();
  });
});
