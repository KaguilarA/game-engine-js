import { signalValue } from 'reactive-values';

import GameContext from '../engine/context';
import GameEvents from '../engine/events';
import GameLoader from '../engine/loader';
import { Health } from './health';
import Sprite from './sprite';

type PlayerAnimation = 'idle' | 'moving' | 'shooting';

export class Player {
  private readonly sprite = new Sprite(
    GameLoader.getImage('player'),
    70,
    50,
    0,
    0,
    0,
    0,
    0,
    0,
    140,
    120,
    4,
    8
  );

  public readonly speed = signalValue(0);
  private readonly health = new Health(2);
  private animation: PlayerAnimation = 'idle';
  private bottomMargin = 40;
  private shootingTime = 0;

  public get height(): number {
    return this.sprite.dimensions.getHeight();
  }

  public get width(): number {
    return this.sprite.dimensions.getWidth();
  }

  public get x(): number {
    return this.sprite.dimensions.getX();
  }

  public get y(): number {
    return this.sprite.dimensions.getY();
  }

  public get dimensions() {
    return this.sprite.dimensions;
  }

  constructor() {
    const gameDimensions = GameContext.gameDimensionsModel;

    this.sprite.dimensions.setPosition(
      (gameDimensions.getWidth() - this.width) * 0.5,
      gameDimensions.getHeight() - this.height - this.bottomMargin
    );
  }

  /**
   * Reserves space below the player for controls or other interface elements.
   */
  public setBottomMargin(margin: number): void {
    if (!Number.isFinite(margin) || margin < 0) {
      throw new RangeError('Bottom margin must be a finite non-negative number.');
    }

    this.bottomMargin = margin;
  }

  private updateLayout(): void {
    const gameDimensions = GameContext.gameDimensionsModel;
    const maxX = Math.max(
      0,
      gameDimensions.getWidth() - this.width
    );

    this.sprite.dimensions.setPosition(
      Math.max(0, Math.min(this.x, maxX)),
      gameDimensions.getHeight() - this.height - this.bottomMargin
    );
  }

  public draw(): void {
    this.sprite.draw();
  }

  public update(deltaSeconds: number): void {
    this.shootingTime = Math.max(0, this.shootingTime - deltaSeconds);
    this.updateLayout();
    this.updateSpeed();
    this.updateAnimation(deltaSeconds);
    this.updatePosition();
  }

  public shoot(): void {
    this.shootingTime = 0.2;
  }

  /**
   * Applies one projectile impact and reports whether one player life was lost.
   */
  public takeDamage(): boolean {
    const damage = this.health.receiveDamage();

    if (!damage.isDepleted) return false;

    this.health.restore();
    return true;
  }

  public restoreHealth(): void {
    this.health.restore();
  }

  private updateAnimation(deltaSeconds: number): void {
    const nextAnimation: PlayerAnimation = this.shootingTime > 0
      ? 'shooting'
      : this.speed() !== 0
        ? 'moving'
        : 'idle';

    if (
      nextAnimation !== this.animation
      || (
        nextAnimation === 'shooting'
        && !this.sprite.isAnimationPlaying
      )
    ) {
      this.animation = nextAnimation;

      if (nextAnimation === 'idle') {
        this.sprite.setFrame(0);
      } else if (nextAnimation === 'moving') {
        this.sprite.play(1, 2, 8, true);
      } else {
        this.sprite.play(2, 2, 12);
      }
    }

    this.sprite.update(deltaSeconds);
  }

  private updateSpeed(): void {
    if (GameEvents.isKeyPressed('ArrowLeft')) {
      this.speed.set(-8);
      return;
    }

    if (GameEvents.isKeyPressed('ArrowRight')) {
      this.speed.set(8);
      return;
    }

    this.speed.set(0);
  }

  private updatePosition(): void {
    const nextX = this.x + this.speed();
    const maxX = GameContext.gameDimensionsModel.getWidth() - this.width;

    this.sprite.dimensions.setPosition(
      Math.max(0, Math.min(nextX, maxX)),
      this.y
    );
  }
}
