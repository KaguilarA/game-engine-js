type AudioEventName = 'error' | 'canplaythrough';

export class TestAudio {
  public currentTime = 0;
  public preload = '';
  private readonly listeners = new Map<AudioEventName, () => void>();

  public constructor(_: string) {}

  public addEventListener(type: AudioEventName, listener: () => void): void {
    this.listeners.set(type, listener);
  }

  public load(): void {
    queueMicrotask(() => this.listeners.get('canplaythrough')?.());
  }

  public cloneNode(): TestAudio {
    return this;
  }

  public play(): Promise<void> {
    return Promise.resolve();
  }
}
