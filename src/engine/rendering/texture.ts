import { signalValue } from 'reactive-values';
import type { SignalValue } from 'reactive-values';

import GameContext from '../core/context';
import Dimensions from '../core/dimensions';
import { SpineSprite } from '../animations/spine/spine-sprite';
import Sprite from '../animations/sprites/sprite';
import type { TextureStates, TextureStateName, TextureVisual } from '../interfaces/texture-states';

/** Selects, resizes, updates, and renders one of several visual representations. */
export class Texture {
  public readonly dimensions: Dimensions;
  private readonly states: SignalValue<TextureStates>;
  private readonly state: SignalValue<TextureStateName> = signalValue<TextureStateName>('idle');

  public constructor(states: TextureStates, width: number, height: number, x = 0, y = 0, pivotX = 0.5, pivotY = 0.5) {
    this.states = signalValue(states);
    this.dimensions = new Dimensions(width, height, x, y, pivotX, pivotY);
  }

  public setState(state: TextureStateName): void {
    if (this.state() !== state) this.state.set(state);
  }
  public get stateName(): TextureStateName { return this.state(); }
  public setTextureState(state: TextureStateName, visual: TextureVisual): void {
    this.states.set({ ...this.states(), [state]: visual });
  }

  public update(deltaSeconds: number): void {
    const visual = this.getCurrentVisual();
    if (visual instanceof Sprite || visual instanceof SpineSprite) visual.update(deltaSeconds);
  }

  public draw(): void {
    const visual = this.getCurrentVisual();
    if (!visual) return;
    const dimensions = this.dimensions;
    const x = dimensions.getX();
    const y = dimensions.getY();
    const width = dimensions.getWidth();
    const height = dimensions.getHeight();
    const pivotX = dimensions.getPivotX();
    const pivotY = dimensions.getPivotY();
    if (visual instanceof Sprite || visual instanceof SpineSprite) {
      visual.dimensions.setPosition(x, y);
      visual.dimensions.setWidth(width);
      visual.dimensions.setHeight(height);
      visual.dimensions.setScale(dimensions.getScaleX(), dimensions.getScaleY());
      visual.dimensions.setPivot(pivotX, pivotY);
      visual.draw();
      return;
    }
    const context = GameContext.context;
    context.save();
    context.translate(x, y);
    context.scale(dimensions.getScaleX(), dimensions.getScaleY());
    context.drawImage(visual, -width * pivotX, -height * pivotY, width, height);
    context.restore();
  }

  private getCurrentVisual(): TextureVisual | undefined {
    const states = this.states();
    return states[this.state()] ?? states.idle ?? states.disabled ?? states.blocked ?? states.hover;
  }
}
