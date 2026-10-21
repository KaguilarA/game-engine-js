import { signalValue } from 'reactive-values';

import GameContext from '../../engine/core/context';
import { BaseGame } from '../../engine/core/base-game';
import { Collision2D } from '../../engine/core/collision2d';
import GameEvents from '../../engine/input/events';
import type { GamePointer } from '../../engine/interfaces/game-pointer';
import GameLoader from '../../engine/assets/loader';
import { GameBackground } from '../../engine/rendering/background';
import { Button } from '../../engine/ui/button';
import { Texture } from '../../engine/rendering/texture';
import { PachinkoBall } from './ball';
import { PachinkoBoard } from './board';

const BET = 5;
const PAYOUTS = [8, 4, 2, 1, 0, 1, 2, 4, 8] as const;

/** Pachinko-style Keno game used to exercise engine physics and collision primitives. */
export class PachinkoGame extends BaseGame {
  private readonly board = new PachinkoBoard();
  private readonly credits = signalValue(100);
  private readonly selectedLane = signalValue(4);
  private readonly ball = signalValue<PachinkoBall | undefined>(undefined);
  private readonly status = signalValue('SELECT A LANE, THEN DROP');
  private readonly dropKeyWasPressed = signalValue(false);
  private readonly dropButton: Button;
  private readonly removePointerListener: () => void;

  public constructor(onReturnToMenu?: () => void) {
    super(onReturnToMenu, { showResetButton: false });
    this.dropButton = new Button(new Texture({}, 0, 0), { onClick: () => this.dropBall() });
    this.registerCleanup(() => this.dropButton.destroy());
    this.removePointerListener = GameEvents.addPointerDownListener(this.handlePointerDown);
    this.registerCleanup(this.removePointerListener);
    this.start();
  }

  protected get isGameOver(): boolean {
    return this.credits() < BET && this.ball() === undefined;
  }

  protected updateGame(deltaSeconds: number): void {
    const dropPressed = GameEvents.isKeyPressed(' ') || GameEvents.isKeyPressed('Enter');
    if (dropPressed && !this.dropKeyWasPressed()) this.dropBall();
    this.dropKeyWasPressed.set(dropPressed);
    this.dropButton.setDisabled(this.ball() !== undefined || this.credits() < BET);

    const ball = this.ball();
    if (ball === undefined) return;
    const stepCount = Math.max(1, Math.ceil(deltaSeconds * 120));
    const stepSeconds = deltaSeconds / stepCount;
    for (let step = 0; step < stepCount; step++) {
      ball.update(stepSeconds);
      this.board.resolve(ball);
      if (ball.body.y - ball.body.radius > this.board.laneBottom) break;
    }
    if (ball.body.y - ball.body.radius <= this.board.laneBottom) return;

    const lane = this.board.laneAt(ball.body.x);
    const payout = BET * PAYOUTS[lane];
    this.credits.set(this.credits() + payout);
    this.status.set(payout > 0 ? `LANE ${lane + 1}  •  +${payout} CREDITS` : 'EMPTY LANE  •  TRY AGAIN');
    this.ball.set(undefined);
  }

  protected drawGame(): void {
    const dimensions = GameContext.gameDimensionsModel;
    const width = dimensions.getWidth();
    const height = dimensions.getHeight();
    GameContext.clear();
    GameBackground.draw(
      GameLoader.getImage('background1080x1920'),
      GameLoader.getImage('background1920x1080'),
      'rgba(7, 10, 27, 0.7)'
    );
    this.board.draw(this.selectedLane(), PAYOUTS);
    this.ball()?.draw();

    this.drawLabel('PACHINKO KENO', width * 0.5, Math.max(34, height * 0.065),
      Math.max(20, Math.min(34, GameContext.viewportUnit() * 0.052)), '#ffe18a', 'center', width * 0.84);
    this.drawLabel(`CREDITS  ${this.credits()}     BET  ${BET}`, width * 0.5, height * 0.115,
      Math.max(14, Math.min(20, GameContext.viewportUnit() * 0.03)), '#ffffff', 'center', width * 0.86);
    this.drawLabel(this.status(), width * 0.5, height * 0.94,
      Math.max(12, Math.min(16, GameContext.viewportUnit() * 0.024)), '#d8e7ff', 'center', width * 0.86);
    this.drawDropButton(width, height);
  }

  protected restartGame(): void {
    this.credits.set(100);
    this.selectedLane.set(4);
    this.ball.set(undefined);
    this.status.set('SELECT A LANE, THEN DROP');
    this.dropKeyWasPressed.set(false);
  }

  private readonly handlePointerDown = (pointer: GamePointer): void => {
    if (this.controls.isPaused || this.ball() !== undefined) return;
    const bounds = this.board.bounds;
    if (!Collision2D.containsPoint(
      pointer.x, pointer.y, bounds.x, bounds.y, bounds.width, bounds.height
    )) return;
    this.selectedLane.set(this.board.laneAt(pointer.x));
  };

  private dropBall(): void {
    if (this.ball() !== undefined || this.credits() < BET) return;
    const radius = Math.max(7, Math.min(10, GameContext.viewportUnit() * 0.015));
    this.credits.set(this.credits() - BET);
    this.status.set('GOOD LUCK!');
    this.ball.set(new PachinkoBall(
      this.board.laneCenter(this.selectedLane()),
      this.board.launchY(radius),
      radius
    ));
  }

  private drawDropButton(width: number, height: number): void {
    const buttonWidth = Math.min(190, width * 0.42);
    const buttonHeight = Math.max(42, Math.min(54, GameContext.viewportUnit() * 0.09));
    const x = width * 0.5;
    const y = Math.min(height - buttonHeight * 0.5 - 28, this.board.bounds.y + this.board.bounds.height + 40);
    this.dropButton.dimensions.setPosition(x, y);
    this.dropButton.dimensions.setSize(buttonWidth, buttonHeight);
    this.dropButton.setDisabled(this.ball() !== undefined || this.credits() < BET);
    const disabled = this.ball() !== undefined || this.credits() < BET;
    GameContext.drawRect(x - buttonWidth * 0.5, y - buttonHeight * 0.5, buttonWidth, buttonHeight, '#11172e');
    GameContext.drawRect(x - buttonWidth * 0.5 + 3, y - buttonHeight * 0.5 + 3,
      buttonWidth - 6, buttonHeight - 6, disabled ? '#515b71' : '#d57b27');
    GameContext.drawText('DROP BALL  •  SPACE', x, y + buttonHeight * 0.12,
      Math.max(13, buttonHeight * 0.29), '#ffffff', 'center', buttonWidth - 12);
  }
}
