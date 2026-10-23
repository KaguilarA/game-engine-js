import { computedValue, signalValue } from 'reactive-values';
import type { ComputedValue, SignalValue } from 'reactive-values';
import GameContext from '../core/context';
import type { Camera2D } from '../scene/camera2d';

export type ParticleShape = 'circle' | 'rect' | 'texture';

/**
 * Continuous Float32Array particle simulation engine with reactive state tracking.
 * @class ParticleSystem
 */
export class ParticleSystem {
  /**
   * Stores the total capacity of pre-allocated particle buffers.
   * @property {number} capacity
   * @public
   * @readonly
   */
  public readonly capacity: number;

  /**
   * Stores the reactive active particle count.
   * @property {SignalValue<number>} activeCount
   * @private
   * @readonly
   */
  private readonly activeCount: SignalValue<number>;

  /**
   * Reports whether particle capacity has been reached.
   * @property {ComputedValue<boolean>} full
   * @private
   * @readonly
   */
  private readonly full: ComputedValue<boolean>;

  /**
   * Stores horizontal positions.
   * @property {Float32Array} posX
   * @public
   * @readonly
   */
  public readonly posX: Float32Array;

  /**
   * Stores vertical positions.
   * @property {Float32Array} posY
   * @public
   * @readonly
   */
  public readonly posY: Float32Array;

  /**
   * Stores horizontal velocities.
   * @property {Float32Array} velX
   * @public
   * @readonly
   */
  public readonly velX: Float32Array;

  /**
   * Stores vertical velocities.
   * @property {Float32Array} velY
   * @public
   * @readonly
   */
  public readonly velY: Float32Array;

  /**
   * Stores horizontal accelerations.
   * @property {Float32Array} accelX
   * @public
   * @readonly
   */
  public readonly accelX: Float32Array;

  /**
   * Stores vertical accelerations.
   * @property {Float32Array} accelY
   * @public
   * @readonly
   */
  public readonly accelY: Float32Array;

  /**
   * Stores current particle lifetimes.
   * @property {Float32Array} life
   * @public
   * @readonly
   */
  public readonly life: Float32Array;

  /**
   * Stores maximum particle lifetimes.
   * @property {Float32Array} maxLife
   * @public
   * @readonly
   */
  public readonly maxLife: Float32Array;

  /**
   * Stores initial particle sizes.
   * @property {Float32Array} startSize
   * @public
   * @readonly
   */
  public readonly startSize: Float32Array;

  /**
   * Stores final particle sizes.
   * @property {Float32Array} endSize
   * @public
   * @readonly
   */
  public readonly endSize: Float32Array;

  /**
   * Stores current particle rotations.
   * @property {Float32Array} rotation
   * @public
   * @readonly
   */
  public readonly rotation: Float32Array;

  /**
   * Stores particle rotation speeds.
   * @property {Float32Array} rotationSpeed
   * @public
   * @readonly
   */
  public readonly rotationSpeed: Float32Array;

  /**
   * Stores red color components.
   * @property {Uint8Array} colorR
   * @public
   * @readonly
   */
  public readonly colorR: Uint8Array;

  /**
   * Stores green color components.
   * @property {Uint8Array} colorG
   * @public
   * @readonly
   */
  public readonly colorG: Uint8Array;

  /**
   * Stores blue color components.
   * @property {Uint8Array} colorB
   * @public
   * @readonly
   */
  public readonly colorB: Uint8Array;

  /**
   * Stores starting alpha opacities.
   * @property {Float32Array} startAlpha
   * @public
   * @readonly
   */
  public readonly startAlpha: Float32Array;

  /**
   * Stores ending alpha opacities.
   * @property {Float32Array} endAlpha
   * @public
   * @readonly
   */
  public readonly endAlpha: Float32Array;

  /**
   * Stores particle shape types.
   * @property {Uint8Array} shape
   * @public
   * @readonly
   */
  public readonly shape: Uint8Array;

  /**
   * Stores the composite operation blend mode.
   * @property {GlobalCompositeOperation} blendMode
   * @public
   */
  public blendMode: GlobalCompositeOperation = 'source-over';

  /**
   * Stores the particle texture element.
   * @property {HTMLImageElement | undefined} texture
   * @public
   */
  public texture: HTMLImageElement | undefined;

  /**
   * Returns the count of active particles.
   * @public
   * @return {number}
   */
  public get count(): number {
    return this.activeCount();
  }

  /**
   * Reports whether particle buffer capacity is reached.
   * @public
   * @return {boolean}
   */
  public get isFull(): boolean {
    return this.full();
  }

  /**
   * Creates a particle system with pre-allocated contiguous buffers.
   * @public
   * @return {void}
   */
  public constructor(capacity = 1000) {
    this.capacity = Math.max(1, capacity);
    this.activeCount = signalValue(0);
    this.full = computedValue(
      () => this.activeCount() >= this.capacity,
      [this.activeCount]
    );

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
   * Spawns a particle into flat buffers without allocating objects.
   * @public
   * @return {boolean}
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
    const current = this.activeCount();
    if (current >= this.capacity) return false;

    const index = current;
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

    this.activeCount.set(current + 1);
    return true;
  }

  /**
   * Updates particle simulation and cleans up expired particles via swap-and-pop.
   * @public
   * @return {void}
   */
  public update(deltaSeconds: number): void {
    let count = this.activeCount();
    let index = 0;
    while (index < count) {
      this.life[index] += deltaSeconds;

      if (this.life[index] >= this.maxLife[index]) {
        const lastIndex = count - 1;
        if (index < lastIndex) {
          this.swap(index, lastIndex);
        }
        count--;
      } else {
        this.velX[index] += this.accelX[index] * deltaSeconds;
        this.velY[index] += this.accelY[index] * deltaSeconds;
        this.posX[index] += this.velX[index] * deltaSeconds;
        this.posY[index] += this.velY[index] * deltaSeconds;
        this.rotation[index] += this.rotationSpeed[index] * deltaSeconds;
        index++;
      }
    }
    this.activeCount.set(count);
  }

  /**
   * Renders active particles in batch to the graphics context.
   * @public
   * @return {void}
   */
  public draw(context = GameContext.context, camera?: Camera2D): void {
    const active = this.activeCount();
    if (active === 0) return;

    context.save();
    if (this.blendMode !== 'source-over') {
      context.globalCompositeOperation = this.blendMode;
    }

    const hasCamera = camera !== undefined;
    const camX = hasCamera ? camera.x() : 0;
    const camY = hasCamera ? camera.y() : 0;
    const zoom = hasCamera ? camera.zoom() : 1;

    for (let index = 0; index < active; index++) {
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
        context.save();
        context.translate(drawX, drawY);
        if (rot !== 0) context.rotate(rot);
        context.drawImage(this.texture, -size * 0.5, -size * 0.5, size, size);
        context.restore();
      } else if (shapeType === 1) {
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
        context.fillStyle = `rgb(${this.colorR[index]},${this.colorG[index]},${this.colorB[index]})`;
        context.beginPath();
        context.arc(drawX, drawY, size * 0.5, 0, Math.PI * 2);
        context.fill();
      }
    }

    context.restore();
  }

  /**
   * Resets active particle count to zero.
   * @public
   * @return {void}
   */
  public clear(): void {
    this.activeCount.set(0);
  }

  /**
   * Swaps two particle slots in contiguous buffers.
   * @private
   * @return {void}
   */
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
