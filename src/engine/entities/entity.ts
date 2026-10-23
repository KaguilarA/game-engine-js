import Dimensions from '../core/dimensions';
import type { Renderable } from '../interfaces/renderable';
import { Component, type ComponentConstructor } from './component';
import { TransformComponent, type TransformOptions } from './transform-component';
import { signalValue } from 'reactive-values';
import type { SignalValue } from 'reactive-values';

export interface EntityOptions extends TransformOptions {
  name?: string;
  zIndex?: number;
}

/** Component container with a built-in transform, update and render lifecycle. */
export class Entity implements Renderable {
  public readonly id: number;
  public readonly name: string;
  public readonly transform: TransformComponent;
  public readonly zIndex: SignalValue<number>;
  public readonly active: SignalValue<boolean> = signalValue(true);
  private static nextId = 1;
  private readonly components: SignalValue<readonly Component[]> = signalValue<readonly Component[]>([]);

  public constructor(options: EntityOptions = {}) {
    this.id = Entity.nextId++;
    this.name = options.name ?? `Entity-${this.id}`;
    this.zIndex = signalValue(options.zIndex ?? 0);
    this.transform = new TransformComponent(options);
    this.addComponent(this.transform);
  }

  public get dimensions(): Dimensions {
    return this.transform.dimensions;
  }

  public addComponent<T extends Component>(component: T): T {
    if (this.components().includes(component)) return component;
    component.attachTo(this);
    this.components.set([...this.components(), component]);
    return component;
  }

  public removeComponent(component: Component): boolean {
    const components = this.components();
    const index = components.indexOf(component);
    if (index < 0) return false;
    this.components.set(components.filter((candidate) => candidate !== component));
    component.detach();
    return true;
  }

  public getComponent<T extends Component>(type: ComponentConstructor<T>): T | undefined {
    return this.components().find((component) => component instanceof type) as T | undefined;
  }

  public getComponents(): readonly Component[] {
    return this.components();
  }

  public update(deltaSeconds: number): void {
    if (!this.active) return;
    for (const component of this.components()) {
      if (component.enabled()) component.update(deltaSeconds);
    }
  }

  public draw(): void {
    if (!this.active) return;
    for (const component of this.components()) {
      if (component.enabled()) component.draw();
    }
  }

  public destroy(): void {
    this.active.set(false);
    const components = this.components();
    this.components.set([]);
    for (const component of components) component.detach();
  }
}
