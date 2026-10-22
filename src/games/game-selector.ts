import GameContext from '../engine/core/context';
import { MathUtils } from '../engine/core/math-utils';
import GameEvents from '../engine/input/events';
import { GameControls } from '../engine/input/game-controls';
import GameLoader from '../engine/assets/loader';
import { Button } from '../engine/ui/button';
import { Label } from '../engine/ui/label';
import { Texture } from '../engine/rendering/texture';
import { GameBackground } from '../engine/rendering/background';
import { Game as SpaceHuntersGame } from './space-hunters/game';
import { SpacePatternsGame } from './space-patterns/game';
import { TankFrontierGame } from './tank-frontier';
import { SlotMachineGame } from './slot-machine/game';
import { ShootEmAllGame } from './shoot-em-all/game';
// import { MusketeersSlotGame } from './musketeers-slot/game';
import { ScratchCardGame } from './scratch-card/game';

import { PolarityVanguardGame } from './polarity-vanguard/game';
import type { GameChoice } from './interfaces/game-choice';
import { signalValue } from 'reactive-values';
import { Container } from '../engine/scene/container';
import { PachinkoGame } from './pachinko/game';
import { PinballGame } from './pinball/game';
import { MeadowQuestGame } from './meadow-quest/game';

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
    /*
    {
      title: 'THE THREE MUSKETEERS',
      description: 'FIVE-REEL ADVENTURE SLOT',
      start: (onReturnToMenu) => { new MusketeersSlotGame(onReturnToMenu); }
    },
    */
    {
      title: 'SHOOT ’EM ALL',
      description: 'SURVIVE THE INVASION',
      start: (onReturnToMenu) => { new ShootEmAllGame(onReturnToMenu); }
    },
    {
      title: 'LUCKY SCRATCH',
      description: 'SCRATCH THE CARD AND MATCH 3',
      start: (onReturnToMenu) => { new ScratchCardGame(onReturnToMenu); }
    },
    {
      title: 'PACHINKO KENO',
      description: 'DROP THE BALL, HIT THE MULTIPLIERS',
      start: (onReturnToMenu) => { new PachinkoGame(onReturnToMenu); }
    },
    {
      title: 'PINBALL',
      description: 'FLIP, BUMP, AND KEEP THE BALL ALIVE',
      start: (onReturnToMenu) => { new PinballGame(onReturnToMenu); }
    },
    {
      title: 'MEADOW QUEST',
      description: 'AN ORIGINAL SIDE-SCROLLING PLATFORM ADVENTURE',
      start: (onReturnToMenu) => { new MeadowQuestGame(onReturnToMenu); }
    }
  ];
  private readonly choicesContainer = new Container({ width: 0, height: 0, clipChildren: true, scrollable: true });
  private choiceButtons: Button[] = [];
  private readonly titleLabel = new Label('ARCADE FRONTIER', { align: 'center', baseline: 'middle', color: '#ffffff' });
  private readonly subtitleLabel = new Label('SELECT A MISSION', { align: 'center', baseline: 'middle', color: '#b6c5ff' });
  private readonly choiceTitleLabels = this.choices.map((choice) => new Label(choice.title, { align: 'center', baseline: 'middle' }));
  private readonly choiceDescriptionLabels = this.choices.map((choice) => new Label(choice.description, { align: 'center', baseline: 'middle', color: '#ffffff' }));
  /**
   * Stores the selected index state.
   * @property {number} selectedIndex
   * @private
   */
  private readonly selectedIndexState = signalValue(0);
  private readonly selectionNeedsVisibility = signalValue(true);
  private get selectedIndex(): number { return this.selectedIndexState(); }
  private set selectedIndex(value: number) { this.selectedIndexState.set(value); }
  /**
   * Stores the direction was pressed state.
   * @property {boolean} directionWasPressed
   * @private
   */
  private readonly directionWasPressedState = signalValue(false);
  private get directionWasPressed(): boolean { return this.directionWasPressedState(); }
  private set directionWasPressed(value: boolean) { this.directionWasPressedState.set(value); }
  /**
   * Stores the started state.
   * @property {boolean} started
   * @private
   */
  private readonly startedState = signalValue(false);
  private get started(): boolean { return this.startedState(); }
  private set started(value: boolean) { this.startedState.set(value); }
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

    const deltaSeconds = MathUtils.clamp((time - this.lastFrameTime) / 1000, 0, 0.05);
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
  private update(deltaSeconds: number): void {
    this.choicesContainer.update(deltaSeconds);
    const directionPressed = (
      GameEvents.isKeyPressed('ArrowUp')
      || GameEvents.isKeyPressed('ArrowDown')
      || GameEvents.isKeyPressed('w')
      || GameEvents.isKeyPressed('s')
    );

    if (directionPressed && !this.directionWasPressed) {
      this.selectedIndex = (this.selectedIndex + 1) % this.choices.length;
      this.selectionNeedsVisibility.set(true);
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
    GameBackground.draw(
      GameLoader.getImage('background1080x1920'),
      GameLoader.getImage('background1920x1080'),
      'rgba(18, 18, 34, 0.76)'
    );
    this.layoutLabel(this.titleLabel, dimensions.getWidth() * 0.5, dimensions.getHeight() * 0.12,
      dimensions.getWidth() * 0.88, 48, MathUtils.clamp(GameContext.viewportUnit() * 0.055, 20, 38));
    this.titleLabel.draw();
    this.controls.drawFullscreenOnly();
    this.layoutLabel(this.subtitleLabel, dimensions.getWidth() * 0.5, dimensions.getHeight() * 0.19,
      dimensions.getWidth() * 0.85, 24, Math.max(12, Math.min(GameContext.viewportUnit() * 0.024, 16)));
    this.subtitleLabel.draw();

    const listWidth = this.getChoiceWidth();
    const scrollGutter = 14;
    const listViewportTop = dimensions.getHeight() * 0.23;
    const listViewportHeight = dimensions.getHeight() * 0.68;
    this.choicesContainer.dimensions.setPosition(
      Math.max(0, (dimensions.getWidth() - listWidth) * 0.5),
      listViewportTop
    );
    this.choicesContainer.dimensions.setSize(listWidth + scrollGutter, listViewportHeight);
    if (this.selectionNeedsVisibility()) {
      const selectedY = this.getChoiceY(this.selectedIndex);
      const cardHeight = this.getChoiceHeight();
      let scrollY = this.choicesContainer.scrollY();
      if (selectedY - cardHeight * 0.5 - scrollY < 0) {
        scrollY = selectedY - cardHeight * 0.5;
      } else if (selectedY + cardHeight * 0.5 - scrollY > listViewportHeight) {
        scrollY = selectedY + cardHeight * 0.5 - listViewportHeight;
      }
      this.choicesContainer.setScrollY(scrollY);
      this.selectionNeedsVisibility.set(false);
    }
    this.choicesContainer.draw();
  }

  /**
   * Calculates a choice card height for the current viewport.
   * @private
   * @return {number}
   */
  private getChoiceHeight(): number {
    const dimensions = GameContext.gameDimensionsModel;
    const availableHeight = dimensions.getHeight() * 0.56;
    return Math.max(34, Math.min(availableHeight / 6.5, 54));
  }

  private getChoiceWidth(): number {
    const dimensions = GameContext.gameDimensionsModel;
    return Math.min(460, dimensions.getWidth() * 0.8);
  }

  /**
   * Returns the vertical center of a mission card.
   * @private
   * @return {number}
   */
  private getChoiceY(index: number): number {
    const choiceHeight = this.getChoiceHeight();
    const gap = Math.max(6, Math.min(choiceHeight * 0.2, 12));
    return choiceHeight * 0.5 + index * (choiceHeight + gap);
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
    const width = this.getChoiceWidth();
    const centerX = width * 0.5;
    const x = 0;
    const height = this.getChoiceHeight();
    const color = selected ? '#426ea8' : '#242c42';
    const button = this.choiceButtons[index];
    button?.dimensions.setPosition(
      this.choicesContainer.dimensions.left() + centerX,
      this.choicesContainer.dimensions.top() + y - this.choicesContainer.scrollY()
    );
    button?.dimensions.setSize(width, height);
    button?.dimensions.setPivot(0.5, 0.5);

    GameContext.drawRect(x, y - height * 0.5, width, height, color);
    if (selected) {
      GameContext.drawRect(x, y - height * 0.5, 4, height, '#72dcff');
    }
    const titleLabel = this.choiceTitleLabels[index];
    titleLabel.setText(title);
    this.layoutLabel(titleLabel, centerX, y - height * 0.08,
      width - 24, height * 0.48, Math.max(13, Math.min(height * 0.32, 18)));
    titleLabel.setStyle({ color: selected ? '#ffffff' : '#b6c5ff' });
    titleLabel.draw();
    const descriptionLabel = this.choiceDescriptionLabels[index];
    descriptionLabel.setText(description);
    this.layoutLabel(descriptionLabel, centerX, title ? y + height * 0.28 : y,
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
    this.choicesContainer.clear();
    this.choiceButtons = this.choices.map((_, index) => new Button(new Texture({}, 0, 0), {
      onClick: () => {
        if (this.started) return;
        this.selectedIndex = index;
        this.startSelectedGame();
      }
    }));
    this.choices.forEach((choice, index) => {
      this.choicesContainer.add({
        dimensions: this.choiceButtons[index].dimensions,
        draw: () => this.drawChoice(
          choice.title,
          choice.description,
          this.getChoiceY(index),
          this.selectedIndex === index || this.choiceButtons[index].state() === 'hover',
          index
        )
      });
    });
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
    this.choicesContainer.visible.set(false);
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
    this.choicesContainer.visible.set(true);
    this.choicesContainer.setScrollY(0);
    this.selectionNeedsVisibility.set(true);
    this.controls = new GameControls(() => {});
    this.createChoiceButtons();
    this.gameLoop();
  };
}
