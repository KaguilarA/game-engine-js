import GameContext from '../engine/context';
import GameEvents from '../engine/events';
import { GameControls } from '../engine/game-controls';
import GameLoader from '../engine/loader';
import { Game as SpaceHuntersGame } from './space-hunters/game';
import { SpacePatternsGame } from './space-patterns/game';
import { TankFrontierGame } from './tank-frontier/game';

import { PolarityVanguardGame } from './polarity-vanguard/game';

type GameChoice =
  | 'space-hunters'
  | 'polarity-vanguard'
  | 'space-patterns'
  | 'tank-frontier';

export class GameSelector {
  private readonly choices: GameChoice[] = [
    'space-hunters',
    'polarity-vanguard',
    'space-patterns',
    'tank-frontier'
  ];
  private selectedIndex = 0;
  private directionWasPressed = false;
  private started = false;
  private lastFrameTime = performance.now();
  private controls: GameControls;

  public constructor() {
    this.controls = new GameControls(() => {});
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
    this.controls.drawFullscreenOnly();
    GameContext.drawText(
      'SELECT A MISSION',
      dimensions.getWidth() * 0.5,
      dimensions.getHeight() * 0.28,
      24,
      '#b6c5ff',
      'center'
    );

    const choices = [
      ['SPACE HUNTERS', 'INSPIRED BY SPACE INVADERS'],
      ['POLARITY VANGUARD', 'INSPIRED BY IKARUGA'],
      ['SPACE PATTERNS', 'INSPIRED BY CANDY CRUSH'],
      ['TANK FRONTIER', 'INSPIRED BY BATTLE CITY']
    ];
    choices.forEach(([title, description], index) => {
      this.drawChoice(
        title,
        description,
        this.getChoiceY(index),
        this.selectedIndex === index
      );
    });
    GameContext.drawText(
      'ARROWS / WASD SELECT   ENTER / SPACE START',
      dimensions.getWidth() * 0.5,
      dimensions.getHeight() * 0.96,
      20,
      '#ffffff',
      'center'
    );
  }

  private getChoiceY(index: number): number {
    return GameContext.gameDimensionsModel.getHeight() * (0.31 + index * 0.16);
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
    if (title) {
      GameContext.drawText(
        title,
        dimensions.getWidth() * 0.5,
        y,
        36,
        selected ? '#ffffff' : '#b6c5ff',
        'center'
      );
    }
    GameContext.drawText(
      description,
      dimensions.getWidth() * 0.5,
      title ? y + 42 : y + 20,
      26,
      '#ffffff',
      'center'
    );
  }

  private readonly handlePointerDown = (_: number, y: number): void => {
    if (this.started) return;

    for (let index = 0; index < this.choices.length; index++) {
      const choiceY = this.getChoiceY(index);
      if (y >= choiceY - 56 && y <= choiceY + 76) {
        this.selectedIndex = index;
        this.startSelectedGame();
        return;
      }
    }
  };

  private startSelectedGame(): void {
    if (this.started) return;

    this.started = true;
    this.controls.dispose();

    if (this.choices[this.selectedIndex] === 'space-hunters') {
      new SpaceHuntersGame(this.returnToMenu);
    } else if (this.choices[this.selectedIndex] === 'polarity-vanguard') {
      new PolarityVanguardGame(this.returnToMenu);
    } else if (this.choices[this.selectedIndex] === 'space-patterns') {
      new SpacePatternsGame(this.returnToMenu);
    } else {
      new TankFrontierGame(this.returnToMenu);
    }
  }

  private readonly returnToMenu = (): void => {
    this.started = false;
    this.lastFrameTime = performance.now();
    this.controls = new GameControls(() => {});
    this.gameLoop();
  };
}
