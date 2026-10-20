import GameContext from '../engine/core/context';
import GameEvents from '../engine/input/events';
import { GameControls } from '../engine/input/game-controls';
import GameLoader from '../engine/assets/loader';
import { Button } from '../engine/ui/button';
import { Label } from '../engine/ui/label';
import { Texture } from '../engine/rendering/texture';
import { Game as SpaceHuntersGame } from './space-hunters/game';
import { SpacePatternsGame } from './space-patterns/game';
import { TankFrontierGame } from './tank-frontier/game';
import { SlotMachineGame } from './slot-machine/game';
import { ShootEmAllGame } from './shoot-em-all/game';
import { MusketeersSlotGame } from './musketeers-slot/game';

import { PolarityVanguardGame } from './polarity-vanguard/game';
import type { GameChoice } from './interfaces/game-choice';

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
      title: 'THE THREE MUSKETEERS',
      description: 'FIVE-REEL ADVENTURE SLOT',
      start: (onReturnToMenu) => { new MusketeersSlotGame(onReturnToMenu); }
    },
    {
      title: 'SHOOT ’EM ALL',
      description: 'SURVIVE THE INVASION',
      start: (onReturnToMenu) => { new ShootEmAllGame(onReturnToMenu); }
    }
  ];
  private choiceButtons: Button[] = [];
  private readonly titleLabel = new Label('ARCADE FRONTIER', { align: 'center', baseline: 'middle', color: '#ffffff' });
  private readonly subtitleLabel = new Label('SELECT A MISSION', { align: 'center', baseline: 'middle', color: '#b6c5ff' });
  private readonly footerLabel = new Label('ARROWS / WASD SELECT   ENTER / SPACE START', { align: 'center', baseline: 'middle', color: '#ffffff' });
  private readonly choiceTitleLabels = this.choices.map((choice) => new Label(choice.title, { align: 'center', baseline: 'middle' }));
  private readonly choiceDescriptionLabels = this.choices.map((choice) => new Label(choice.description, { align: 'center', baseline: 'middle', color: '#ffffff' }));
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
    this.createChoiceButtons();
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
    const hoveredIndex = this.choiceButtons.findIndex((button) => button.state() === 'hover');
    if (hoveredIndex >= 0) this.selectedIndex = hoveredIndex;

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
    this.layoutLabel(this.titleLabel, dimensions.getWidth() * 0.5, dimensions.getHeight() * 0.12,
      dimensions.getWidth() * 0.88, 48, Math.max(20, Math.min(GameContext.viewportUnit() * 0.055, 38)));
    this.titleLabel.draw();
    this.controls.drawFullscreenOnly();
    this.layoutLabel(this.subtitleLabel, dimensions.getWidth() * 0.5, dimensions.getHeight() * 0.19,
      dimensions.getWidth() * 0.85, 24, Math.max(12, Math.min(GameContext.viewportUnit() * 0.024, 16)));
    this.subtitleLabel.draw();

    this.choices.forEach((choice, index) => {
      this.drawChoice(
        choice.title,
        choice.description,
        this.getChoiceY(index),
        this.selectedIndex === index,
        index
      );
    });
    this.layoutLabel(this.footerLabel, dimensions.getWidth() * 0.5, dimensions.getHeight() * 0.94,
      dimensions.getWidth() * 0.9, 22, Math.max(10, Math.min(GameContext.viewportUnit() * 0.02, 14)));
    this.footerLabel.draw();
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
    selected: boolean,
    index: number
  ): void {
    const dimensions = GameContext.gameDimensionsModel;
    const width = Math.min(460, dimensions.getWidth() * 0.8);
    const x = (dimensions.getWidth() - width) * 0.5;
    const height = this.getChoiceHeight();
    const color = selected ? '#426ea8' : '#242c42';
    const button = this.choiceButtons[index];
    button?.dimensions.setPosition(dimensions.getWidth() * 0.5, y);
    button?.dimensions.setSize(width, height);
    button?.dimensions.setPivot(0.5, 0.5);

    GameContext.drawRect(x, y - height * 0.5, width, height, color);
    if (selected) {
      GameContext.drawRect(x, y - height * 0.5, 4, height, '#72dcff');
    }
    const titleLabel = this.choiceTitleLabels[index];
    titleLabel.setText(title);
    this.layoutLabel(titleLabel, dimensions.getWidth() * 0.5, y - height * 0.08,
      width - 24, height * 0.48, Math.max(13, Math.min(height * 0.32, 18)));
    titleLabel.setStyle({ color: selected ? '#ffffff' : '#b6c5ff' });
    titleLabel.draw();
    const descriptionLabel = this.choiceDescriptionLabels[index];
    descriptionLabel.setText(description);
    this.layoutLabel(descriptionLabel, dimensions.getWidth() * 0.5, title ? y + height * 0.28 : y,
      width - 24, height * 0.38, Math.max(10, Math.min(height * 0.22, 13)));
    descriptionLabel.draw();
  }

  private layoutLabel(label: Label, x: number, y: number, width: number, height: number, fontSize: number): void {
    label.dimensions.setPosition(x, y);
    label.dimensions.setSize(width, height);
    label.dimensions.setPivot(0.5, 0.5);
    label.setStyle({ fontSize });
  }

  /**
   * Selects and launches the mission card tapped by the pointer.
   * @property {(x: number, y: number) => void} handlePointerDown
   * @private
   * @readonly
   */

  private createChoiceButtons(): void {
    this.choiceButtons = this.choices.map((_, index) => new Button(new Texture({}, 0, 0), {
      onClick: () => {
        if (this.started) return;
        this.selectedIndex = index;
        this.startSelectedGame();
      }
    }));
  }

  /**
   * Starts the selected game's factory and stops the selector loop.
   * @private
   * @return {void}
   */
  private startSelectedGame(): void {
    if (this.started) return;

    this.started = true;
    this.choiceButtons.forEach((button) => button.destroy());
    this.choiceButtons = [];
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
    this.createChoiceButtons();
    this.gameLoop();
  };
}
