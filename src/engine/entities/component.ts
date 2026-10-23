import type { Entity } from './entity';
import { signalValue } from 'reactive-values';
import type { SignalValue } from 'reactive-values';

/** Reusable behavior that can be attached to an Entity. */
export abstract class Component {
  public readonly enabled: SignalValue<boolean> = signalValue(true);
  private readonly attachedEntity: SignalValue<Entity | undefined> = signalValue<Entity | undefined>(undefined);

  public get entity(): Entity | undefined {
    return this.attachedEntity();
  }

  public update(_deltaSeconds: number): void {}
  public draw(): void {}

  public attachTo(entity: Entity): void {
    const current = this.attachedEntity();
    if (current && current !== entity) {
      throw new Error('A Component can only be attached to one Entity at a time.');
    }
    if (current === entity) return;
    this.attachedEntity.set(entity);
    this.onAttach();
  }

  public detach(): void {
    if (!this.attachedEntity()) return;
    this.onDetach();
    this.attachedEntity.set(undefined);
  }

  protected onAttach(): void {}
  protected onDetach(): void {}
}

export type ComponentConstructor<T extends Component> = Function & { prototype: T };
