import { signalValue } from 'reactive-values';
import type { SignalValue } from 'reactive-values';

import Dimensions from '../core/dimensions';
import GameEvents from '../input/events';
import type { ButtonOptions } from '../interfaces/button-options';
import type { GamePointer } from '../interfaces/game-pointer';
import type { TextureStateName } from '../interfaces/texture-states';
import { Texture } from '../rendering/texture';

/** Owns pointer hit-testing, activation, visual states, and teardown. */
export class Button {
  public readonly dimensions: Dimensions;
  public readonly state: SignalValue<TextureStateName> = signalValue<TextureStateName>('idle');
  private readonly texture: Texture;
  private readonly onClick: () => void;
  private readonly onPress: ((pointerId: number) => void) | undefined;
  private readonly onRelease: ((pointerId: number) => void) | undefined;
  private readonly removeListeners: Array<() => void>;
  private readonly shape: 'rectangle' | 'circle';
  private readonly hovered = signalValue(false);
  private readonly blocked = signalValue(false);
  private readonly disabled = signalValue(false);
  private readonly pressedPointer = signalValue<number | undefined>(undefined);
  private readonly pressActive = signalValue(false);
  private readonly pressOrigin = signalValue<{ x: number; y: number } | undefined>(undefined);
  private readonly pressMoved = signalValue(false);

  public constructor(texture: Texture, options: ButtonOptions) {
    this.texture = texture;
    this.onClick = options.onClick;
    this.onPress = options.onPress;
    this.onRelease = options.onRelease;
    this.shape = options.shape ?? 'rectangle';
    this.dimensions = texture.dimensions;
    const bounds = options.dimensions;
    if (bounds) {
      this.dimensions.setPosition(bounds.x, bounds.y);
      this.dimensions.setWidth(bounds.width);
      this.dimensions.setHeight(bounds.height);
      this.dimensions.setPivot(bounds.pivotX ?? this.dimensions.getPivotX(), bounds.pivotY ?? this.dimensions.getPivotY());
    }
    this.removeListeners = [
      GameEvents.addPointerDownListener(this.handlePointerDown),
      GameEvents.addPointerMoveListener(this.handlePointerMove),
      GameEvents.addPointerEndListener(this.handlePointerEnd)
    ];
  }

  public setBlocked(blocked: boolean): void {
    if (this.blocked() === blocked) return;
    this.blocked.set(blocked);
    if (blocked) this.cancelPress();
    this.syncState();
  }

  public setDisabled(disabled: boolean): void {
    if (this.disabled() === disabled) return;
    this.disabled.set(disabled);
    if (disabled) this.cancelPress();
    this.syncState();
  }

  public update(deltaSeconds: number): void { this.texture.update(deltaSeconds); }
  public draw(): void { this.texture.draw(); }
  public destroy(): void {
    this.cancelPress();
    this.removeListeners.forEach((remove) => remove());
  }

  private readonly handlePointerDown = (pointer: GamePointer): void => {
    this.hovered.set(this.contains(pointer));
    if (!this.hovered() || this.disabled() || this.blocked()) return;
    this.pressedPointer.set(pointer.id);
    this.pressOrigin.set({ x: pointer.x, y: pointer.y });
    this.pressMoved.set(false);
    this.pressActive.set(true);
    this.onPress?.(pointer.id);
    this.syncState();
  };

  private readonly handlePointerMove = (pointer: GamePointer): void => {
    if (this.pressedPointer() !== undefined && this.pressedPointer() !== pointer.id) return;
    const inside = this.contains(pointer);
    const origin = this.pressOrigin();
    if (this.pressedPointer() === pointer.id && origin !== undefined
      && Math.hypot(pointer.x - origin.x, pointer.y - origin.y) >= 6) {
      this.pressMoved.set(true);
    }
    const pressInside = inside && !this.pressMoved();
    this.hovered.set(inside);
    if (this.pressedPointer() === pointer.id && this.pressActive() !== pressInside) {
      this.pressActive.set(pressInside);
      if (pressInside) this.onPress?.(pointer.id);
      else this.onRelease?.(pointer.id);
    }
    this.syncState();
  };

  private readonly handlePointerEnd = (pointer: GamePointer): void => {
    if (this.pressedPointer() !== pointer.id) {
      this.hovered.set(this.contains(pointer));
      this.syncState();
      return;
    }
    const activate = this.contains(pointer) && !this.pressMoved() && !this.disabled() && !this.blocked();
    this.cancelPress();
    this.pressedPointer.set(undefined);
    this.hovered.set(this.contains(pointer));
    this.syncState();
    if (activate) this.onClick();
  };

  private contains(pointer: GamePointer): boolean {
    if (this.shape === 'circle') {
      const radiusX = this.dimensions.scaledWidth() / 2;
      const radiusY = this.dimensions.scaledHeight() / 2;
      if (radiusX <= 0 || radiusY <= 0) return false;
      const dx = (pointer.x - this.dimensions.getX()) / radiusX;
      const dy = (pointer.y - this.dimensions.getY()) / radiusY;
      return dx * dx + dy * dy <= 1;
    }
    return pointer.x >= this.dimensions.left() && pointer.x <= this.dimensions.right()
      && pointer.y >= this.dimensions.top() && pointer.y <= this.dimensions.bottom();
  }

  private cancelPress(): void {
    const pointerId = this.pressedPointer();
    if (pointerId !== undefined && this.pressActive()) this.onRelease?.(pointerId);
    this.pressActive.set(false);
    this.pressedPointer.set(undefined);
    this.pressOrigin.set(undefined);
    this.pressMoved.set(false);
  }

  private syncState(): void {
    const state: TextureStateName = this.disabled() ? 'disabled'
      : this.blocked() ? 'blocked'
        : this.hovered() ? 'hover' : 'idle';
    if (this.state() === state) return;
    this.state.set(state);
    this.texture.setState(state);
  }
}
