import { signalValue } from 'reactive-values';

class Events {
  private readonly keys = new Set<string>();
  private readonly pointerKeys = new Map<number, string>();

  private readonly initialized = signalValue(false);

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.key);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.key);
  };

  constructor() {
    this.initEvents();
  }

  public initEvents(): void {
    if (this.initialized()) return;

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    this.initialized.set(true);
  }

  public destroy(): void {
    if (!this.initialized()) return;

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    this.keys.clear();
    this.pointerKeys.clear();
    this.initialized.set(false);
  }

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