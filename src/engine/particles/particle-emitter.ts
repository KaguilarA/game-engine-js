import { ParticleSystem, type ParticleShape } from './particle-system';
import { MathUtils } from '../core/math-utils';
import type { Camera2D } from '../scene/camera2d';

export interface ParticleEmitterOptions {
  system?: ParticleSystem;
  maxParticles?: number;
  rate?: number; // Particles emitted per second
  lifetime?: { min: number; max: number };
  speed?: { min: number; max: number };
  angle?: { min: number; max: number }; // In radians
  gravity?: { x: number; y: number };
  startSize?: { min: number; max: number };
  endSize?: { min: number; max: number };
  startAlpha?: { min: number; max: number };
  endAlpha?: { min: number; max: number };
  color?: { r: number; g: number; b: number };
  colorVariation?: number; // 0 to 1
  rotationSpeed?: { min: number; max: number };
  shape?: ParticleShape;
  texture?: HTMLImageElement;
  blendMode?: GlobalCompositeOperation;
  areaWidth?: number;
  areaHeight?: number;
}

/**
 * Configurable particle emitter that drives a zero-allocation ParticleSystem.
 * Supports continuous emission and instant bursts for explosions and casino wins.
 *
 * @class ParticleEmitter
 */
export class ParticleEmitter {
  public x: number;
  public y: number;
  public active = true;
  public rate: number;
  public areaWidth: number;
  public areaHeight: number;

  public lifetime: { min: number; max: number };
  public speed: { min: number; max: number };
  public angle: { min: number; max: number };
  public gravity: { x: number; y: number };
  public startSize: { min: number; max: number };
  public endSize: { min: number; max: number };
  public startAlpha: { min: number; max: number };
  public endAlpha: { min: number; max: number };
  public color: { r: number; g: number; b: number };
  public colorVariation: number;
  public rotationSpeed: { min: number; max: number };
  public shape: ParticleShape;

  public readonly system: ParticleSystem;
  private accumulator = 0;

  public constructor(x = 0, y = 0, options: ParticleEmitterOptions = {}) {
    this.x = x;
    this.y = y;
    this.rate = options.rate ?? 50;
    this.areaWidth = options.areaWidth ?? 0;
    this.areaHeight = options.areaHeight ?? 0;

    this.lifetime = options.lifetime ?? { min: 0.5, max: 1.2 };
    this.speed = options.speed ?? { min: 60, max: 180 };
    this.angle = options.angle ?? { min: 0, max: Math.PI * 2 };
    this.gravity = options.gravity ?? { x: 0, y: 0 };
    this.startSize = options.startSize ?? { min: 8, max: 16 };
    this.endSize = options.endSize ?? { min: 0, max: 4 };
    this.startAlpha = options.startAlpha ?? { min: 1, max: 1 };
    this.endAlpha = options.endAlpha ?? { min: 0, max: 0 };
    this.color = options.color ?? { r: 255, g: 200, b: 50 };
    this.colorVariation = options.colorVariation ?? 0.1;
    this.rotationSpeed = options.rotationSpeed ?? { min: -2, max: 2 };
    this.shape = options.shape ?? 'circle';

    this.system = options.system ?? new ParticleSystem(options.maxParticles ?? 800);
    if (options.blendMode) this.system.blendMode = options.blendMode;
    if (options.texture) this.system.texture = options.texture;
  }

  /**
   * Spawns an immediate burst of particles at the emitter or specified coordinates.
   */
  public burst(count: number, originX = this.x, originY = this.y): void {
    for (let index = 0; index < count; index++) {
      this.emitOne(originX, originY);
    }
  }

  /**
   * Advances the simulation and emits new particles based on rate.
   */
  public update(deltaSeconds: number): void {
    if (this.active && this.rate > 0) {
      this.accumulator += this.rate * deltaSeconds;
      while (this.accumulator >= 1) {
        this.emitOne(this.x, this.y);
        this.accumulator -= 1;
      }
    }
    this.system.update(deltaSeconds);
  }

  /**
   * Draws active particles through the underlying batched ParticleSystem.
   */
  public draw(context?: CanvasRenderingContext2D, camera?: Camera2D): void {
    this.system.draw(context, camera);
  }

  public clear(): void {
    this.system.clear();
    this.accumulator = 0;
  }

  private emitOne(baseX: number, baseY: number): void {
    const spawnX = baseX + (this.areaWidth > 0 ? (Math.random() - 0.5) * this.areaWidth : 0);
    const spawnY = baseY + (this.areaHeight > 0 ? (Math.random() - 0.5) * this.areaHeight : 0);

    const ang = MathUtils.randomFloat(this.angle.min, this.angle.max);
    const spd = MathUtils.randomFloat(this.speed.min, this.speed.max);
    const vx = Math.cos(ang) * spd;
    const vy = Math.sin(ang) * spd;

    const life = MathUtils.randomFloat(this.lifetime.min, this.lifetime.max);
    const sSize = MathUtils.randomFloat(this.startSize.min, this.startSize.max);
    const eSize = MathUtils.randomFloat(this.endSize.min, this.endSize.max);
    const sAlpha = MathUtils.randomFloat(this.startAlpha.min, this.startAlpha.max);
    const eAlpha = MathUtils.randomFloat(this.endAlpha.min, this.endAlpha.max);

    const variation = (Math.random() - 0.5) * this.colorVariation;
    const r = Math.max(0, Math.min(255, Math.floor(this.color.r * (1 + variation))));
    const g = Math.max(0, Math.min(255, Math.floor(this.color.g * (1 + variation))));
    const b = Math.max(0, Math.min(255, Math.floor(this.color.b * (1 + variation))));

    const rot = Math.random() * Math.PI * 2;
    const rotSpeed = MathUtils.randomFloat(this.rotationSpeed.min, this.rotationSpeed.max);

    this.system.spawn(
      spawnX,
      spawnY,
      vx,
      vy,
      this.gravity.x,
      this.gravity.y,
      life,
      sSize,
      eSize,
      sAlpha,
      eAlpha,
      r,
      g,
      b,
      rot,
      rotSpeed,
      this.shape
    );
  }
}
