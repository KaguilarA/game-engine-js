import GameContext from '../../engine/context';
import { BaseGame } from '../../engine/base-game';
import CanvasIcon from '../../engine/canvas-icon';
import GameEvents from '../../engine/events';
import { TouchControls } from '../../engine/touch-controls';
import GameLoader from '../../engine/loader';
import { Boss } from './boss';
import type { BossType } from './boss';
import { Enemy } from './enemy';
import { Player } from './player';
import { Projectile } from './projectile';
import heartSvg from 'lucide-static/icons/heart.svg?raw';

/**
 * Space-invaders style game loop with scoring, waves, and boss encounters.
 * @class Game
 */
export class Game extends BaseGame {
  /**
   * Stores the touch controls state.
   * @property {TouchControls} touchControls
   * @private
   * @readonly
   */
  private readonly touchControls = new TouchControls({
    showVerticalControls: false
  });
  /**
   * Stores the full heart icon state.
   * @property {CanvasIcon} fullHeartIcon
   * @private
   * @readonly
   */
  private readonly fullHeartIcon = new CanvasIcon(heartSvg, '#ff5a6b', true);
  /**
   * Stores the empty heart icon state.
   * @property {CanvasIcon} emptyHeartIcon
   * @private
   * @readonly
   */
  private readonly emptyHeartIcon = new CanvasIcon(heartSvg, '#5c657d');
  /**
   * Stores the life pickup icon state.
   * @property {CanvasIcon} lifePickupIcon
   * @private
   * @readonly
   */
  private readonly lifePickupIcon = new CanvasIcon(heartSvg, '#ff5a6b', true);
  /**
   * Stores the player state.
   * @property {Player} player
   * @private
   * @readonly
   */
  private readonly player = new Player();
  /**
   * Stores the player projectiles state.
   * @property {Projectile[]} playerProjectiles
   * @private
   * @readonly
   */
  private readonly playerProjectiles: Projectile[] = [];
  /**
   * Stores the enemy projectiles state.
   * @property {Projectile[]} enemyProjectiles
   * @private
   * @readonly
   */
  private readonly enemyProjectiles: Projectile[] = [];
  /**
   * Stores the enemies state.
   * @property {Enemy[]} enemies
   * @private
   * @readonly
   */
  private readonly enemies: Enemy[] = [];

  /**
   * Stores the boss state.
   * @property {Boss | null} boss
   * @private
   */
  private boss: Boss | null = null;
  /**
   * Stores the boss shot timer state.
   * @property {number} bossShotTimer
   * @private
   */
  private bossShotTimer = 0;
  /**
   * Stores the wave state.
   * @property {number} wave
   * @private
   */
  private wave = 1;
  /**
   * Stores the enemy direction state.
   * @property {number} enemyDirection
   * @private
   */
  private enemyDirection = 1;
  /**
   * Stores the enemy speed state.
   * @property {number} enemySpeed
   * @private
   */
  private enemySpeed = 75;
  /**
   * Stores the enemy shot timer state.
   * @property {number} enemyShotTimer
   * @private
   */
  private enemyShotTimer = 0;
  /**
   * Stores the last portrait state.
   * @property {boolean} lastPortrait
   * @private
   */
  private lastPortrait = GameContext.isPortrait;
  /**
   * Stores the score state.
   * @property {number} score
   * @private
   */
  private score = 0;
  /**
   * Stores the lives state.
   * @property {number} lives
   * @private
   */
  private lives = 3;
  /**
   * Stores the next life score state.
   * @property {number} nextLifeScore
   * @private
   */
  private nextLifeScore = 1000;
  /**
   * Stores the life pickup state.
   * @property {{ x: number} lifePickup
   * @private
   */
  private lifePickup: { x: number; y: number; size: number } | undefined;
  /**
   * Stores the game over state.
   * @property {boolean} gameOver
   * @private
   */
  private gameOver = false;
  /**
   * Stores the shoot cooldown state.
   * @property {number} shootCooldown
   * @private
   */
  private shootCooldown = 0;

  /**
   * Initializes the player, first enemy wave, projectiles, and controls.
   * @public
   * @return {void}
   */
  constructor(onReturnToMenu?: () => void) {
    super(onReturnToMenu);
    this.initProjectiles();
    this.initEnemies();
    this.registerCleanup(() => this.touchControls.dispose());
    this.start();
  }

  /**
   * Reports whether the player has lost all remaining lives.
   * @protected
   * @return {boolean}
   */
  protected get isGameOver(): boolean {
    return this.gameOver;
  }

  /**
   * Advances formation movement, firing, pickups, and collision handling.
   * @protected
   * @return {void}
   */
  protected updateGame(deltaSeconds: number): void {
    if (this.lastPortrait !== GameContext.isPortrait) {
      this.lastPortrait = GameContext.isPortrait;
      if (this.boss === null) {
        this.initEnemies();
      }

    }

    this.player.setBottomMargin(this.getPlayerBottomMargin());
    this.player.update(deltaSeconds);
    this.updateLifePickup(deltaSeconds);
    this.updatePlayerShooting(deltaSeconds);
    this.updateEnemies(deltaSeconds);
    this.updateBoss(deltaSeconds);
    this.updateProjectiles(deltaSeconds);
    this.updateEnemyShooting(deltaSeconds);
    this.checkCollisions();

    if (
      this.boss === null
      && this.enemies.length > 0
      && this.enemies.every((enemy) => !enemy.isAlive)
    ) {
      this.spawnBoss();
    }

    if (this.boss !== null && !this.boss.isAlive) {
      this.boss = null;
      this.wave += 1;
      this.enemySpeed += 15;
      this.initEnemies();
    }
  }

  /**
   * Repositions playfield entities after canvas dimensions change.
   * @protected
   * @return {void}
   */
  protected onViewportChanged(): void {
    if (this.boss === null) {
      this.initEnemies();
    }
    this.playerProjectiles.forEach((projectile) => projectile.stop());
    this.enemyProjectiles.forEach((projectile) => projectile.stop());
  }

  /**
   * Draws the background, enemies, projectiles, HUD, and controls.
   * @protected
   * @return {void}
   */
  protected drawGame(): void {
    const hudScale = GameContext.isPortrait ? 1.2 : 1;
    const dimensions = GameContext.gameDimensionsModel;
    const unit = GameContext.viewportUnit();
    GameContext.clear();
    this.drawBackground();

    this.enemies.forEach((enemy) => enemy.draw());
    this.boss?.draw();
    this.drawLifePickup();
    this.player.draw();
    this.playerProjectiles.forEach((projectile) => projectile.draw());
    this.enemyProjectiles.forEach((projectile) => projectile.draw());

    GameContext.drawText(
      `SCORE ${this.score}`,
      24 * hudScale,
      36 * hudScale,
      Math.max(14, Math.min(unit * 0.035, 22)) * hudScale,
      '#ffffff',
      'left',
      dimensions.getWidth() * 0.35
    );
    this.drawHudControls();
    this.touchControls.draw();

    if (this.boss !== null) {
      this.drawBossHealthBar();
    }

    if (this.gameOver) {
      GameContext.drawText(
        'GAME OVER',
        dimensions.getWidth() * 0.5,
        dimensions.getHeight() * 0.45,
        Math.max(22, Math.min(unit * 0.065, 42)),
        '#ffffff',
        'center',
        dimensions.getWidth() * 0.85
      );
      GameContext.drawText(
        'USE THE ACTION BUTTONS BELOW',
        dimensions.getWidth() * 0.5,
        dimensions.getHeight() * 0.54,
        Math.max(12, Math.min(unit * 0.026, 18)),
        '#b6c5ff',
        'center',
        dimensions.getWidth() * 0.85
      );
    }
  }

  /**
   * Draws the score, lives, and touch-control row.
   * @private
   * @return {void}
   */
  private drawHudControls(): void {
    const { livesX, livesY } = this.getHudLayout();
    const activeLives = Math.max(0, this.lives);

    for (let index = 0; index < 3; index++) {
      this.drawCenteredIcon(
        index < activeLives ? this.fullHeartIcon : this.emptyHeartIcon,
        livesX + index * (GameContext.isPortrait ? 50 : 30),
        livesY,
        GameContext.isPortrait ? 46 : 26
      );
    }

  }

  /**
   * Draws the active boss health bar and shield state.
   * @private
   * @return {void}
   */
  private drawBossHealthBar(): void {
    if (this.boss === null) return;

    const dimensions = GameContext.gameDimensionsModel;
    const width = Math.min(520, dimensions.getWidth() - 96);
    const height = 34;
    const x = (dimensions.getWidth() - width) * 0.5;
    const y = 104;
    const innerPadding = 4;
    const healthWidth = Math.max(
      0,
      (width - innerPadding * 2) * this.boss.healthRatio
    );

    GameContext.drawRect(x, y, width, height, '#22172d');
    GameContext.drawRect(
      x + innerPadding,
      y + innerPadding,
      healthWidth,
      height - innerPadding * 2,
      this.boss.isShielded ? '#6fa8dc' : '#d95f5f'
    );
    GameContext.drawText(
      this.boss.name,
      x + width * 0.5,
      y + height * 0.68,
      16,
      '#ffffff',
      'center',
      width - 16
    );
  }

  /**
   * Draws an icon centered on the specified canvas position.
   * @private
   * @return {void}
   */
  private drawCenteredIcon(
    icon: CanvasIcon,
    x: number,
    y: number,
    size: number
  ): void {
    icon.draw(x - size * 0.5, y - size * 0.5, size);
  }

  /**
   * Calculates the responsive positions and sizes of HUD elements.
   * @private
   * @return {void}
   */
  private getHudLayout(): {
    livesX: number;
    livesY: number;
  } {
    return {
      livesX: GameContext.isPortrait ? 36 : 28,
      livesY: GameContext.isPortrait ? 86 : 64
    };
  }

  /**
   * Reserves the vertical area occupied by the mobile control row.
   * @private
   * @return {number}
   */
  private getPlayerBottomMargin(): number {
    if (!GameContext.isMobileDevice) return 40;
    return this.touchControls.layout.reservedBottom + 8;
  }

  /**
   * Draws the current orientation-specific background image.
   * @private
   * @return {void}
   */
  private drawBackground(): void {
    const dimensions = GameContext.gameDimensionsModel;
    const background = GameLoader.getImage(
      GameContext.isPortrait
        ? 'background1080x1920'
        : 'background1920x1080'
    );

    GameContext.drawImage(
      background,
      0,
      0,
      dimensions.getWidth(),
      dimensions.getHeight()
    );
  }

  /**
   * Creates the next enemy formation and sets its movement cadence.
   * @private
   * @return {void}
   */
  private initEnemies(): void {
    this.enemies.length = 0;
    this.enemyDirection = 1;

    const dimensions = GameContext.gameDimensionsModel;
    const unit = GameContext.viewportUnit();
    const columns = Math.max(3, Math.min(8, Math.floor(dimensions.getWidth() / 100)));
    const rows = 4;
    const enemyWidth = Math.max(28, Math.min(unit * 0.052, 48));
    const enemyHeight = enemyWidth * (64 / 72);
    const horizontalGap = Math.max(6, enemyWidth * 0.28);
    const formationWidth = (
      columns * enemyWidth
      + (columns - 1) * horizontalGap
    );
    const startX = (
      dimensions.getWidth() - formationWidth
    ) * 0.5;
    const startY = Math.max(64, unit * 0.14);

    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        this.enemies.push(
          new Enemy(
            startX + column * (enemyWidth + horizontalGap),
            startY + row * enemyHeight * 1.25,
            row * 80,
            (rows - row) * 10,
            Math.min(3, row + 1),
            enemyWidth,
            enemyHeight
          )
        );
      }
    }
  }

  /**
   * Preallocates the reusable player and enemy projectile pools.
   * @private
   * @return {void}
   */
  private initProjectiles(): void {
    for (let i = 0; i < 12; i++) {
      this.playerProjectiles.push(new Projectile());
    }

    for (let i = 0; i < 24; i++) {
      this.enemyProjectiles.push(new Projectile());
    }
  }

  /**
   * Moves the formation and resolves its edge reversal and descent.
   * @private
   * @return {void}
   */
  private updateEnemies(deltaSeconds: number): void {
    if (this.boss !== null) return;

    const aliveEnemies = this.enemies.filter((enemy) => enemy.isAlive);

    if (aliveEnemies.length === 0) return;

    aliveEnemies.forEach((enemy) => enemy.update(deltaSeconds));

    const dimensions = GameContext.gameDimensionsModel;
    const left = Math.min(...aliveEnemies.map((enemy) => enemy.x));
    const right = Math.max(
      ...aliveEnemies.map((enemy) => enemy.x + enemy.width)
    );
    const nextLeft = left + this.enemyDirection * this.enemySpeed * deltaSeconds;
    const nextRight = right + this.enemyDirection * this.enemySpeed * deltaSeconds;

    if (nextLeft <= 24 || nextRight >= dimensions.getWidth() - 24) {
      this.enemyDirection *= -1;
      aliveEnemies.forEach((enemy) => enemy.moveBy(0, 32));
    } else {
      aliveEnemies.forEach((enemy) => {
        enemy.moveBy(
          this.enemyDirection * this.enemySpeed * deltaSeconds,
          0
        );
      });
    }

    if (aliveEnemies.some((enemy) => enemy.dimensions.bottom() >= this.player.y)) {
      this.gameOver = true;
    }
  }

  /**
   * Advances the boss and marks its appearance as a firing phase.
   * @private
   * @return {void}
   */
  private updateBoss(deltaSeconds: number): void {
    if (this.boss === null) return;

    this.boss.update(
      deltaSeconds,
      GameContext.gameDimensionsModel.getWidth()
    );

    if (!this.boss.isAlive) {
      this.addScore(this.boss.points);
      return;
    }

    this.bossShotTimer -= deltaSeconds;

    if (this.bossShotTimer <= 0) {
      const origins = this.boss.getShotOrigins();

      origins.forEach((origin) => {
        const projectile = this.enemyProjectiles.find(
          (candidate) => candidate.isFree()
        );

        if (projectile) {
          projectile.start(origin.x, origin.y, 1);
        }
      });

      this.bossShotTimer = this.boss.type === 3
        ? 0.65
        : this.boss.type === 2
          ? 1.1
          : 0.9;
    }
  }

  /**
   * Advances both projectile pools for the current frame.
   * @private
   * @return {void}
   */
  private updateProjectiles(deltaSeconds: number): void {
    this.playerProjectiles.forEach((projectile) => {
      projectile.update(deltaSeconds);
    });
    this.enemyProjectiles.forEach((projectile) => {
      projectile.update(deltaSeconds);
    });
  }

  /**
   * Applies player fire input and enforces the shot cooldown.
   * @private
   * @return {void}
   */
  private updatePlayerShooting(deltaSeconds: number): void {
    this.shootCooldown -= deltaSeconds;

    const wantsToShoot = (
      GameEvents.isKeyPressed(' ')
      || GameEvents.isKeyPressed('Space')
      || GameEvents.isKeyPressed('1')
    );

    if (wantsToShoot && this.shootCooldown <= 0) {
      this.shootProjectile();
      this.shootCooldown = 0.22;
    }
  }

  /**
   * Schedules formation or boss attacks using available pooled bullets.
   * @private
   * @return {void}
   */
  private updateEnemyShooting(deltaSeconds: number): void {
    if (this.boss !== null) return;

    this.enemyShotTimer -= deltaSeconds;

    if (this.enemyShotTimer > 0) return;

    const aliveEnemies = this.enemies.filter((enemy) => enemy.isAlive);
    const shooter = aliveEnemies[
      Math.floor(Math.random() * aliveEnemies.length)
    ];
    const projectile = this.enemyProjectiles.find(
      (candidate) => candidate.isFree()
    );

    if (shooter && projectile) {
      projectile.start(
        shooter.x + shooter.width * 0.5,
        shooter.y + shooter.height,
        1
      );
    }

    this.enemyShotTimer = 0.8 + Math.random() * 0.8;
  }

  /**
   * Resolves player shots, enemy shots, pickups, and player damage.
   * @private
   * @return {void}
   */
  private checkCollisions(): void {
    this.playerProjectiles.forEach((projectile) => {
      if (projectile.isFree()) return;

      for (const enemy of this.enemies) {
        const hit = enemy.hit(
          projectile.x,
          projectile.y,
          projectile.width,
          projectile.height
        );

        if (hit) {
          projectile.stop();
          if (enemy.isDefeated) {
            this.addScore(enemy.points);
            this.playExplosion();
          }
          break;
        }
      }

      if (this.boss !== null && !projectile.isFree()) {
        if (this.boss.hit(
          projectile.x,
          projectile.y,
          projectile.width,
          projectile.height
        )) {
          projectile.stop();
          if (!this.boss.isAlive) {
            this.addScore(this.boss.points);
            GameLoader.playAudio('win');
          }
        }
      }
    });

    this.enemyProjectiles.forEach((projectile) => {
      if (
        !projectile.isFree()
        && this.overlaps(
          projectile.x,
          projectile.y,
          projectile.width,
          projectile.height,
          this.player.x,
          this.player.y,
          this.player.width,
          this.player.height
        )
      ) {
        projectile.stop();
        if (this.player.takeDamage()) {
          this.lives -= 1;
        }

        if (this.lives <= 0) {
          this.gameOver = true;
          GameLoader.playAudio('lose');
        }
      }
    });
  }

  /**
   * Tests two axis-aligned rectangles for overlap.
   * @private
   * @return {boolean} Whether the rectangles overlap.
   */
  private overlaps(
    leftA: number,
    topA: number,
    widthA: number,
    heightA: number,
    leftB: number,
    topB: number,
    widthB: number,
    heightB: number
  ): boolean {
    return (
      leftA < leftB + widthB
      && leftA + widthA > leftB
      && topA < topB + heightB
      && topA + heightA > topB
    );
  }

  /**
   * Adds score and spawns an extra-life pickup at score milestones.
   * @private
   * @return {void}
   */
  private addScore(points: number): void {
    this.score += points;

    while (this.score >= this.nextLifeScore) {
      if (this.lives < 3 && this.lifePickup === undefined) {
        this.spawnLifePickup();
      }

      this.nextLifeScore += 1000;
    }
  }

  /**
   * Creates a falling heart at a random position above the playfield.
   * @private
   * @return {void}
   */
  private spawnLifePickup(): void {
    const dimensions = GameContext.gameDimensionsModel;
    const size = GameContext.isPortrait ? 58 : 42;

    this.lifePickup = {
      x: 32 + Math.random() * (dimensions.getWidth() - size - 64),
      y: -size,
      size
    };
  }

  /**
   * Moves the heart and collects it when it overlaps the player.
   * @private
   * @return {void}
   */
  private updateLifePickup(deltaSeconds: number): void {
    if (this.lifePickup === undefined) return;

    this.lifePickup.y += 180 * deltaSeconds;
    const pickup = this.lifePickup;
    const dimensions = GameContext.gameDimensionsModel;

    if (pickup.y > dimensions.getHeight() + pickup.size) {
      this.lifePickup = undefined;
      return;
    }

    if (!this.overlaps(
      pickup.x,
      pickup.y,
      pickup.size,
      pickup.size,
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height
    )) {
      return;
    }

    this.lives = Math.min(3, this.lives + 1);
    this.lifePickup = undefined;
    GameLoader.playAudio('win');
  }

  /**
   * Draws the active falling heart.
   * @private
   * @return {void}
   */
  private drawLifePickup(): void {
    if (this.lifePickup === undefined) return;

    this.lifePickupIcon.draw(
      this.lifePickup.x,
      this.lifePickup.y,
      this.lifePickup.size
    );
  }

  /**
   * Resets player, score, wave, projectiles, bosses, and enemies.
   * @protected
   * @return {void}
   */
  protected restartGame(): void {
    GameLoader.playAudio('newgame');
    this.score = 0;
    this.lives = 3;
    this.nextLifeScore = 1000;
    this.lifePickup = undefined;
    this.controls.hideEndActions();
    this.gameOver = false;
    this.wave = 1;
    this.boss = null;
    this.bossShotTimer = 0;
    this.player.restoreHealth();
    this.enemySpeed = 75;
    this.playerProjectiles.forEach((projectile) => projectile.stop());
    this.enemyProjectiles.forEach((projectile) => projectile.stop());
    this.initEnemies();
  }

  /**
   * Creates the boss assigned to the current wave.
   * @private
   * @return {void}
   */
  private spawnBoss(): void {
    const type = ((this.wave - 1) % 3 + 1) as BossType;
    const dimensions = GameContext.gameDimensionsModel;
    const unit = GameContext.viewportUnit();
    const bossWidth = Math.max(80, Math.min(unit * 0.16, 140));
    const bossHeight = bossWidth * (170 / 190);

    this.boss = new Boss(
      type,
      dimensions.getWidth() * 0.5,
      GameContext.isPortrait ? 260 : 180,
      bossWidth,
      bossHeight
    );
    this.bossShotTimer = 0.8;
    GameLoader.playAudio('scream');
  }

  /**
   * Fires a player projectile and starts the ship's shooting animation.
   * @public
   * @return {void}
   */
  public shootProjectile(): void {
    const projectile = this.playerProjectiles.find(
      (candidate) => candidate.isFree()
    );

    if (!projectile) return;

    projectile.start(
      this.player.x + this.player.width * 0.5,
      this.player.y - projectile.height
    );
    this.player.shoot();
    GameLoader.playAudio('slide');
  }

  /**
   * Plays the shared enemy explosion sound effect.
   * @private
   * @return {void}
   */
  private playExplosion(): void {
    const explosion = `boom${1 + Math.floor(Math.random() * 4)}`;
    GameLoader.playAudio(explosion);
  }
}
