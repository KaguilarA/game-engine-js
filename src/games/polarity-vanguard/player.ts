import GameContext from '../../engine/context';
import GameEvents from '../../engine/events';
import GameLoader from '../../engine/loader';
import Sprite from '../../engine/sprite';

import type { Polarity } from './polarity';
import { oppositePolarity } from './polarity';

export class PolarityVanguardPlayer {
  private readonly sprite = new Sprite(
    GameLoader.getImage('player'),
    84,
    72,
    0,
    0,
    0.5,
    0.5,
    0,
    0,
    140,
    120,
    4
  );
  private polarity: Polarity = 'light';
  private polarityKeyWasPressed = false;
  private bottomMargin = 32;

  public get x(): number {
    return this.sprite.dimensions.getX();
  }

  public get y(): number {
    return this.sprite.dimensions.getY();
  }

  public get width(): number {
    return this.sprite.dimensions.getWidth();
  }

  public get height(): number {
    return this.sprite.dimensions.getHeight();
  }

  public get currentPolarity(): Polarity {
    return this.polarity;
  }

  public constructor() {
    this.reset();
  }

  public reset(): void {
    const dimensions = GameContext.gameDimensionsModel;
    this.sprite.dimensions.setPosition(
      dimensions.getWidth() * 0.5,
      dimensions.getHeight() - this.height * 0.5 - this.bottomMargin
    );
    this.polarity = 'light';
  }

  public setBottomMargin(margin: number): void {
    if (!Number.isFinite(margin) || margin < 0) {
      throw new RangeError('Bottom margin must be a finite non-negative number.');
    }

    this.bottomMargin = margin;
  }

  public update(deltaSeconds: number): void {
    const dimensions = GameContext.gameDimensionsModel;
    const speed = 560;
    const horizontal = (
      Number(GameEvents.isKeyPressed('ArrowRight') || GameEvents.isKeyPressed('d'))
      - Number(GameEvents.isKeyPressed('ArrowLeft') || GameEvents.isKeyPressed('a'))
    );
    const vertical = (
      Number(GameEvents.isKeyPressed('ArrowDown') || GameEvents.isKeyPressed('s'))
      - Number(GameEvents.isKeyPressed('ArrowUp') || GameEvents.isKeyPressed('w'))
    );
    const x = Math.max(
      this.width * 0.5,
      Math.min(
        dimensions.getWidth() - this.width * 0.5,
        this.x + horizontal * speed * deltaSeconds
      )
    );
    const y = Math.max(
      dimensions.getHeight() * 0.45,
      Math.min(
        dimensions.getHeight() - this.height * 0.5 - this.bottomMargin,
        this.y + vertical * speed * deltaSeconds
      )
    );
    const polarityKeyPressed = (
      GameEvents.isKeyPressed('Shift')
      || GameEvents.isKeyPressed('c')
    );

    if (polarityKeyPressed && !this.polarityKeyWasPressed) {
      this.polarity = oppositePolarity(this.polarity);
    }

    this.polarityKeyWasPressed = polarityKeyPressed;
    this.sprite.dimensions.setPosition(x, y);
  }

  public draw(): void {
    this.sprite.draw();
  }
}
