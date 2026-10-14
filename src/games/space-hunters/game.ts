import GameContext from '../../engine/context';
import type { GamePointer } from '../../engine/context';
import CanvasIcon from '../../engine/canvas-icon';
import GameEvents from '../../engine/events';
import GameLoader from '../../engine/loader';
import { Boss } from './boss';
import type { BossType } from './boss';
import { Enemy } from './enemy';
import { Player } from './player';
import { Projectile } from './projectile';
import chevronLeftSvg from 'lucide-static/icons/chevron-left.svg?raw';
import chevronRightSvg from 'lucide-static/icons/chevron-right.svg?raw';
import crosshairSvg from 'lucide-static/icons/crosshair.svg?raw';
import heartSvg from 'lucide-static/icons/heart.svg?raw';
import maximizeSvg from 'lucide-static/icons/maximize.svg?raw';
import minimizeSvg from 'lucide-static/icons/minimize.svg?raw';
import pauseSvg from 'lucide-static/icons/pause.svg?raw';
import resetSvg from 'lucide-static/icons/rotate-ccw.svg?raw';

interface Circle {
  x: number;
  y: number;
  radius: number;
}

export class Game {
  private readonly pauseIcon = new CanvasIcon(pauseSvg);
  private readonly maximizeIcon = new CanvasIcon(maximizeSvg);
  private readonly minimizeIcon = new CanvasIcon(minimizeSvg);
  private readonly resetIcon = new CanvasIcon(resetSvg);
  private readonly leftIcon = new CanvasIcon(chevronLeftSvg);
  private readonly rightIcon = new CanvasIcon(chevronRightSvg);
  private readonly shootIcon = new CanvasIcon(crosshairSvg);
  private readonly fullHeartIcon = new CanvasIcon(heartSvg, '#ff5a6b');
  private readonly emptyHeartIcon = new CanvasIcon(heartSvg, '#5c657d');
  private readonly player = new Player();
  private readonly playerProjectiles: Projectile[] = [];
  private readonly enemyProjectiles: Projectile[] = [];
  private readonly enemies: Enemy[] = [];

  private boss: Boss | null = null;
  private bossShotTimer = 0;
  private wave = 1;
  private enemyDirection = 1;
  private enemySpeed = 75;
  private enemyShotTimer = 0;
  private lastFrameTime = performance.now();
  private lastPortrait = GameContext.isPortrait;
  private score = 0;
  private lives = 3;
  private gameOver = false;
  private paused = false;
  private shootCooldown = 0;
  private running = true;
  private readonly onReturnToMenu: (() => void) | undefined;
  private readonly pointerListenerCleanup: Array<() => void> = [];

  constructor(onReturnToMenu?: () => void) {
    this.onReturnToMenu = onReturnToMenu;
    this.initProjectiles();
    this.initEnemies();
    this.pointerListenerCleanup.push(
      GameContext.addPointerDownListener(this.handlePointerDown),
      GameContext.addPointerStartListener(this.handleTouchStart),
      GameContext.addPointerMoveListener(this.handleTouchMove),
      GameContext.addPointerEndListener(this.handleTouchEnd)
    );
    this.gameLoop();
  }

  private gameLoop = (time = performance.now()): void => {
    if (!this.running) return;

    const deltaSeconds = Math.min(
      (time - this.lastFrameTime) / 1000,
      0.05
    );

    this.lastFrameTime = time;
    this.update(deltaSeconds);
    this.draw();
    requestAnimationFrame(this.gameLoop);
  };

  private update(deltaSeconds: number): void {
    if (this.lastPortrait !== GameContext.isPortrait) {
      this.lastPortrait = GameContext.isPortrait;
      if (this.boss === null) {
        this.initEnemies();
      }
    }

    if (this.gameOver) {
      if (
        this.onReturnToMenu !== undefined
        && (
          GameEvents.isKeyPressed('m')
          || GameEvents.isKeyPressed('M')
          || GameEvents.isKeyPressed('Escape')
        )
      ) {
        this.returnToMenu();
      } else if (GameEvents.isKeyPressed('Enter')) {
        this.restart();
      }
      return;
    }

    if (this.paused) return;

    this.player.setBottomMargin(this.getPlayerBottomMargin());
    this.player.update(deltaSeconds);
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

  private draw(): void {
    GameContext.clear();
    this.drawBackground();

    this.enemies.forEach((enemy) => enemy.draw());
    this.boss?.draw();
    this.player.draw();
    this.playerProjectiles.forEach((projectile) => projectile.draw());
    this.enemyProjectiles.forEach((projectile) => projectile.draw());

    GameContext.drawText(
      `SCORE ${this.score}`,
      32,
      44,
      24,
      '#ffffff'
    );
    this.drawHudControls();
    this.drawTouchControls();

    if (this.boss !== null) {
      this.drawBossHealthBar();
    }

    if (this.gameOver) {
      const dimensions = GameContext.gameDimensionsModel;
      GameContext.drawText(
        'GAME OVER',
        dimensions.getWidth() * 0.5,
        dimensions.getHeight() * 0.5,
        72,
        '#ffffff',
        'center'
      );
      GameContext.drawText(
        'PRESS ENTER TO RESTART',
        dimensions.getWidth() * 0.5,
        dimensions.getHeight() * 0.5 + 56,
        24,
        '#ffffff',
        'center'
      );
      if (this.onReturnToMenu !== undefined) {
        GameContext.drawText(
          'PRESS M OR ESC TO RETURN TO MENU',
          dimensions.getWidth() * 0.5,
          dimensions.getHeight() * 0.5 + 90,
          20,
          '#ffffff',
          'center'
        );
      }
    }

    if (this.paused) {
      const dimensions = GameContext.gameDimensionsModel;
      this.drawCenteredIcon(
        this.pauseIcon,
        dimensions.getWidth() * 0.5,
        dimensions.getHeight() * 0.5,
        128
      );
    }
  }

  private drawHudControls(): void {
    const {
      pauseButton,
      fullscreenButton,
      resetButton,
      livesX,
      livesY
    } = this.getHudLayout();
    const activeLives = Math.max(0, this.lives);

    this.drawArcadeButton(
      pauseButton,
      this.paused ? '#2d7d46' : '#384a78'
    );
    this.drawCenteredIcon(
      this.pauseIcon,
      pauseButton.x,
      pauseButton.y,
      pauseButton.radius * 1.05
    );
    this.drawArcadeButton(
      fullscreenButton,
      '#466598'
    );
    this.drawCenteredIcon(
      GameContext.isFullscreen ? this.minimizeIcon : this.maximizeIcon,
      fullscreenButton.x,
      fullscreenButton.y,
      fullscreenButton.radius * 1.05
    );
    this.drawArcadeButton(resetButton, '#9c3e45');
    this.drawCenteredIcon(
      this.resetIcon,
      resetButton.x,
      resetButton.y,
      resetButton.radius * 1.05
    );

    for (let index = 0; index < 3; index++) {
      this.drawCenteredIcon(
        index < activeLives ? this.fullHeartIcon : this.emptyHeartIcon,
        livesX + index * 30,
        livesY,
        26
      );
    }
  }

  private drawTouchControls(): void {
    if (!GameContext.isMobileDevice) return;

    const controls = this.getTouchControlsLayout();

    this.drawTouchControl(controls.left, this.leftIcon);
    this.drawTouchControl(controls.shoot, this.shootIcon);
    this.drawTouchControl(controls.right, this.rightIcon);
  }

  private drawTouchControl(circle: Circle, icon: CanvasIcon): void {
    this.drawArcadeButton(
      circle,
      'rgba(48, 103, 214, 0.42)'
    );
    this.drawCenteredIcon(icon, circle.x, circle.y, circle.radius * 1.05);
  }

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
      18,
      '#ffffff',
      'center'
    );
  }

  private drawArcadeButton(
    circle: Circle,
    color: string
  ): void {
    GameContext.drawCircle(
      circle.x,
      circle.y,
      circle.radius,
      'rgba(9, 14, 38, 0.78)'
    );
    GameContext.drawCircle(circle.x, circle.y, circle.radius - 4, color);
    GameContext.drawCircle(
      circle.x,
      circle.y,
      circle.radius - 10,
      'rgba(19, 31, 76, 0.42)'
    );
    GameContext.drawCircle(
      circle.x - circle.radius * 0.28,
      circle.y - circle.radius * 0.28,
      circle.radius * 0.16,
      'rgba(255, 255, 255, 0.35)'
    );
  }

  private drawCenteredIcon(
    icon: CanvasIcon,
    x: number,
    y: number,
    size: number
  ): void {
    icon.draw(x - size * 0.5, y - size * 0.5, size);
  }

  private getHudLayout(): {
    pauseButton: Circle;
    fullscreenButton: Circle;
    resetButton: Circle;
    livesX: number;
    livesY: number;
  } {
    const dimensions = GameContext.gameDimensionsModel;
    const padding = 32;
    const buttonRadius = 34;
    const buttonDiameter = buttonRadius * 2;
    const gap = 12;
    const livesWidth = 86;
    const totalWidth = (
      buttonDiameter * 3
      + livesWidth
      + gap * 2
      + 20
    );
    const pauseX = dimensions.getWidth() - padding - totalWidth + buttonRadius;
    const fullscreenX = pauseX + buttonDiameter + gap;
    const resetX = fullscreenX + buttonDiameter + gap;

    return {
      pauseButton: {
        x: pauseX,
        y: 50,
        radius: buttonRadius
      },
      fullscreenButton: {
        x: fullscreenX,
        y: 50,
        radius: buttonRadius
      },
      resetButton: {
        x: resetX,
        y: 50,
        radius: buttonRadius
      },
      livesX: resetX + buttonRadius + 20,
      livesY: 50
    };
  }

  private getTouchControlsLayout(): {
    left: Circle;
    right: Circle;
    shoot: Circle;
  } {
    const dimensions = GameContext.gameDimensionsModel;
    const radius = Math.min(90, dimensions.getWidth() * 0.085);
    const margin = 44;
    const y = dimensions.getHeight() - radius - 52;

    return {
      left: {
        x: margin + radius,
        y,
        radius
      },
      right: {
        x: dimensions.getWidth() - margin - radius,
        y,
        radius
      },
      shoot: {
        x: dimensions.getWidth() * 0.5,
        y,
        radius
      }
    };
  }

  private getPlayerBottomMargin(): number {
    if (!GameContext.isMobileDevice) return 40;

    const controls = this.getTouchControlsLayout();
    const controlsTop = controls.shoot.y - controls.shoot.radius;

    return (
      GameContext.gameDimensionsModel.getHeight()
      - controlsTop
      + 32
    );
  }

  private handlePointerDown = (x: number, y: number): void => {
    const { pauseButton, fullscreenButton, resetButton } = this.getHudLayout();

    if (this.containsPointInCircle(resetButton, x, y)) {
      this.restart();
      return;
    }

    if (this.containsPointInCircle(fullscreenButton, x, y)) {
      void this.toggleFullscreen();
      return;
    }

    if (!this.gameOver && this.containsPointInCircle(pauseButton, x, y)) {
      this.paused = !this.paused;
    }
  };

  private async toggleFullscreen(): Promise<void> {
    try {
      await GameContext.toggleFullscreen();
    } catch (error) {
      console.error('Failed to change fullscreen mode.', error);
    }
  }

  private handleTouchStart = (pointer: GamePointer): void => {
    this.updateTouchPointer(pointer);
  };

  private handleTouchMove = (pointer: GamePointer): void => {
    this.updateTouchPointer(pointer);
  };

  private handleTouchEnd = (pointer: GamePointer): void => {
    GameEvents.setPointerKey(pointer.id, undefined);
  };

  private updateTouchPointer(pointer: GamePointer): void {
    if (!GameContext.isMobileDevice) return;

    const controls = this.getTouchControlsLayout();
    let key: string | undefined;

    if (this.containsPointInCircle(controls.left, pointer.x, pointer.y)) {
      key = 'ArrowLeft';
    } else if (
      this.containsPointInCircle(controls.right, pointer.x, pointer.y)
    ) {
      key = 'ArrowRight';
    } else if (
      this.containsPointInCircle(controls.shoot, pointer.x, pointer.y)
    ) {
      key = ' ';
    }

    GameEvents.setPointerKey(pointer.id, key);
  }

  private containsPointInCircle(circle: Circle, x: number, y: number): boolean {
    const distanceX = x - circle.x;
    const distanceY = y - circle.y;

    return distanceX * distanceX + distanceY * distanceY <= circle.radius ** 2;
  }

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

  private initEnemies(): void {
    this.enemies.length = 0;
    this.enemyDirection = 1;

    const columns = GameContext.isPortrait ? 5 : 8;
    const rows = 4;
    const enemyWidth = 72;
    const horizontalGap = 18;
    const formationWidth = (
      columns * enemyWidth
      + (columns - 1) * horizontalGap
    );
    const startX = (
      GameContext.gameDimensionsModel.getWidth() - formationWidth
    ) * 0.5;
    const startY = GameContext.isPortrait ? 220 : 150;

    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        this.enemies.push(
          new Enemy(
            startX + column * (enemyWidth + horizontalGap),
            startY + row * 82,
            row * 80,
            (rows - row) * 10,
            Math.min(3, row + 1)
          )
        );
      }
    }
  }

  private initProjectiles(): void {
    for (let i = 0; i < 12; i++) {
      this.playerProjectiles.push(new Projectile());
    }

    for (let i = 0; i < 24; i++) {
      this.enemyProjectiles.push(new Projectile());
    }
  }

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

  private updateBoss(deltaSeconds: number): void {
    if (this.boss === null) return;

    this.boss.update(
      deltaSeconds,
      GameContext.gameDimensionsModel.getWidth()
    );

    if (!this.boss.isAlive) {
      this.score += this.boss.points;
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

  private updateProjectiles(deltaSeconds: number): void {
    this.playerProjectiles.forEach((projectile) => {
      projectile.update(deltaSeconds);
    });
    this.enemyProjectiles.forEach((projectile) => {
      projectile.update(deltaSeconds);
    });
  }

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
            this.score += enemy.points;
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
            this.score += this.boss.points;
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

  private restart(): void {
    GameLoader.playAudio('newgame');
    this.score = 0;
    this.lives = 3;
    this.gameOver = false;
    this.paused = false;
    this.wave = 1;
    this.boss = null;
    this.bossShotTimer = 0;
    this.player.restoreHealth();
    this.enemySpeed = 75;
    this.playerProjectiles.forEach((projectile) => projectile.stop());
    this.enemyProjectiles.forEach((projectile) => projectile.stop());
    this.initEnemies();
  }

  private returnToMenu(): void {
    this.running = false;
    this.pointerListenerCleanup.forEach((cleanup) => cleanup());
    this.pointerListenerCleanup.length = 0;
    this.onReturnToMenu?.();
  }

  private spawnBoss(): void {
    const type = ((this.wave - 1) % 3 + 1) as BossType;
    const dimensions = GameContext.gameDimensionsModel;

    this.boss = new Boss(
      type,
      dimensions.getWidth() * 0.5,
      GameContext.isPortrait ? 300 : 220
    );
    this.bossShotTimer = 0.8;
    GameLoader.playAudio('scream');
  }

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

  private playExplosion(): void {
    const explosion = `boom${1 + Math.floor(Math.random() * 4)}`;
    GameLoader.playAudio(explosion);
  }
}
