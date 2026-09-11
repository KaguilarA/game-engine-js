export class Events {
  private keys = new Set<string>();

  private onKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.key);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.key);
  };

  public initEvents(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    this.keys.clear();
  }

  public isKeyPressed(key: string): boolean {
    return this.keys.has(key);
  }
}