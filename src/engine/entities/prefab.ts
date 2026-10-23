import type { Entity, EntityOptions } from './entity';
import { signalValue } from 'reactive-values';
import type { SignalValue } from 'reactive-values';

/** Reusable entity factory that can be registered and instantiated by name. */
export class Prefab<T extends Entity = Entity> {
  private readonly factory: (overrides?: EntityOptions) => T;

  public constructor(factory: (overrides?: EntityOptions) => T) {
    this.factory = factory;
  }

  public instantiate(overrides?: EntityOptions): T {
    return this.factory(overrides);
  }
}

export class PrefabRegistry {
  private readonly prefabs: SignalValue<ReadonlyMap<string, Prefab>> = signalValue<ReadonlyMap<string, Prefab>>(
    new Map<string, Prefab>()
  );

  public register(name: string, prefab: Prefab): void {
    if (!name.trim()) throw new Error('Prefab name cannot be empty.');
    if (this.prefabs().has(name)) throw new Error(`Prefab "${name}" is already registered.`);
    this.prefabs.set(new Map(this.prefabs()).set(name, prefab));
  }

  public unregister(name: string): boolean {
    if (!this.prefabs().has(name)) return false;
    const updated = new Map(this.prefabs());
    updated.delete(name);
    this.prefabs.set(updated);
    return true;
  }

  public instantiate<T extends Entity = Entity>(name: string, overrides?: EntityOptions): T {
    const prefab = this.prefabs().get(name);
    if (!prefab) throw new Error(`Prefab "${name}" is not registered.`);
    return prefab.instantiate(overrides) as T;
  }

  public has(name: string): boolean {
    return this.prefabs().has(name);
  }
}
