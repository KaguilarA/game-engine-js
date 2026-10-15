import GameContext from './context';
import type { GamePointer } from './context';
import CanvasIcon from './canvas-icon';
import GameEvents from './events';
import chevronDownSvg from 'lucide-static/icons/chevron-down.svg?raw';
import chevronLeftSvg from 'lucide-static/icons/chevron-left.svg?raw';
import chevronRightSvg from 'lucide-static/icons/chevron-right.svg?raw';
import chevronUpSvg from 'lucide-static/icons/chevron-up.svg?raw';
import crosshairSvg from 'lucide-static/icons/crosshair.svg?raw';

export interface TouchControlCircle {
  x: number;
  y: number;
  radius: number;
}

export interface TouchControlsLayout {
  left: TouchControlCircle;
  right: TouchControlCircle;
  up: TouchControlCircle;
  down: TouchControlCircle;
  shoot: TouchControlCircle;
  reservedBottom: number;
}

/** Shared directional and fire controls for touch capable phones and tablets. */
export class TouchControls {
  private readonly icons = {
    left: new CanvasIcon(chevronLeftSvg),
    right: new CanvasIcon(chevronRightSvg),
    up: new CanvasIcon(chevronUpSvg),
    down: new CanvasIcon(chevronDownSvg),
    shoot: new CanvasIcon(crosshairSvg)
  };
  private readonly removeListeners: Array<() => void>;
  private readonly activePointers = new Set<number>();
  private readonly showVerticalControls: boolean;
  private extraKeys: Array<[TouchControlCircle, string]> = [];

  public constructor(options: { showVerticalControls?: boolean } = {}) {
    this.showVerticalControls = options.showVerticalControls ?? true;
    this.removeListeners = [
      GameContext.addPointerStartListener(this.handlePointer),
      GameContext.addPointerMoveListener(this.handlePointer),
      GameContext.addPointerEndListener(this.handlePointerEnd)
    ];
  }

  public get layout(): TouchControlsLayout {
    const dimensions = GameContext.gameDimensionsModel;
    const unit = GameContext.viewportUnit();
    const radius = Math.max(22, Math.min(unit * 0.07, dimensions.getWidth() * 0.085, 42));
    const margin = Math.max(14, Math.min(dimensions.getWidth() * 0.035, 28));
    const gap = Math.max(14, Math.min(unit * 0.03, 24));
    const y = dimensions.getHeight() - radius - gap;
    const left: TouchControlCircle = { x: margin + radius, y, radius };
    const right: TouchControlCircle = { x: dimensions.getWidth() - margin - radius, y, radius };
    const up: TouchControlCircle = { x: dimensions.getWidth() * 0.5 - radius * 1.15, y: y - radius * 1.75, radius };
    const down: TouchControlCircle = { x: dimensions.getWidth() * 0.5 + radius * 1.15, y: y - radius * 1.75, radius };
    const shoot: TouchControlCircle = { x: dimensions.getWidth() * 0.5, y, radius };
    const visibleControls = [left, right, shoot];
    if (this.showVerticalControls) visibleControls.push(up, down);
    const top = Math.min(...visibleControls.map((control) => control.y - control.radius));

    return { left, right, up, down, shoot, reservedBottom: dimensions.getHeight() - top + 24 };
  }

  public draw(): void {
    if (!GameContext.isMobileDevice) return;
    const layout = this.layout;
    this.drawButton(layout.left, this.icons.left);
    this.drawButton(layout.right, this.icons.right);
    if (this.showVerticalControls) {
      this.drawButton(layout.up, this.icons.up);
      this.drawButton(layout.down, this.icons.down);
    }
    this.drawButton(layout.shoot, this.icons.shoot, 'rgba(156, 62, 69, 0.68)');
  }

  public drawExtra(circle: TouchControlCircle, icon: CanvasIcon, color: string): void {
    if (!GameContext.isMobileDevice) return;
    this.drawButton(circle, icon, `${color}aa`);
  }

  public setExtraKeys(entries: Array<[TouchControlCircle, string]>): void {
    this.extraKeys = entries;
  }

  public dispose(): void {
    this.removeListeners.forEach((remove) => remove());
    this.activePointers.forEach((pointerId) => GameEvents.setPointerKey(pointerId, undefined));
    this.activePointers.clear();
  }

  private drawButton(circle: TouchControlCircle, icon: CanvasIcon, color = 'rgba(56, 103, 214, 0.66)'): void {
    const inset1 = Math.max(2, Math.round(circle.radius * 0.16));
    const inset2 = Math.max(4, Math.round(circle.radius * 0.4));
    GameContext.drawCircle(circle.x, circle.y, circle.radius, 'rgba(9, 14, 38, 0.78)');
    GameContext.drawCircle(circle.x, circle.y, Math.max(1, circle.radius - inset1), color);
    GameContext.drawCircle(circle.x, circle.y, Math.max(1, circle.radius - inset2), 'rgba(19, 31, 76, 0.42)');
    GameContext.drawCircle(circle.x - circle.radius * 0.28, circle.y - circle.radius * 0.28, Math.max(1, circle.radius * 0.16), 'rgba(255, 255, 255, 0.35)');
    icon.draw(circle.x - circle.radius * 0.525, circle.y - circle.radius * 0.525, circle.radius * 1.05);
  }

  private readonly handlePointer = (pointer: GamePointer): void => {
    if (!GameContext.isMobileDevice) return;
    this.activePointers.add(pointer.id);
    const { left, right, up, down, shoot } = this.layout;
    const entries: Array<[TouchControlCircle, string]> = [
      [left, 'ArrowLeft'], [right, 'ArrowRight'], [shoot, ' '],
      ...this.extraKeys
    ];
    if (this.showVerticalControls) {
      entries.push([up, 'ArrowUp'], [down, 'ArrowDown']);
    }
    const hit = entries.find(([circle]) => this.contains(circle, pointer.x, pointer.y));
    GameEvents.setPointerKey(pointer.id, hit?.[1]);
  };

  private readonly handlePointerEnd = (pointer: GamePointer): void => {
    GameEvents.setPointerKey(pointer.id, undefined);
    this.activePointers.delete(pointer.id);
  };

  private contains(circle: TouchControlCircle, x: number, y: number): boolean {
    const dx = x - circle.x;
    const dy = y - circle.y;
    return dx * dx + dy * dy <= circle.radius ** 2;
  }
}
