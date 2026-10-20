import GameContext from '../core/context';
import type { GamePointer } from '../interfaces/game-pointer';
import type { TouchControlCircle } from '../interfaces/touch-control-circle';
import type { TouchControlsLayout } from '../interfaces/touch-controls-layout';
import CanvasIcon from '../rendering/canvas-icon';
import GameEvents from './events';
import chevronDownSvg from 'lucide-static/icons/chevron-down.svg?raw';
import chevronLeftSvg from 'lucide-static/icons/chevron-left.svg?raw';
import chevronRightSvg from 'lucide-static/icons/chevron-right.svg?raw';
import chevronUpSvg from 'lucide-static/icons/chevron-up.svg?raw';
import crosshairSvg from 'lucide-static/icons/crosshair.svg?raw';

/**
 * Shared directional and fire controls for touch capable phones and tablets.
 * @class TouchControls
 */
export class TouchControls {
  /**
   * SVG icons used to draw the four movement directions and fire control.
   * @property {Record<'left' | 'right' | 'up' | 'down' | 'shoot', CanvasIcon>} icons
   * @private
   * @readonly
   */
  private readonly icons = {
    left: new CanvasIcon(chevronLeftSvg),
    right: new CanvasIcon(chevronRightSvg),
    up: new CanvasIcon(chevronUpSvg),
    down: new CanvasIcon(chevronDownSvg),
    shoot: new CanvasIcon(crosshairSvg)
  };
  private readonly removeListeners: Array<() => void>;
  /**
   * Stores the active pointers state.
   * @property {Set<number>} activePointers
   * @private
   * @readonly
   */
  private readonly activePointers = new Set<number>();
  /**
   * Stores the show vertical controls state.
   * @property {boolean} showVerticalControls
   * @private
   * @readonly
   */
  private readonly showVerticalControls: boolean;
  /**
   * Stores the extra keys state.
   * @property {Array<[TouchControlCircle, string]>} extraKeys
   * @private
   */
  private extraKeys: Array<[TouchControlCircle, string]> = [];

  /**
   * Registers touch listeners and configures the visible control layout.
   * @public
   * @return {void}
   */
  public constructor(options: { showVerticalControls?: boolean } = {}) {
    this.showVerticalControls = options.showVerticalControls ?? true;
    this.removeListeners = [
      GameEvents.addPointerDownListener(this.handlePointer),
      GameEvents.addPointerMoveListener(this.handlePointer),
      GameEvents.addPointerEndListener(this.handlePointerEnd)
    ];
  }

  /**
   * Returns control positions and the playfield space reserved for them.
   * @public
   * @return {TouchControlsLayout}
   */
  public get layout(): TouchControlsLayout {
    const dimensions = GameContext.gameDimensionsModel;
    const unit = GameContext.viewportUnit();
    const width = dimensions.getWidth();
    const height = dimensions.getHeight();
    const radius = Math.max(
      18,
      Math.min(unit * 0.07, width * 0.085, 42)
    );
    const margin = Math.max(14, Math.min(width * 0.04, 28));
    const bottomGap = Math.max(18, Math.min(unit * 0.035, 30));
    const directionCenterX = Math.max(radius * 2 + margin, width * 0.22);
    const directionCenterY = height - bottomGap - radius * 2.5;
    const directionOffset = radius * 1.5;
    const left: TouchControlCircle = {
      x: directionCenterX - directionOffset,
      y: directionCenterY,
      radius
    };
    const right: TouchControlCircle = {
      x: directionCenterX + directionOffset,
      y: directionCenterY,
      radius
    };
    const up: TouchControlCircle = {
      x: directionCenterX,
      y: directionCenterY - directionOffset,
      radius
    };
    const down: TouchControlCircle = {
      x: directionCenterX,
      y: directionCenterY + directionOffset,
      radius
    };
    const shoot: TouchControlCircle = {
      x: width - margin - radius,
      y: directionCenterY,
      radius
    };
    const visibleControls = [left, right, shoot];
    if (this.showVerticalControls) visibleControls.push(up, down);
    const top = Math.min(
      ...visibleControls.map((control) => control.y - control.radius)
    );

    return {
      left,
      right,
      up,
      down,
      shoot,
      reservedBottom: height - top + 24
    };
  }

  /**
   * Draws enabled movement and fire controls on touch devices.
   * @public
   * @return {void}
   */
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

  /**
   * Draws a game-specific touch button using the shared button style.
   * @public
   * @return {void}
   */
  public drawExtra(circle: TouchControlCircle, icon: CanvasIcon, color: string): void {
    if (!GameContext.isMobileDevice) return;
    this.drawButton(circle, icon, `${color}aa`);
  }

  /**
   * Adds game-specific hit regions that map to keyboard-compatible keys.
   * @public
   * @return {void}
   */
  public setExtraKeys(entries: Array<[TouchControlCircle, string]>): void {
    this.extraKeys = entries;
  }

  /**
   * Removes pointer listeners and releases any keys still held by pointers.
   * @public
   * @return {void}
   */
  public dispose(): void {
    this.removeListeners.forEach((remove) => remove());
    this.activePointers.forEach((pointerId) => GameEvents.setPointerKey(pointerId, undefined));
    this.activePointers.clear();
  }

  /**
   * Draws a shared circular button with its icon and highlight.
   * @private
   * @return {void}
   */
  private drawButton(circle: TouchControlCircle, icon: CanvasIcon, color = 'rgba(56, 103, 214, 0.66)'): void {
    const inset1 = Math.max(2, Math.round(circle.radius * 0.16));
    const inset2 = Math.max(4, Math.round(circle.radius * 0.4));
    GameContext.drawCircle(circle.x, circle.y, circle.radius, 'rgba(9, 14, 38, 0.78)');
    GameContext.drawCircle(circle.x, circle.y, Math.max(1, circle.radius - inset1), color);
    GameContext.drawCircle(circle.x, circle.y, Math.max(1, circle.radius - inset2), 'rgba(19, 31, 76, 0.42)');
    GameContext.drawCircle(circle.x - circle.radius * 0.28, circle.y - circle.radius * 0.28, Math.max(1, circle.radius * 0.16), 'rgba(255, 255, 255, 0.35)');
    icon.draw(circle.x - circle.radius * 0.525, circle.y - circle.radius * 0.525, circle.radius * 1.05);
  }

  /**
   * Stores the handle pointer state.
   * @property {(pointer: GamePointer) => void} handlePointer
   * @private
   * @readonly
   */
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

  /**
   * Stores the handle pointer end state.
   * @property {(pointer: GamePointer) => void} handlePointerEnd
   * @private
   * @readonly
   */
  private readonly handlePointerEnd = (pointer: GamePointer): void => {
    GameEvents.setPointerKey(pointer.id, undefined);
    this.activePointers.delete(pointer.id);
  };

  /**
   * Tests whether a pointer coordinate lies within a control circle.
   * @private
   * @return {boolean}
   */
  private contains(circle: TouchControlCircle, x: number, y: number): boolean {
    const dx = x - circle.x;
    const dy = y - circle.y;
    return dx * dx + dy * dy <= circle.radius ** 2;
  }
}
