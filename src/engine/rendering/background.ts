import { GameContext } from '../core';

/** Draws orientation-specific full-screen imagery and an optional color wash. */
class BackgroundRenderer {
  private static singleton: BackgroundRenderer | undefined;

  public static get instance(): BackgroundRenderer {
    if (BackgroundRenderer.singleton === undefined) {
      BackgroundRenderer.singleton = new BackgroundRenderer();
    }
    return BackgroundRenderer.singleton;
  }

  private constructor() {}

  public draw(
    portraitImage: CanvasImageSource,
    landscapeImage: CanvasImageSource,
    overlayColor?: string
  ): void {
    const dimensions = GameContext.gameDimensionsModel;
    const width = dimensions.getWidth();
    const height = dimensions.getHeight();
    GameContext.drawImage(
      GameContext.isPortrait ? portraitImage : landscapeImage,
      0,
      0,
      width,
      height
    );
    if (overlayColor !== undefined) {
      GameContext.drawRect(0, 0, width, height, overlayColor);
    }
  }
}

/** Shared stateless background renderer. */
export const GameBackground = BackgroundRenderer.instance;
