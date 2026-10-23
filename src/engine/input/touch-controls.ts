import chevronDownSvg from 'lucide-static/icons/chevron-down.svg?raw';
import chevronLeftSvg from 'lucide-static/icons/chevron-left.svg?raw';
import chevronRightSvg from 'lucide-static/icons/chevron-right.svg?raw';
import chevronUpSvg from 'lucide-static/icons/chevron-up.svg?raw';
import crosshairSvg from 'lucide-static/icons/crosshair.svg?raw';

import { GameContext } from '../core';
import type { TouchControlCircle, TouchControlsLayout } from '../interfaces';
import { CanvasIcon, Texture } from '../rendering';
import { Button } from '../ui';
import GameEvents from './events';


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
  private readonly buttons = new Map<string, Button>();
  private readonly extraButtons: Button[] = [];
  private extraButtonKeys: string[] = [];
  /**
   * Stores the show vertical controls state.
   * @property {boolean} showVerticalControls
   * @private
   * @readonly
   */
  private readonly showVerticalControls: boolean;

  /**
   * Registers touch listeners and configures the visible control layout.
   * @public
   * @return {void}
   */
  public constructor(options: { showVerticalControls?: boolean } = {}) {
    this.showVerticalControls = options.showVerticalControls ?? true;
    ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].forEach((key) => {
      this.buttons.set(key, this.createKeyButton(key));
    });
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
    const isMobile = GameContext.isMobileDevice;
    const layout = this.layout;
    this.syncButton(layout.left, this.buttons.get('ArrowLeft')!, !isMobile);
    this.syncButton(layout.right, this.buttons.get('ArrowRight')!, !isMobile);
    this.syncButton(layout.shoot, this.buttons.get(' ')!, !isMobile);
    this.syncButton(layout.up, this.buttons.get('ArrowUp')!, !isMobile || !this.showVerticalControls);
    this.syncButton(layout.down, this.buttons.get('ArrowDown')!, !isMobile || !this.showVerticalControls);
    this.extraButtons.forEach((button) => button.setDisabled(!isMobile));
    if (!isMobile) return;
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
    const button = this.extraButtons[this.extraButtons.length - 1];
    if (button) this.syncButton(circle, button);
    this.drawButton(circle, icon, `${color}aa`);
  }

  /**
   * Adds game-specific hit regions that map to keyboard-compatible keys.
   * @public
   * @return {void}
   */
  public setExtraKeys(entries: Array<[TouchControlCircle, string]>): void {
    while (this.extraButtons.length > entries.length) this.extraButtons.pop()!.destroy();
    while (this.extraButtons.length < entries.length) {
      const index = this.extraButtons.length;
      this.extraButtons.push(this.createKeyButton(entries[index][1]));
    }
    entries.forEach(([, key], index) => {
      if (this.extraButtonKeys[index] === key) return;
      this.extraButtons[index].destroy();
      this.extraButtons[index] = this.createKeyButton(key);
    });
    this.extraButtonKeys = entries.map(([, key]) => key);
  }

  /**
   * Removes pointer listeners and releases any keys still held by pointers.
   * @public
   * @return {void}
   */
  public dispose(): void {
    this.buttons.forEach((button) => button.destroy());
    this.extraButtons.forEach((button) => button.destroy());
    this.buttons.clear();
    this.extraButtons.length = 0;
    this.extraButtonKeys = [];
  }

  private createKeyButton(key: string): Button {
    return new Button(new Texture({}, 0, 0), {
      shape: 'circle',
      onClick: () => {},
      onPress: (pointerId) => GameEvents.setPointerKey(pointerId, key),
      onRelease: (pointerId) => GameEvents.setPointerKey(pointerId, undefined)
    });
  }

  private syncButton(circle: TouchControlCircle, button: Button, disabled = false): void {
    button.dimensions.setPosition(circle.x, circle.y);
    button.dimensions.setSize(circle.radius * 2, circle.radius * 2);
    button.dimensions.setPivot(0.5, 0.5);
    button.setDisabled(disabled || !GameContext.isMobileDevice);
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

}
