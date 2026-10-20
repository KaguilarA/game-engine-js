import { signalValue } from 'reactive-values';
import type { SignalValue } from 'reactive-values';

import GameContext from '../../engine/core/context';
import Dimensions from '../../engine/core/dimensions';
import type { Renderable } from '../../engine/interfaces/renderable';
import type { Icon } from './icon';
import { MathUtils } from '../../engine/core/math-utils';

/** Draws one independently positioned symbol inside its owning reel container. */
export class ReelIcon implements Renderable {
  public readonly dimensions = new Dimensions(0, 0, 0, 0, 0.5, 0.5);
  private readonly icon: SignalValue<Icon | undefined> = signalValue<Icon | undefined>(undefined);
  private readonly blurAmount: SignalValue<number> = signalValue(0);
  private readonly winning: SignalValue<boolean> = signalValue(false);

  public setPresentation(icon: Icon | undefined, blurAmount: number, winning: boolean): void {
    if (this.icon() !== icon) this.icon.set(icon);
    const nextBlurAmount = MathUtils.clamp(blurAmount, 0, 1);
    if (this.blurAmount() !== nextBlurAmount) this.blurAmount.set(nextBlurAmount);
    if (this.winning() !== winning) this.winning.set(winning);
  }

  public draw(): void {
    const icon = this.icon();
    if (!icon) return;
    const x = this.dimensions.getX();
    const y = this.dimensions.getY();
    const width = this.dimensions.getWidth();
    const height = this.dimensions.getHeight();
    if (this.winning()) {
      const pulse = 0.78 + Math.sin(performance.now() / 150) * 0.08;
      GameContext.drawCircle(x, y, Math.min(width, height) * 0.43 * pulse, 'rgba(255,190,38,0.48)');
    }
    icon.draw(x, y, width, height, this.blurAmount(), this.winning());
  }
}
