import { signalValue } from 'reactive-values';
import GameContext from '../core/context';
import type { GamePointer } from '../interfaces/game-pointer';

type PointerListener = (pointer: GamePointer) => void;
type WheelListener = (pointer: GamePointer, deltaY: number) => boolean;

/**
 * Tracks keyboard and touch-pointer input as normalized key states.
 * @class Events
 */
class Events {
  /**
   * Stores the keys state.
   * @property {Set<string>} keys
   * @private
   * @readonly
   */
  private readonly keys = new Set<string>();
  /**
   * Stores the pointer keys state.
   * @property {Map<number, string>} pointerKeys
   * @private
   * @readonly
   */
  private readonly pointerKeys = new Map<number, string>();

  /**
   * Subscribers notified when a pointer begins on the game canvas.
   * @property {Set<PointerListener>} pointerDownListeners
   * @private
   * @readonly
   */
  private readonly pointerDownListeners = new Set<PointerListener>();
  /**
   * Subscribers notified when an active pointer moves.
   * @property {Set<PointerListener>} pointerMoveListeners
   * @private
   * @readonly
   */
  private readonly pointerMoveListeners = new Set<PointerListener>();
  /**
   * Subscribers notified when a pointer is released or cancelled.
   * @property {Set<PointerListener>} pointerEndListeners
   * @private
   * @readonly
   */
  private readonly pointerEndListeners = new Set<PointerListener>();
  private readonly wheelListeners = new Set<WheelListener>();
  private readonly pointerTargets = new Set<(pointer: GamePointer) => boolean>();
  /**
   * Canvas currently used for pointer input.
   * @property {HTMLCanvasElement | undefined} pointerCanvas
   * @private
   */
  private pointerCanvas: HTMLCanvasElement | undefined;
  /**
   * Observer that forwards container size changes to the viewport owner.
   * @property {ResizeObserver | undefined} resizeObserver
   * @private
   */
  private resizeObserver: ResizeObserver | undefined;
  /**
   * Callback used to recalculate the canvas viewport after resize events.
   * @property {(() => void) | undefined} onViewportResize
   * @private
   */
  private onViewportResize: (() => void) | undefined;

  /**
   * Normalizes and dispatches a pointer-down event.
   * @private
   * @return {void}
   */
  private readonly onPointerDown = (event: PointerEvent): void => {
    const pointer = this.getGamePointer(event);
    this.pointerDownListeners.forEach((listener) => listener(pointer));
  };

  /**
   * Normalizes and dispatches a pointer-move event.
   * @private
   * @return {void}
   */
  private readonly onPointerMove = (event: PointerEvent): void => {
    const pointer = this.getGamePointer(event);
    if (this.pointerCanvas !== undefined) {
      this.pointerCanvas.style.cursor = [...this.pointerTargets].some((contains) => contains(pointer))
        ? 'pointer'
        : '';
    }
    this.pointerMoveListeners.forEach((listener) => listener(pointer));
  };

  /**
   * Normalizes and dispatches a pointer-up or pointer-cancel event.
   * @private
   * @return {void}
   */
  private readonly onPointerEnd = (event: PointerEvent): void => {
    const pointer = this.getGamePointer(event);
    this.pointerEndListeners.forEach((listener) => listener(pointer));
  };
  private readonly onPointerLeave = (): void => {
    if (this.pointerCanvas !== undefined) this.pointerCanvas.style.cursor = '';
  };
  private readonly onWheel = (event: WheelEvent): void => {
    const pointer = this.getGamePointer(event);
    const multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? 16
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? GameContext.gameDimensionsModel.getHeight() : 1;
    const deltaY = event.deltaY * multiplier;
    let handled = false;
    this.wheelListeners.forEach((listener) => { handled = listener(pointer, deltaY) || handled; });
    if (handled) event.preventDefault();
  };

  /**
   * Forwards browser viewport resize notifications to the canvas owner.
   * @private
   * @return {void}
   */
  private readonly handleViewportResize = (): void => {
    this.onViewportResize?.();
  };

  /**
   * Stores the initialized state.
   * @property {Signal} initialized
   * @private
   * @readonly
   */
  private readonly initialized = signalValue(false);

  /**
   * Stores the on key down state.
   * @property {(event: KeyboardEvent) => void} onKeyDown
   * @private
   * @readonly
   */
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.key);
  };

  /**
   * Stores the on key up state.
   * @property {(event: KeyboardEvent) => void} onKeyUp
   * @private
   * @readonly
   */
  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.key);
  };

  /**
   * Starts listening for keyboard input when the singleton is created.
   * @public
   * @return {void}
   */
  constructor() {
    this.initEvents();
  }

  /**
   * Installs keyboard listeners once.
   * @public
   * @return {void}
   */
  public initEvents(): void {
    if (!this.initialized()) {
      window.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('keyup', this.onKeyUp);
      this.initialized.set(true);
    }

    this.initViewportEvents();
    this.initPointerEvents();
  }

  /**
   * Installs pointer input on the shared game canvas. Repeated initialization
   * is ignored when the canvas is already registered.
   * @public
   * @return {void}
   */
  public initPointerEvents(): void {
    const canvas = GameContext.canvas;
    if (this.pointerCanvas === canvas) return;
    this.removePointerEvents();
    this.pointerCanvas = canvas;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerEnd);
    canvas.addEventListener('pointercancel', this.onPointerEnd);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }

  /**
   * Registers browser resize sources and forwards them to the viewport owner.
   *
   * @public
   * @return {void}
   */
  public initViewportEvents(): void {
    if (this.onViewportResize !== undefined) return;
    this.onViewportResize = () => GameContext.updateViewport();
    window.addEventListener('resize', this.handleViewportResize);
    const target = GameContext.canvas.parentElement;
    if (typeof ResizeObserver !== 'undefined' && target !== null) {
      this.resizeObserver = new ResizeObserver(this.handleViewportResize);
      this.resizeObserver.observe(target);
    }
  }

  /**
   * Removes browser resize listeners and observers.
   * @private
   * @return {void}
   */
  private removeViewportEvents(): void {
    window.removeEventListener('resize', this.handleViewportResize);
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.onViewportResize = undefined;
  }

  /**
   * Removes keyboard listeners and clears all held input.
   * @public
   * @return {void}
   */
  public destroy(): void {
    if (!this.initialized()) return;

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.removePointerEvents();
    this.removeViewportEvents();

    this.keys.clear();
    this.pointerKeys.clear();
    this.initialized.set(false);
  }

  /**
   * Subscribes to normalized pointer-down events.
   * @param listener - Callback receiving the logical pointer position.
   * @public
   * @return {() => void} A callback that removes the subscription.
   */
  public addPointerDownListener(listener: PointerListener): () => void {
    this.pointerDownListeners.add(listener);
    return () => this.pointerDownListeners.delete(listener);
  }

  /**
   * Subscribes to normalized pointer-move events.
   * @param listener - Callback receiving the logical pointer position.
   * @public
   * @return {() => void} A callback that removes the subscription.
   */
  public addPointerMoveListener(listener: PointerListener): () => void {
    this.pointerMoveListeners.add(listener);
    return () => this.pointerMoveListeners.delete(listener);
  }

  /**
   * Subscribes to normalized pointer-up and pointer-cancel events.
   * @param listener - Callback receiving the logical pointer position.
   * @public
   * @return {() => void} A callback that removes the subscription.
   */
  public addPointerEndListener(listener: PointerListener): () => void {
    this.pointerEndListeners.add(listener);
    return () => this.pointerEndListeners.delete(listener);
  }

  /** Subscribes to wheel input normalized to game-canvas coordinates. */
  public addWheelListener(listener: WheelListener): () => void {
    this.wheelListeners.add(listener);
    return () => this.wheelListeners.delete(listener);
  }

  /** Registers a live hit test used to show a pointer cursor over game buttons. */
  public addPointerTarget(contains: (pointer: GamePointer) => boolean): () => void {
    this.pointerTargets.add(contains);
    return () => this.pointerTargets.delete(contains);
  }

  /**
   * Maps one browser event to the current logical canvas coordinate space.
   * @private
   * @return {GamePointer} The pointer in logical game coordinates.
   */
  private getGamePointer(event: Pick<MouseEvent, 'clientX' | 'clientY'> & { pointerId?: number }): GamePointer {
    const canvas = this.pointerCanvas;
    if (canvas === undefined) {
      throw new Error('Pointer input has not been initialized.');
    }

    const dimensions = GameContext.gameDimensionsModel;
    const bounds = canvas.getBoundingClientRect();
    const clientWidth = bounds.width > 0 ? bounds.width : dimensions.getWidth();
    const clientHeight = bounds.height > 0 ? bounds.height : dimensions.getHeight();
    return {
      id: event.pointerId ?? 0,
      x: (event.clientX - bounds.left) * dimensions.getWidth() / clientWidth,
      y: (event.clientY - bounds.top) * dimensions.getHeight() / clientHeight
    };
  }

  /**
   * Removes the browser listeners owned by the pointer subsystem.
   * @private
   * @return {void}
   */
  private removePointerEvents(): void {
    if (this.pointerCanvas === undefined) return;
    this.pointerCanvas.removeEventListener('pointerdown', this.onPointerDown);
    this.pointerCanvas.removeEventListener('pointermove', this.onPointerMove);
    this.pointerCanvas.removeEventListener('pointerup', this.onPointerEnd);
    this.pointerCanvas.removeEventListener('pointercancel', this.onPointerEnd);
    this.pointerCanvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.pointerCanvas.removeEventListener('wheel', this.onWheel);
    this.pointerCanvas = undefined;
  }

  /**
   * Reports whether a keyboard or touch pointer currently holds a key.
   * @public
   * @return {boolean}
   */
  public isKeyPressed(key: string): boolean {
    return (
      this.keys.has(key)
      || [...this.pointerKeys.values()].includes(key)
    );
  }

  /**
   * Associates a touch pointer with a virtual keyboard key.
   */
  public setPointerKey(pointerId: number, key: string | undefined): void {
    if (key === undefined) {
      this.pointerKeys.delete(pointerId);
      return;
    }

    this.pointerKeys.set(pointerId, key);
  }
}

const GameEvents = new Events();

export default GameEvents;
