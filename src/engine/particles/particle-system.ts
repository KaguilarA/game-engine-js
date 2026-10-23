import GameContext from '../core/context';
import type { Camera2D } from '../scene/camera2d';

export type ParticleShape = 'circle' | 'rect' | 'texture';

/**
 * High-performance, zero-allocation 2D particle simulation engine.
 * Stores all particle attributes in contiguous typed arrays (Float32Array)
 * to maximize cache locality and completely bypass the JavaScript garbage collector.
 *
 * @class ParticleSystem
 */
export class ParticleSystem {
  public readonly capacity: number;
  private activeCount = 0;

  // Contiguous typed array buffers
  public readonly posX: Float32Array;
  public readonly posY: Float32Array;
  public readonly velX: Float32Array;
  public readonly velY: Float32Array;
  public readonly accelX: Float32Array;
  public readonly accelY: Float32Array;
  public readonly life: Float32Array;
  public readonly maxLife: Float32Array;
  public readonly startSize: Float32Array;
  public readonly endSize: Float32Array;
  public readonly rotation: Float32Array;
  public readonly rotationSpeed: Float32Array;
  public readonly colorR: Uint8Array;
  public readonly colorG: Uint8Array;
  public readonly colorB: Uint8Array;
  public readonly startAlpha: Float32Array;
  public readonly endAlpha: Float32Array;
  public readonly shape: Uint8Array; // 0 = circle, 1 = rect, 2 = texture

  public blendMode: GlobalCompositeOperation = 'source-over';
  public texture: HTMLImageElement | undefined;

  /**
   * @param capacity Maximum number of simultaneously alive particles (allocated once).
   */
  public constructor(capacity = 1000) {
    this.capacity = Math.max(1, capacity);

    this.posX = new Float32Array(this.capacity);
    this.posY = new Float32Array(this.capacity);
    this.velX = new Float32Array(this.capacity);
    this.velY = new Float32Array(this.capacity);
    this.accelX = new Float32Array(this.capacity);
    this.accelY = new Float32Array(this.capacity);
    this.life = new Float32Array(this.capacity);
    this.maxLife = new Float32Array(this.capacity);
    this.startSize = new Float32Array(this.capacity);
    this.endSize = new Float32Array(this.capacity);
    this.rotation = new Float32Array(this.capacity);
    this.rotationSpeed = new Float32Array(this.capacity);
    this.colorR = new Uint8Array(this.capacity);
    this.colorG = new Uint8Array(this.capacity);
    this.colorB = new Uint8Array(this.capacity);
    this.startAlpha = new Float32Array(this.capacity);
    this.endAlpha = new Float32Array(this.capacity);
    this.shape = new Uint8Array(this.capacity);
  }

  /**
   * Spawns a new particle into contiguous buffers with zero allocation.
   * Returns true if spawned, or false if capacity is reached.
   */
  public spawn(
    x: number,
    y: number,
    vx: number,
    vy: number,
    ax: number,
    ay: number,
    maxLife: number,
    startSize: number,
    endSize: number,
    startAlpha: number,
    endAlpha: number,
    r: number,
    g: number,
    b: number,
    rotation = 0,
    rotationSpeed = 0,
    shape: ParticleShape = 'circle'
  ): boolean {
    if (this.activeCount >= this.capacity) return false;

    const index = this.activeCount;
    this.posX[index] = x;
    this.posY[index] = y;
    this.velX[index] = vx;
    this.velY[index] = vy;
    this.accelX[index] = ax;
    this.accelY[index] = ay;
    this.life[index] = 0;
    this.maxLife[index] = Math.max(0.001, maxLife);
    this.startSize[index] = startSize;
    this.endSize[index] = endSize;
    this.startAlpha[index] = startAlpha;
    this.endAlpha[index] = endAlpha;
    this.colorR[index] = r;
    this.colorG[index] = g;
    this.colorB[index] = b;
    this.rotation[index] = rotation;
    this.rotationSpeed[index] = rotationSpeed;
    this.shape[index] = shape === 'circle' ? 0 : shape === 'rect' ? 1 : 2;

    this.activeCount++;
    return true;
  }

  /**
   * Simulates all active particles.
   * Dead particles are reclaimed in O(1) via swap-and-pop without memory reallocation.
   */
  public update(deltaSeconds: number): void {
    let index = 0;
    while (index < this.activeCount) {
      this.life[index] += deltaSeconds;

      if (this.life[index] >= this.maxLife[index]) {
        // Swap with the last active particle
        const lastIndex = this.activeCount - 1;
        if (index < lastIndex) {
          this.swap(index, lastIndex);
        }
        this.activeCount--;
      } else {
        // Physics integration
        this.velX[index] += this.accelX[index] * deltaSeconds;
        this.velY[index] += this.accelY[index] * deltaSeconds;
        this.posX[index] += this.velX[index] * deltaSeconds;
        this.posY[index] += this.velY[index] * deltaSeconds;
        this.rotation[index] += this.rotationSpeed[index] * deltaSeconds;
        index++;
      }
    }
  }

  /**
   * Batched drawing to the canvas context with minimal state switching.
   */
  public draw(context = GameContext.context, camera?: Camera2D): void {
    if (this.activeCount === 0) return;

    context.save();
    if (this.blendMode !== 'source-over') {
      context.globalCompositeOperation = this.blendMode;
    }

    const hasCamera = camera !== undefined;
    const camX = hasCamera ? camera.x() : 0;
    const camY = hasCamera ? camera.y() : 0;
    const zoom = hasCamera ? camera.zoom() : 1;

    for (let index = 0; index < this.activeCount; index++) {
      const progress = this.life[index] / this.maxLife[index];
      const size = (this.startSize[index] + (this.endSize[index] - this.startSize[index]) * progress) * zoom;
      if (size <= 0.05) continue;

      const alpha = Math.max(0, Math.min(1, this.startAlpha[index] + (this.endAlpha[index] - this.startAlpha[index]) * progress));
      if (alpha <= 0.005) continue;

      let drawX = this.posX[index];
      let drawY = this.posY[index];

      if (hasCamera) {
        drawX = (drawX - camX) * zoom + GameContext.gameDimensionsModel.getWidth() * 0.5;
        drawY = (drawY - camY) * zoom + GameContext.gameDimensionsModel.getHeight() * 0.5;
      }

      context.globalAlpha = alpha;
      const shapeType = this.shape[index];
      const rot = this.rotation[index];

      if (shapeType === 2 && this.texture && this.texture.complete) {
        // Texture particle (Coin, Star, etc.)
        context.save();
        context.translate(drawX, drawY);
        if (rot !== 0) context.rotate(rot);
        context.drawImage(this.texture, -size * 0.5, -size * 0.5, size, size);
        context.restore();
      } else if (shapeType === 1) {
        // Rectangle particle (Confetti, Debris)
        context.fillStyle = `rgb(${this.colorR[index]},${this.colorG[index]},${this.colorB[index]})`;
        if (rot !== 0) {
          context.save();
          context.translate(drawX, drawY);
          context.rotate(rot);
          context.fillRect(-size * 0.5, -size * 0.5, size, size);
          context.restore();
        } else {
          context.fillRect(drawX - size * 0.5, drawY - size * 0.5, size, size);
        }
      } else {
        // Circle particle (Sparks, Magic, Smoke)
        context.fillStyle = `rgb(${this.colorR[index]},${this.colorG[index]},${this.colorB[index]})`;
        context.beginPath();
        context.arc(drawX, drawY, size * 0.5, 0, Math.PI * 2);
        context.fill();
      }
    }

    context.restore();
  }

  /** Current number of active particles. */
  public get count(): number {
    return this.activeCount;
  }

  /** Clears all active particles immediately without reallocation. */
  public clear(): void {
    this.activeCount = 0;
  }

  private swap(a: number, b: number): void {
    this.posX[a] = this.posX[b];
    this.posY[a] = this.posY[b];
    this.velX[a] = this.velX[b];
    this.velY[a] = this.velY[b];
    this.accelX[a] = this.accelX[b];
    this.accelY[a] = this.accelY[b];
    this.life[a] = this.life[b];
    this.maxLife[a] = this.maxLife[b];
    this.startSize[a] = this.startSize[b];
    this.endSize[a] = this.endSize[b];
    this.startAlpha[a] = this.startAlpha[b];
    this.endAlpha[a] = this.endAlpha[b];
    this.colorR[a] = this.colorR[b];
    this.colorG[a] = this.colorG[b];
    this.colorB[a] = this.colorB[b];
    this.rotation[a] = this.rotation[b];
    this.rotationSpeed[a] = this.rotationSpeed[b];
    this.shape[a] = this.shape[b];
  }
}
