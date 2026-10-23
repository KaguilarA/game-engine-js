import { signalValue } from 'reactive-values';
import {
  BaseGame,
  CanvasIcon,
  GameBackground,
  GameContext,
  GameEvents,
  GameLoader,
  TouchControls
} from '../../engine';
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
  private readonly touchControls = new TouchControls({ showVerticalControls: false });
  private readonly ball = signalValue<PinballBall | undefined>(undefined);
  private readonly lives = signalValue(3);
  private readonly score = signalValue(0);
  private readonly launched = signalValue(false);
  private readonly launchKeyHeld = signalValue(false);
  private readonly plungerCharge = signalValue(0);
  private readonly bumperCooldown = signalValue(0);

  public constructor(onReturnToMenu?: () => void) {
    super(onReturnToMenu, { showResetButton: false });
    this.registerCleanup(() => this.touchControls.dispose());
    const position = this.board.launchPosition();
    this.ball.set(new PinballBall(position.x, position.y, this.board.ballRadius()));
    this.start();
  }

  protected get isGameOver(): boolean { return this.lives() <= 0; }

  protected updateGame(deltaSeconds: number): void {
    this.board.update(deltaSeconds);
    const leftPressed = GameEvents.isKeyPressed('ArrowLeft') || GameEvents.isKeyPressed('a');
    const rightPressed = GameEvents.isKeyPressed('ArrowRight') || GameEvents.isKeyPressed('d');
    const spaceHeld = GameEvents.isKeyPressed(' ');
    const enterPressed = GameEvents.isKeyPressed('Enter');
    if (spaceHeld && !this.launchKeyHeld() && !this.launched()) this.plungerCharge.set(0);
    if (spaceHeld && !this.launched()) {
      this.plungerCharge.set(Math.min(1, this.plungerCharge() + deltaSeconds * 0.75));
    }
    if (!spaceHeld && this.launchKeyHeld()) this.launch();
    if (enterPressed && !this.launchKeyHeld()) this.launch();
    this.launchKeyHeld.set(spaceHeld || enterPressed);
    const bounds = this.board.bounds;
    this.leftFlipper.update(bounds, leftPressed, deltaSeconds);
    this.rightFlipper.update(bounds, rightPressed, deltaSeconds);
    if (!this.launched()) return;

    const ball = this.ball();
    if (ball === undefined) return;
    const stepCount = Math.max(1, Math.ceil(deltaSeconds / (1 / 120)));
    const stepSeconds = deltaSeconds / stepCount;
    let hitMask = 0;
    let flipperScore = 0;
    let flipperHit = false;
    let ballLost = false;
    for (let step = 0; step < stepCount; step++) {
      ball.update(stepSeconds);
      this.board.releaseFromShooter(ball);
      hitMask |= this.board.resolve(ball.body);
      const descending = ball.body.velocityY > 0;
      const leftHit = this.leftFlipper.collide(ball.body, leftPressed);
      const rightHit = this.rightFlipper.collide(ball.body, rightPressed);
      if (descending && ((leftHit && leftPressed) || (rightHit && rightPressed))) {
        flipperHit = true;
      }
      if (ball.body.y - ball.body.radius > bounds.y + bounds.height) {
        ballLost = true;
        break;
      }
    }
    if (flipperHit) flipperScore = 25;
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
    this.worldActors.setObjects([
      this.board,
      this.leftFlipper,
      this.rightFlipper,
      ...(this.ball() === undefined ? [] : [this.ball()!])
    ]);
    this.drawWorldScene();
    this.touchControls.draw();
    if (!this.launched() && !GameContext.isMobileDevice) {
      const panelWidth = Math.min(500, width * 0.9);
      const panelY = Math.min(height - 40, this.board.bounds.y + this.board.bounds.height + 12);
      GameContext.drawRect((width - panelWidth) * 0.5, panelY, panelWidth, 32, 'rgba(8, 17, 36, 0.88)');
      this.drawLabel('← / → FLIPPERS   •   HOLD SPACE, RELEASE TO LAUNCH', width * 0.5, panelY + 20,
        Math.max(10, Math.min(14, GameContext.viewportUnit() * 0.022)), '#d8e7ff', 'center', panelWidth - 18);
    }
  }

  protected restartGame(): void {
    this.lives.set(3);
    this.score.set(0);
    this.launched.set(false);
    this.launchKeyHeld.set(false);
    this.plungerCharge.set(0);
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
