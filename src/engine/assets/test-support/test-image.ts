type ImageEventName = 'error' | 'load';
type ImageListener = () => void;

export class TestImage {
  private readonly listeners = new Map<ImageEventName, ImageListener>();

  public addEventListener(type: ImageEventName, listener: ImageListener): void {
    this.listeners.set(type, listener);
  }

  public set src(_: string) {
    queueMicrotask(() => this.listeners.get('load')?.());
  }
}
