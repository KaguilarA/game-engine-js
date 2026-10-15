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
      dimensions.getHeight() * 0.12,
      Math.max(20, Math.min(GameContext.viewportUnit() * 0.055, 38)),
      '#ffffff',
      'center',
      dimensions.getWidth() * 0.88
    );
    this.controls.drawFullscreenOnly();
    GameContext.drawText(
      'SELECT A MISSION',
      dimensions.getWidth() * 0.5,
      dimensions.getHeight() * 0.19,
      Math.max(12, Math.min(GameContext.viewportUnit() * 0.024, 16)),
      '#b6c5ff',
      'center',
      dimensions.getWidth() * 0.85
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
      dimensions.getHeight() * 0.94,
      Math.max(10, Math.min(GameContext.viewportUnit() * 0.02, 14)),
      '#ffffff',
      'center',
      dimensions.getWidth() * 0.9
    );
  }

  private getChoiceHeight(): number {
    const dimensions = GameContext.gameDimensionsModel;
    const availableHeight = dimensions.getHeight() * 0.48;
    return Math.max(36, Math.min(availableHeight / 4.5, 54));
  }

  private getChoiceY(index: number): number {
    const dimensions = GameContext.gameDimensionsModel;
    const choiceHeight = this.getChoiceHeight();
    const gap = Math.max(6, Math.min(choiceHeight * 0.2, 12));
    const totalHeight = this.choices.length * choiceHeight + (this.choices.length - 1) * gap;
    const startY = dimensions.getHeight() * 0.26 + (dimensions.getHeight() * 0.6 - totalHeight) * 0.5;
    return startY + index * (choiceHeight + gap) + choiceHeight * 0.5;
  }

  private drawChoice(
    title: string,
    description: string,
    y: number,
    selected: boolean
  ): void {
    const dimensions = GameContext.gameDimensionsModel;
    const width = Math.min(460, dimensions.getWidth() * 0.8);
    const x = (dimensions.getWidth() - width) * 0.5;
    const height = this.getChoiceHeight();
    const color = selected ? '#426ea8' : '#242c42';

    GameContext.drawRect(x, y - height * 0.5, width, height, color);
    if (selected) {
      GameContext.drawRect(x, y - height * 0.5, 4, height, '#72dcff');
    }
    if (title) {
      GameContext.drawText(
        title,
        dimensions.getWidth() * 0.5,
        y - height * 0.08,
        Math.max(13, Math.min(height * 0.32, 18)),
        selected ? '#ffffff' : '#b6c5ff',
        'center',
        width - 24
      );
    }
    GameContext.drawText(
      description,
      dimensions.getWidth() * 0.5,
      title ? y + height * 0.28 : y,
      Math.max(10, Math.min(height * 0.22, 13)),
      '#ffffff',
      'center',
      width - 24
    );
  }

  private readonly handlePointerDown = (x: number, y: number): void => {
    if (this.started) return;

    const dimensions = GameContext.gameDimensionsModel;
    const width = Math.min(460, dimensions.getWidth() * 0.8);
    const minX = (dimensions.getWidth() - width) * 0.5;
    const maxX = minX + width;

    if (x < minX || x > maxX) return;

    for (let index = 0; index < this.choices.length; index++) {
      const choiceY = this.getChoiceY(index);
      const choiceHeight = this.getChoiceHeight();
      if (
        y >= choiceY - choiceHeight * 0.5
        && y <= choiceY + choiceHeight * 0.5
      ) {
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
