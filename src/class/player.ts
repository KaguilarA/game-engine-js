import { signalValue } from 'reactive-values';
import { Dimensions } from '../engine/dimensions';
import { GameContext } from '../engine/context';
import { Events } from '../engine/events';

export class Player {
  private context: GameContext;
  private events: Events;
  private dimensions = new Dimensions(50, 50, 0, 0);
  public speed = signalValue(0);

  public get height() {
    return this.dimensions.size().height;
  }

  public get width() {
    return this.dimensions.size().width;
  }

  public get x() {
    return this.dimensions.position().x;
  }

  public get y() {
    return this.dimensions.position().y;
  }

  constructor(context: GameContext, events: Events) {
    this.context = context;
    this.events = events;

    this.dimensions.setPosition(
      this.context.size().width * 0.5 - this.dimensions.size().width * 0.5,
      this.context.size().height - this.dimensions.size().height
    );
  }

  draw(): void {
    this.context.drawRect(
      this.x,
      this.y,
      this.width,
      this.height,
      'red'
    );
  }

  update(): void {

    if (this.events.isKeyPressed('ArrowLeft')) {
      this.speed.set(-5);
    } else if (this.events.isKeyPressed('ArrowRight')) {
      this.speed.set(5);
    } else {
      this.speed.set(0);
    }

    if (this.x < 0) {
      this.dimensions.setPosition(0, this.y);
    } else if (this.x + this.width > this.context.size().width) {
      this.dimensions.setPosition(this.context.size().width - this.width, this.dimensions.position().y);
    }

    this.dimensions.setPosition(this.x + this.speed(), this.y);
  }
}