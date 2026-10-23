import GameContext from '../../engine/core/context';
import { BaseGame } from '../../engine/core/base-game';
import { Collision2D } from '../../engine/core/collision2d';
import GameEvents from '../../engine/input/events';
import { TouchControls } from '../../engine/input/touch-controls';
import { createLevel, type Coin, type Platform } from './level';
import { PlatformerRenderer } from './renderer';

/** A small, original side-scrolling platformer built with the shared engine. */
export class MeadowQuestGame extends BaseGame {
  private readonly touchControls = new TouchControls({ showVerticalControls: false });
  private readonly renderer = new PlatformerRenderer();
  private readonly worldWidth = 3600;
  private platforms: Platform[] = [];
  private coins: Coin[] = [];
  private playerX = 90;
  private playerY = 0;
  private velocityX = 0;
  private velocityY = 0;
  private grounded = false;
  private jumpWasPressed = false;
  private facing = 1;
  private cameraX = 0;
  private score = 0;
  private lives = 3;
  private won = false;
  private enemyX = 0;
  private enemyDirection = 1;
  private damageCooldown = 0;

  public constructor(onReturnToMenu?: () => void) {
    super(onReturnToMenu, { showResetButton: false });
    this.registerCleanup(() => this.touchControls.dispose());
    this.restartGame();
    this.start();
  }

  protected get isGameOver(): boolean { return this.lives <= 0 || this.won; }

  protected updateGame(deltaSeconds: number): void {
    this.damageCooldown = Math.max(0, this.damageCooldown - deltaSeconds);
    this.renderer.update(deltaSeconds, this.velocityX !== 0);
    const viewport = GameContext.gameDimensionsModel;
    const height = viewport.getHeight();
    const floor = height * 0.79;
    const left = GameEvents.isKeyPressed('ArrowLeft') || GameEvents.isKeyPressed('a');
    const right = GameEvents.isKeyPressed('ArrowRight') || GameEvents.isKeyPressed('d');
    const jump = GameEvents.isKeyPressed(' ') || GameEvents.isKeyPressed('ArrowUp') || GameEvents.isKeyPressed('w');
    const speed = Math.min(320, viewport.getWidth() * 0.7);
    this.velocityX = (right ? 1 : 0) - (left ? 1 : 0);
    if (this.velocityX !== 0) this.facing = Math.sign(this.velocityX);
    this.playerX = Math.max(18, Math.min(this.worldWidth - 100, this.playerX + this.velocityX * speed * deltaSeconds));

    if (jump && !this.jumpWasPressed && this.grounded) {
      this.velocityY = -Math.max(470, height * 1.08);
      this.grounded = false;
    }
    this.jumpWasPressed = jump;
    this.velocityY += Math.max(1250, height * 2.9) * deltaSeconds;
    const previousY = this.playerY;
    this.playerY += this.velocityY * deltaSeconds;
    this.grounded = false;

    const playerW = Math.max(25, height * 0.045);
    const playerH = playerW * 1.35;
    const worldFloor = floor;
    if (this.playerY + playerH >= worldFloor) {
      this.playerY = worldFloor - playerH;
      this.velocityY = 0;
      this.grounded = true;
    }
    for (const platform of this.platforms) {
      if (platform.kind === 'ground') continue;
      const result = Collision2D.resolveOneWayPlatform(
        this.playerX,
        this.playerY,
        playerW,
        playerH,
        previousY,
        this.velocityY,
        platform
      );
      if (result.landed) {
        this.playerY = result.resolvedY;
        this.velocityY = 0;
        this.grounded = true;
      }
    }

    this.enemyX += this.enemyDirection * 95 * deltaSeconds;
    if (this.enemyX < 760 || this.enemyX > 1050) this.enemyDirection *= -1;
    const enemyY = floor - playerH * 0.7;
    if (Math.abs(this.playerX - this.enemyX) < playerW * 0.8 && Math.abs(this.playerY - enemyY) < playerH * 0.7) {
      if (this.velocityY > 80 && this.playerY < enemyY) {
        this.velocityY = -height * 0.55;
        this.enemyX = -100;
        this.score += 100;
      } else if (this.damageCooldown <= 0) this.loseLife();
    }

    this.coins.forEach((coin) => {
      if (!coin.collected && Math.abs(this.playerX + playerW / 2 - coin.x) < playerW
        && Math.abs(this.playerY + playerH / 2 - coin.y) < playerH) {
        coin.collected = true;
        this.score += 50;
      }
    });
    if (this.playerY > height + 100) this.loseLife();
    if (this.playerX >= this.worldWidth - 140) this.won = true;
    this.cameraX = Math.max(0, Math.min(this.worldWidth - viewport.getWidth(), this.playerX - viewport.getWidth() * 0.36));
  }

  protected drawGame(): void {
    this.renderer.draw({
      cameraX: this.cameraX,
      playerX: this.playerX,
      playerY: this.playerY,
      facing: this.facing,
      score: this.score,
      lives: this.lives,
      won: this.won,
      enemyX: this.enemyX,
      moving: this.velocityX !== 0,
      platforms: this.platforms,
      coins: this.coins
    }, (text, x, y, size, color, align) => this.drawLabel(text, x, y, size, color, align));
    this.touchControls.draw();
  }

  protected restartGame(): void {
    const height = GameContext.gameDimensionsModel.getHeight();
    const level = createLevel(height, this.worldWidth);
    this.platforms = level.platforms;
    this.coins = level.coins;
    this.playerX = 90;
    this.playerY = height * 0.79 - Math.max(25, height * 0.045) * 1.35;
    this.velocityX = 0;
    this.velocityY = 0;
    this.grounded = true;
    this.jumpWasPressed = false;
    this.facing = 1;
    this.cameraX = 0;
    this.score = 0;
    this.lives = 3;
    this.won = false;
    this.enemyX = 850;
    this.enemyDirection = 1;
    this.damageCooldown = 0;
  }

  private loseLife(): void {
    this.lives -= 1;
    this.damageCooldown = 1;
    this.playerX = Math.max(20, this.playerX - 110);
    this.playerY = GameContext.gameDimensionsModel.getHeight() * 0.79 - Math.max(25, GameContext.gameDimensionsModel.getHeight() * 0.045) * 1.35;
    this.velocityY = 0;
    this.cameraX = Math.max(0, this.playerX - GameContext.gameDimensionsModel.getWidth() * 0.36);
  }

}
