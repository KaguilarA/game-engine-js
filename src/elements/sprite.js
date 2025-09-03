import { Texture, Sprite } from "pixi.js";
import Matter from "matter-js";
import { signal } from "reactive-values";

export class PhysicsSprite extends Sprite {
  body;
  xSignal = signal(0);
  ySignal = signal(0);
  angleSignal = signal(0);

  constructor(texture, body) {
    super(texture);
    this.body = body;

    this.xSignal.effect(v => this.x = v);
    this.ySignal.effect(v => this.y = v);
    this.angleSignal.effect(v => this.rotation = v);
  }

  sync() {
    this.xSignal.set(this.body.position.x);
    this.ySignal.set(this.body.position.y);
    this.angleSignal.set(this.body.angle);
  }
}
