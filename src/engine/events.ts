class Events {
  private readonly keys = new Set<string>();

  private initialized = false;

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
    if (this.initialized) return;

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    this.initialized = true;
  }

  public destroy(): void {
    if (!this.initialized) return;

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    this.keys.clear();
    this.initialized = false;
  }

  public isKeyPressed(key: string): boolean {
    return this.keys.has(key);
  }
}

const GameEvents = new Events();

export default GameEvents;