import { signalValue } from 'reactive-values';

import GameContext from '../../engine/core/context';
import { BaseGame } from '../../engine/core/base-game';
import GameEvents from '../../engine/input/events';
import GameLoader from '../../engine/assets/loader';
import { GameBackground } from '../../engine/rendering/background';
import CanvasIcon from '../../engine/rendering/canvas-icon';
import { Button } from '../../engine/ui/button';
import { Texture } from '../../engine/rendering/texture';
import heartSvg from 'lucide-static/icons/heart.svg?raw';
import { PinballBall } from './ball';
import { PinballBoard } from './board';
import { PinballFlipper } from './flipper';

/** Pinball gameplay exercising reusable engine physics and collision entities. */
export class PinballGame extends BaseGame {
  private readonly fullHeartIcon = new CanvasIcon(heartSvg, '#ff5a6b', true);
  private readonly emptyHeartIcon = new CanvasIcon(heartSvg, '#5c657d');
  private readonly board = new PinballBoard();
  private readonly leftFlipper = new PinballFlipper('left');
  private readonly rightFlipper = new PinballFlipper('right');
  private readonly ball = signalValue<PinballBall | undefined>(undefined);
  private readonly lives = signalValue(3);
  private readonly score = signalValue(0);
  private readonly launched = signalValue(false);
  private readonly leftHeld = signalValue(false);
  private readonly rightHeld = signalValue(false);
  private readonly launchKeyHeld = signalValue(false);
  private readonly launchButtonHeld = signalValue(false);
  private readonly plungerCharge = signalValue(0);
  private readonly launchButton: Button;
  private readonly leftButton: Button;
  private readonly rightButton: Button;
  private readonly bumperCooldown = signalValue(0);

  public constructor(onReturnToMenu?: () => void) {
    super(onReturnToMenu, { showResetButton: false });
    this.launchButton = new Button(new Texture({}, 0, 0), {
      onClick: () => {},
      onPress: () => this.launchButtonHeld.set(true),
      onRelease: () => {
        if (this.launchButtonHeld()) this.launch();
        this.launchButtonHeld.set(false);
      }
    });
    this.leftButton = new Button(new Texture({}, 0, 0), {
      onClick: () => {}, onPress: () => this.leftHeld.set(true), onRelease: () => this.leftHeld.set(false)
    });
    this.rightButton = new Button(new Texture({}, 0, 0), {
      onClick: () => {}, onPress: () => this.rightHeld.set(true), onRelease: () => this.rightHeld.set(false)
    });
    this.registerCleanup(() => {
      this.launchButton.destroy();
      this.leftButton.destroy();
      this.rightButton.destroy();
    });
    const position = this.board.launchPosition();
    this.ball.set(new PinballBall(position.x, position.y, this.board.ballRadius()));
    this.start();
  }

  protected get isGameOver(): boolean { return this.lives() <= 0; }

  protected updateGame(deltaSeconds: number): void {
    this.board.update(deltaSeconds);
    const leftPressed = this.leftHeld() || GameEvents.isKeyPressed('ArrowLeft') || GameEvents.isKeyPressed('a');
    const rightPressed = this.rightHeld() || GameEvents.isKeyPressed('ArrowRight') || GameEvents.isKeyPressed('d');
    const spaceHeld = GameEvents.isKeyPressed(' ');
    const enterPressed = GameEvents.isKeyPressed('Enter');
    if (spaceHeld && !this.launchKeyHeld() && !this.launched()) this.plungerCharge.set(0);
    if ((spaceHeld || this.launchButtonHeld()) && !this.launched()) {
      this.plungerCharge.set(Math.min(1, this.plungerCharge() + deltaSeconds * 0.75));
    }
    if (!spaceHeld && this.launchKeyHeld()) this.launch();
    if (enterPressed && !this.launchKeyHeld()) this.launch();
    this.launchKeyHeld.set(spaceHeld || enterPressed);
    const bounds = this.board.bounds;
    this.leftFlipper.update(bounds, leftPressed, deltaSeconds);
    this.rightFlipper.update(bounds, rightPressed, deltaSeconds);
    this.leftButton.setDisabled(false);
    this.rightButton.setDisabled(false);
    this.launchButton.setDisabled(this.launched());
    if (!this.launched()) return;

    const ball = this.ball();
    if (ball === undefined) return;
    const stepCount = Math.max(1, Math.ceil(deltaSeconds / (1 / 120)));
    const stepSeconds = deltaSeconds / stepCount;
    let hitMask = 0;
    let flipperScore = 0;
    let ballLost = false;
    for (let step = 0; step < stepCount; step++) {
      ball.update(stepSeconds);
      this.board.releaseFromShooter(ball);
      hitMask |= this.board.resolve(ball.body);
      const descending = ball.body.velocityY > 0;
      const leftHit = this.leftFlipper.collide(ball.body);
      const rightHit = this.rightFlipper.collide(ball.body);
      if (descending && ((leftHit && leftPressed) || (rightHit && rightPressed))) {
        ball.body.setVelocity(ball.body.velocityX, Math.min(ball.body.velocityY, -260));
        flipperScore += 25;
      }
      if (ball.body.y - ball.body.radius > bounds.y + bounds.height) {
        ballLost = true;
        break;
      }
    }
    if (hitMask > 0 && this.bumperCooldown() <= 0) {
      this.score.set(this.score() + flipperScore + 100 * this.countBits(hitMask & 0b111)
        + 500 * this.countBits(hitMask >> 3));
      this.bumperCooldown.set(0.12);
    } else if (flipperScore > 0) {
      this.score.set(this.score() + flipperScore);
    }
    this.bumperCooldown.set(Math.max(0, this.bumperCooldown() - deltaSeconds));

    if (ballLost) {
      const remainingLives = this.lives() - 1;
      this.lives.set(remainingLives);
      this.launched.set(false);
      if (remainingLives > 0) {
        const start = this.board.launchPosition();
        this.ball.set(new PinballBall(start.x, start.y, this.board.ballRadius()));
      }
    }
  }

  protected drawGame(): void {
    const viewport = GameContext.gameDimensionsModel;
    const width = viewport.getWidth();
    const height = viewport.getHeight();
    GameContext.clear();
    GameBackground.draw(
      GameLoader.getImage('background1080x1920'),
      GameLoader.getImage('background1920x1080'),
      'rgba(8, 13, 31, 0.76)'
    );
    this.drawLabel('SPACE CADET', width * 0.5, Math.max(32, height * 0.06),
      Math.max(22, Math.min(36, GameContext.viewportUnit() * 0.055)), '#ffe18a', 'center', width * 0.84);
    this.drawLabel(`SCORE  ${this.score()}`, width * 0.5, height * 0.105,
      Math.max(14, Math.min(19, GameContext.viewportUnit() * 0.03)), '#ffffff', 'center', width * 0.86);
    this.drawLives(width, height);
    this.board.draw();
    const bounds = this.board.bounds;
    this.leftFlipper.update(bounds, this.leftHeld() || GameEvents.isKeyPressed('ArrowLeft') || GameEvents.isKeyPressed('a'), 0);
    this.rightFlipper.update(bounds, this.rightHeld() || GameEvents.isKeyPressed('ArrowRight') || GameEvents.isKeyPressed('d'), 0);
    this.leftFlipper.draw();
    this.rightFlipper.draw();
    this.ball()?.draw();
    this.drawControls(width, height);
    if (!this.launched()) {
      this.drawLabel('HOLD SPACE, RELEASE TO LAUNCH', width * 0.5, height * 0.94,
        Math.max(12, Math.min(16, GameContext.viewportUnit() * 0.024)), '#d8e7ff', 'center', width * 0.9);
    }
  }

  protected restartGame(): void {
    this.lives.set(3);
    this.score.set(0);
    this.launched.set(false);
    this.launchKeyHeld.set(false);
    this.launchButtonHeld.set(false);
    this.plungerCharge.set(0);
    this.leftHeld.set(false);
    this.rightHeld.set(false);
    this.bumperCooldown.set(0);
    const start = this.board.launchPosition();
    this.ball.set(new PinballBall(start.x, start.y, this.board.ballRadius()));
  }

  protected onViewportChanged(): void {
    if (this.launched()) return;
    const start = this.board.launchPosition();
    this.ball.set(new PinballBall(start.x, start.y, this.board.ballRadius()));
  }

  private launch(): void {
    if (this.launched() || this.lives() <= 0) return;
    const ball = this.ball();
    if (ball === undefined) return;
    const launchSpeed = 820 + this.plungerCharge() * 400;
    ball.body.setVelocity(0, -launchSpeed);
    this.plungerCharge.set(0);
    this.launched.set(true);
  }

  private drawControls(width: number, height: number): void {
    const buttonWidth = Math.min(112, width * 0.28);
    const buttonHeight = Math.max(40, Math.min(52, GameContext.viewportUnit() * 0.085));
    const y = height - buttonHeight * 0.65;
    this.configureButton(this.leftButton, width * 0.2, y, buttonWidth, buttonHeight);
    this.configureButton(this.rightButton, width * 0.8, y, buttonWidth, buttonHeight);
    this.configureButton(this.launchButton, width * 0.5, y, Math.min(150, width * 0.34), buttonHeight);
    GameContext.drawRect(width * 0.2 - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, '#d57745');
    GameContext.drawText('LEFT FLIP', width * 0.2, y + 5, 13, '#fff', 'center', buttonWidth - 8);
    GameContext.drawRect(width * 0.8 - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, '#d57745');
    GameContext.drawText('RIGHT FLIP', width * 0.8, y + 5, 13, '#fff', 'center', buttonWidth - 8);
    GameContext.drawRect(width * 0.5 - Math.min(150, width * 0.34) / 2, y - buttonHeight / 2,
      Math.min(150, width * 0.34), buttonHeight, '#236b72');
    GameContext.drawText('PLUNGER', width * 0.5, y + 5, 13, '#fff', 'center', Math.min(150, width * 0.34) - 8);
    if (this.launchButtonHeld() || this.launchKeyHeld()) {
      const chargeWidth = Math.min(150, width * 0.34) * this.plungerCharge();
      GameContext.drawRect(width * 0.5 - Math.min(150, width * 0.34) / 2,
        y + buttonHeight * 0.5 + 3, chargeWidth, 4, '#ffe36f');
    }
  }

  private configureButton(button: Button, x: number, y: number, width: number, height: number): void {
    button.dimensions.setPosition(x, y);
    button.dimensions.setSize(width, height);
    button.dimensions.setPivot(0.5, 0.5);
  }

  private drawLives(width: number, height: number): void {
    const size = Math.max(16, Math.min(24, GameContext.viewportUnit() * 0.034));
    const spacing = size + 5;
    const right = width * 0.94;
    const y = height * 0.105 - size * 0.5;
    for (let index = 0; index < 3; index++) {
      const icon = index < this.lives() ? this.fullHeartIcon : this.emptyHeartIcon;
      icon.draw(right - (2 - index) * spacing - size, y, size);
    }
  }

  private countBits(mask: number): number {
    let count = 0;
    for (let value = mask; value !== 0; value &= value - 1) count++;
    return count;
  }
}
