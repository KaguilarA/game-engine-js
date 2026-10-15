import GameContext from '../engine/context';
import GameEvents from '../engine/events';
import type { GamePointer } from '../engine/events';
import { GameControls } from '../engine/game-controls';
import GameLoader from '../engine/loader';
import { Game as SpaceHuntersGame } from './space-hunters/game';
import { SpacePatternsGame } from './space-patterns/game';
import { TankFrontierGame } from './tank-frontier/game';
import { SlotMachineGame } from './slot-machine/game';
import { ShootEmAllGame } from './shoot-em-all/game';

import { PolarityVanguardGame } from './polarity-vanguard/game';

/**
 * Display information and factory for one selectable game.
 */
interface GameChoice {
  /**
   * Stores the title state.
   * @property {string} title
   * @public
   */
  title: string;
  /**
   * Stores the description state.
   * @property {string} description
   * @public
   */
  description: string;
  start: (onReturnToMenu: () => void) => void;
}

/**
 * Presents the game list and starts the selected game.
 * @class GameSelector
 */
export class GameSelector {
  /**
   * Stores the choices state.
   * @property {GameChoice[]} choices
   * @private
   * @readonly
   */
  private readonly choices: GameChoice[] = [
    {
      title: 'SPACE HUNTERS',
      description: 'INSPIRED BY SPACE INVADERS',
      start: (onReturnToMenu) => { new SpaceHuntersGame(onReturnToMenu); }
    },
    {
      title: 'POLARITY VANGUARD',
      description: 'INSPIRED BY IKARUGA',
      start: (onReturnToMenu) => { new PolarityVanguardGame(onReturnToMenu); }
    },
    {
      title: 'SPACE PATTERNS',
      description: 'INSPIRED BY CANDY CRUSH',
      start: (onReturnToMenu) => { new SpacePatternsGame(onReturnToMenu); }
    },
    {
      title: 'TANK FRONTIER',
      description: 'INSPIRED BY BATTLE CITY',
      start: (onReturnToMenu) => { new TankFrontierGame(onReturnToMenu); }
    },
    {
      title: 'COSMIC JACKPOT',
      description: 'THREE-REEL SLOT MACHINE',
      start: (onReturnToMenu) => { new SlotMachineGame(onReturnToMenu); }
    },
    {
      title: 'SHOOT ’EM ALL',
      description: 'SURVIVE THE INVASION',
      start: (onReturnToMenu) => { new ShootEmAllGame(onReturnToMenu); }
    }
  ];
  /**
   * Stores the selected index state.
   * @property {number} selectedIndex
   * @private
   */
  private selectedIndex = 0;
  /**
   * Stores the direction was pressed state.
   * @property {boolean} directionWasPressed
   * @private
   */
  private directionWasPressed = false;
  /**
   * Stores the started state.
   * @property {boolean} started
   * @private
   */
  private started = false;
  /**
   * Stores the last frame time state.
   * @property {number} lastFrameTime
   * @private
   */
  private lastFrameTime = performance.now();
  /**
   * Stores the controls state.
   * @property {GameControls} controls
   * @private
   */
  private controls: GameControls;

  /**
   * Creates the selector, installs its controls, and starts its render loop.
   * @public
   * @return {void}
   */
  public constructor() {
    this.controls = new GameControls(() => {});
    GameEvents.addPointerDownListener(this.handlePointerDown);
    this.gameLoop();
  }

  /**
   * Runs one selector update/draw cycle and schedules the next frame.
   * @property {(time?: number) => void} gameLoop
   * @private
   */
  private gameLoop = (time = performance.now()): void => {
    if (this.started) return;

    const deltaSeconds = Math.min((time - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = time;
    this.update(deltaSeconds);
    this.draw();
    requestAnimationFrame(this.gameLoop);
  };

  /**
   * Updates mission selection from keyboard input.
   * @private
   * @return {void}
   */
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

  /**
   * Draws the selector background, title, choices, and shared controls.
   * @private
   * @return {void}
   */
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

    this.choices.forEach((choice, index) => {
      this.drawChoice(
        choice.title,
        choice.description,
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

  /**
   * Calculates a choice card height for the current viewport.
   * @private
   * @return {number}
   */
  private getChoiceHeight(): number {
    const dimensions = GameContext.gameDimensionsModel;
    const availableHeight = dimensions.getHeight() * 0.48;
    return Math.max(36, Math.min(availableHeight / 4.5, 54));
  }

  /**
   * Returns the vertical center of a mission card.
   * @private
   * @return {number}
   */
  private getChoiceY(index: number): number {
    const dimensions = GameContext.gameDimensionsModel;
    const choiceHeight = this.getChoiceHeight();
    const gap = Math.max(6, Math.min(choiceHeight * 0.2, 12));
    const totalHeight = this.choices.length * choiceHeight + (this.choices.length - 1) * gap;
    const startY = dimensions.getHeight() * 0.26 + (dimensions.getHeight() * 0.6 - totalHeight) * 0.5;
    return startY + index * (choiceHeight + gap) + choiceHeight * 0.5;
  }

  /**
   * Draws one mission card with a selected or idle style.
   * @private
   * @return {void}
   */
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

  /**
   * Selects and launches the mission card tapped by the pointer.
   * @property {(x: number, y: number) => void} handlePointerDown
   * @private
   * @readonly
   */
  private readonly handlePointerDown = (pointer: GamePointer): void => {
    if (this.started) return;
    const { x, y } = pointer;

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

  /**
   * Starts the selected game's factory and stops the selector loop.
   * @private
   * @return {void}
   */
  private startSelectedGame(): void {
    if (this.started) return;

    this.started = true;
    this.controls.dispose();

    this.choices[this.selectedIndex].start(this.returnToMenu);
  }

  /**
   * Restarts the selector loop when a game returns to the menu.
   * @property {() => void} returnToMenu
   * @private
   * @readonly
   */
  private readonly returnToMenu = (): void => {
    this.started = false;
    this.lastFrameTime = performance.now();
    this.controls = new GameControls(() => {});
    this.gameLoop();
  };
}
