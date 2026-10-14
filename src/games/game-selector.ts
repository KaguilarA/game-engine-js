import GameContext from '../engine/context';
import GameEvents from '../engine/events';
import GameLoader from '../engine/loader';
import { Game as SpaceHuntersGame } from './space-hunters/game';
import { SpacePatternsGame } from './space-patterns/game';

import { PolarityVanguardGame } from './polarity-vanguard/game';

type GameChoice = 'space-hunters' | 'polarity-vanguard' | 'space-patterns';

export class GameSelector {
  private readonly choices: GameChoice[] = [
    'space-hunters',
    'polarity-vanguard',
    'space-patterns'
  ];
  private selectedIndex = 0;
  private directionWasPressed = false;
  private started = false;
  private lastFrameTime = performance.now();

  public constructor() {
    GameContext.addPointerDownListener(this.handlePointerDown);
    this.gameLoop();
  }

  private gameLoop = (time = performance.now()): void => {
    if (this.started) return;

    const deltaSeconds = Math.min((time - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = time;
    this.update(deltaSeconds);
    this.draw();
    requestAnimationFrame(this.gameLoop);
  };

  private update(_: number): void {
    const directionPressed = (
      GameEvents.isKeyPressed('ArrowUp')
      || GameEvents.isKeyPressed('ArrowDown')
      || GameEvents.isKeyPressed('w')
      || GameEvents.isKeyPressed('s')
    );

    if (directionPressed && !this.directionWasPressed) {
      this.selectedIndex = (this.selectedIndex + 1) % this.choices.length;
    }

    this.directionWasPressed = directionPressed;

    if (
      GameEvents.isKeyPressed('Enter')
      || GameEvents.isKeyPressed(' ')
    ) {
      this.startSelectedGame();
    }
  }

  private draw(): void {
    const dimensions = GameContext.gameDimensionsModel;
    GameContext.clear();
    GameContext.drawImage(
      GameLoader.getImage(
        GameContext.isPortrait
          ? 'background1080x1920'
          : 'background1920x1080'
      ),
      0,
      0,
      dimensions.getWidth(),
      dimensions.getHeight()
    );
    GameContext.drawRect(
      0,
      0,
      dimensions.getWidth(),
      dimensions.getHeight(),
      'rgba(18, 18, 34, 0.76)'
    );
    GameContext.drawText(
      'ARCADE FRONTIER',
      dimensions.getWidth() * 0.5,
      dimensions.getHeight() * 0.2,
      64,
      '#ffffff',
      'center'
    );
    GameContext.drawText(
      'SELECT A MISSION',
      dimensions.getWidth() * 0.5,
      dimensions.getHeight() * 0.28,
      24,
      '#b6c5ff',
      'center'
    );

    this.drawChoice(
      'SPACE HUNTERS',
      'INSPIRED BY SPACE INVADERS',
      dimensions.getHeight() * 0.39,
      this.selectedIndex === 0
    );
    this.drawChoice(
      'POLARITY VANGUARD',
      'INSPIRED BY IKARUGA',
      dimensions.getHeight() * 0.56,
      this.selectedIndex === 1
    );
    this.drawChoice(
      'SPACE PATTERNS',
      'INSPIRED BY CANDY CRUSH',
      dimensions.getHeight() * 0.73,
      this.selectedIndex === 2
    );
    GameContext.drawText(
      'ARROWS / WASD SELECT   ENTER / SPACE START',
      dimensions.getWidth() * 0.5,
      dimensions.getHeight() * 0.91,
      20,
      '#ffffff',
      'center'
    );
  }

  private drawChoice(
    title: string,
    description: string,
    y: number,
    selected: boolean
  ): void {
    const dimensions = GameContext.gameDimensionsModel;
    const width = Math.min(900, dimensions.getWidth() * 0.75);
    const x = (dimensions.getWidth() - width) * 0.5;
    const color = selected ? '#426ea8' : '#242c42';

    GameContext.drawRect(x, y - 56, width, 132, color);
    GameContext.drawText(
      title,
      dimensions.getWidth() * 0.5,
      y,
      36,
      selected ? '#ffffff' : '#b6c5ff',
      'center'
    );
    GameContext.drawText(
      description,
      dimensions.getWidth() * 0.5,
      y + 42,
      26,
      '#ffffff',
      'center'
    );
  }

  private readonly handlePointerDown = (_: number, y: number): void => {
    if (this.started) return;

    const height = GameContext.gameDimensionsModel.getHeight();
    if (y >= height * 0.39 - 56 && y <= height * 0.39 + 76) {
      this.selectedIndex = 0;
      this.startSelectedGame();
    } else if (y >= height * 0.56 - 56 && y <= height * 0.56 + 76) {
      this.selectedIndex = 1;
      this.startSelectedGame();
    } else if (y >= height * 0.73 - 56 && y <= height * 0.73 + 76) {
      this.selectedIndex = 2;
      this.startSelectedGame();
    }
  };

  private startSelectedGame(): void {
    if (this.started) return;

    this.started = true;

    if (this.choices[this.selectedIndex] === 'space-hunters') {
      new SpaceHuntersGame(this.returnToMenu);
    } else if (this.choices[this.selectedIndex] === 'polarity-vanguard') {
      new PolarityVanguardGame(this.returnToMenu);
    } else {
      new SpacePatternsGame(this.returnToMenu);
    }
  }

  private readonly returnToMenu = (): void => {
    this.started = false;
    this.lastFrameTime = performance.now();
    this.gameLoop();
  };
}
