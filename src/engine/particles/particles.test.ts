import { describe, expect, it } from 'vitest';
import { ParticleSystem } from './particle-system';
import { ParticleEmitter } from './particle-emitter';
import { ParticlePresets } from './particle-presets';

describe('ParticleSystem & ParticleEmitter (Zero-Allocation)', () => {
  it('spawns and updates particles in flat typed arrays without object allocation', () => {
    const system = new ParticleSystem(10);
    expect(system.count).toBe(0);

    const spawned = system.spawn(
      10, 20, 100, 0, 0, 0,
      1.0, 8, 2, 1, 0,
      255, 200, 50
    );

    expect(spawned).toBe(true);
    expect(system.count).toBe(1);
    expect(system.posX[0]).toBe(10);
    expect(system.posY[0]).toBe(20);

    // Simulate 0.5s: position should advance by vx * dt = 100 * 0.5 = 50
    system.update(0.5);
    expect(system.count).toBe(1);
    expect(system.posX[0]).toBe(60);

    // Simulate another 0.6s: total life = 1.1s > maxLife (1.0s) -> particle should be dead
    system.update(0.6);
    expect(system.count).toBe(0);
  });

  it('manages emitter bursts and continuous emission', () => {
    const emitter = new ParticleEmitter(0, 0, {
      maxParticles: 50,
      rate: 10
    });

    emitter.burst(5);
    expect(emitter.system.count).toBe(5);

    // 0.2s at 10 particles/s emits 2 more particles
    emitter.update(0.2);
    expect(emitter.system.count).toBe(7);

    emitter.clear();
    expect(emitter.system.count).toBe(0);
  });

  it('provides ready presets for casino wins and explosions', () => {
    const coinShower = ParticlePresets.coinShower({ x: 200, y: 300 });
    expect(coinShower.gravity.y).toBeGreaterThan(0); // Falls down like gold coins
    expect(coinShower.system.capacity).toBe(500);

    const explosion = ParticlePresets.explosion({ x: 100, y: 100 });
    explosion.burst(20);
    expect(explosion.system.count).toBe(20);
  });
});
