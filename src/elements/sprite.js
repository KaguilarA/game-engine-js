import { Sprite } from "pixi.js";
import { signalValue } from "reactive-values";

export class PhysicsSprite extends Sprite {
  #position = signalValue({
    x: 0,
    y: 0,
  });
  body;
  angleSignal = signalValue(0);

  constructor(texture, body) {
    super(texture);
    this.body = body;

    this.#position.effect(({ x, y }) => {
      this.x = x;
      this.y = y;
    });

    this.angleSignal.effect((v) => (this.rotation = v));
  }

  setPosition(x, y) {
    this.position.set(x, y);
  }

  sync() {
    this.#position.set({
      x: this.body.position.x,
      y: this.body.position.y,
    });
    this.angleSignal.set(this.body.angle);
  }
}
