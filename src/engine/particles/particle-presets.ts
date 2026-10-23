import { ParticleEmitter } from './particle-emitter';
import type { ParticleSystem } from './particle-system';

export interface PresetOptions {
  x?: number;
  y?: number;
  system?: ParticleSystem;
  texture?: HTMLImageElement;
}

/**
 * Factory for casino, arcade, and RPG particle emitter presets.
 * @class ParticlePresets
 */
export class ParticlePresets {
  /**
   * Creates a jackpot coin shower fountain emitter.
   * @public
   * @return {ParticleEmitter}
   */
  public static coinShower(options: PresetOptions = {}): ParticleEmitter {
    return new ParticleEmitter(options.x ?? 0, options.y ?? 0, {
      system: options.system,
      texture: options.texture,
      shape: options.texture ? 'texture' : 'circle',
      rate: 45,
      maxParticles: 500,
      lifetime: { min: 1.5, max: 2.8 },
      speed: { min: 250, max: 550 },
      angle: { min: -Math.PI * 0.85, max: -Math.PI * 0.15 },
      gravity: { x: 0, y: 700 },
      startSize: { min: 14, max: 22 },
      endSize: { min: 14, max: 22 },
      startAlpha: { min: 1, max: 1 },
      endAlpha: { min: 0.8, max: 1 },
      color: { r: 255, g: 215, b: 0 },
      colorVariation: 0.15,
      rotationSpeed: { min: -6, max: 6 },
      areaWidth: 100
    });
  }

  /**
   * Creates a celebration confetti emitter.
   * @public
   * @return {ParticleEmitter}
   */
  public static confetti(options: PresetOptions = {}): ParticleEmitter {
    return new ParticleEmitter(options.x ?? 0, options.y ?? 0, {
      system: options.system,
      shape: 'rect',
      rate: 35,
      maxParticles: 400,
      lifetime: { min: 2.0, max: 3.5 },
      speed: { min: 80, max: 220 },
      angle: { min: -Math.PI * 0.8, max: -Math.PI * 0.2 },
      gravity: { x: 0, y: 220 },
      startSize: { min: 6, max: 12 },
      endSize: { min: 6, max: 12 },
      startAlpha: { min: 1, max: 1 },
      endAlpha: { min: 0.6, max: 1 },
      color: { r: 240, g: 60, b: 100 },
      colorVariation: 0.8,
      rotationSpeed: { min: -5, max: 5 },
      areaWidth: 200
    });
  }

  /**
   * Creates a shimmering sparkle emitter.
   * @public
   * @return {ParticleEmitter}
   */
  public static sparkle(options: PresetOptions = {}): ParticleEmitter {
    return new ParticleEmitter(options.x ?? 0, options.y ?? 0, {
      system: options.system,
      shape: 'circle',
      rate: 30,
      maxParticles: 300,
      blendMode: 'lighter',
      lifetime: { min: 0.4, max: 0.9 },
      speed: { min: 10, max: 60 },
      angle: { min: 0, max: Math.PI * 2 },
      gravity: { x: 0, y: -20 },
      startSize: { min: 4, max: 10 },
      endSize: { min: 0, max: 2 },
      startAlpha: { min: 0.9, max: 1 },
      endAlpha: { min: 0, max: 0 },
      color: { r: 255, g: 230, b: 120 },
      colorVariation: 0.1
    });
  }

  /**
   * Creates an explosive burst emitter.
   * @public
   * @return {ParticleEmitter}
   */
  public static explosion(options: PresetOptions = {}): ParticleEmitter {
    return new ParticleEmitter(options.x ?? 0, options.y ?? 0, {
      system: options.system,
      shape: 'circle',
      rate: 0,
      maxParticles: 200,
      blendMode: 'lighter',
      lifetime: { min: 0.3, max: 0.7 },
      speed: { min: 120, max: 320 },
      angle: { min: 0, max: Math.PI * 2 },
      gravity: { x: 0, y: 40 },
      startSize: { min: 10, max: 24 },
      endSize: { min: 0, max: 3 },
      startAlpha: { min: 1, max: 1 },
      endAlpha: { min: 0, max: 0 },
      color: { r: 255, g: 120, b: 20 },
      colorVariation: 0.25
    });
  }

  /**
   * Creates a friction/clash sparks emitter.
   * @public
   * @return {ParticleEmitter}
   */
  public static sparks(options: PresetOptions = {}): ParticleEmitter {
    return new ParticleEmitter(options.x ?? 0, options.y ?? 0, {
      system: options.system,
      shape: 'circle',
      rate: 0,
      maxParticles: 150,
      blendMode: 'lighter',
      lifetime: { min: 0.15, max: 0.45 },
      speed: { min: 200, max: 450 },
      angle: { min: -Math.PI * 0.9, max: -Math.PI * 0.1 },
      gravity: { x: 0, y: 500 },
      startSize: { min: 2, max: 4 },
      endSize: { min: 0, max: 1 },
      startAlpha: { min: 1, max: 1 },
      endAlpha: { min: 0.2, max: 0.5 },
      color: { r: 255, g: 240, b: 180 },
      colorVariation: 0.05
    });
  }
}
