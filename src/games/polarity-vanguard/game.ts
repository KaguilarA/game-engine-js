import GameContext from '../../engine/context';
import type { GamePointer } from '../../engine/context';
import { BaseGame } from '../../engine/base-game';
import CanvasIcon from '../../engine/canvas-icon';
import GameEvents from '../../engine/events';
import GameLoader from '../../engine/loader';
import { signalValue } from 'reactive-values';

import { PolarityVanguardEnemy } from './enemy';
import type { Polarity } from './polarity';
import { POLARITY_COLORS } from './polarity';
import { PolarityVanguardPlayer } from './player';
import { PolarityProjectile } from './projectile';
import arrowLeftRightSvg from 'lucide-static/icons/arrow-left-right.svg?raw';
import chevronLeftSvg from 'lucide-static/icons/chevron-left.svg?raw';
import chevronRightSvg from 'lucide-static/icons/chevron-right.svg?raw';
import chevronDownSvg from 'lucide-static/icons/chevron-down.svg?raw';
import chevronUpSvg from 'lucide-static/icons/chevron-up.svg?raw';
import crosshairSvg from 'lucide-static/icons/crosshair.svg?raw';
import heartSvg from 'lucide-static/icons/heart.svg?raw';

interface Circle {
  x: number;
  y: number;
  radius: number;
}

interface LifePickup {
  x: number;
  y: number;
  size: number;
}

export class PolarityVanguardGame extends BaseGame {
  private readonly leftIcon = new CanvasIcon(chevronLeftSvg);
  private readonly rightIcon = new CanvasIcon(chevronRightSvg);
  private readonly upIcon = new CanvasIcon(chevronUpSvg);
  private readonly downIcon = new CanvasIcon(chevronDownSvg);
  private readonly shootIcon = new CanvasIcon(crosshairSvg);
  private readonly polarityIcon = new CanvasIcon(arrowLeftRightSvg);
  private readonly fullHeartIcon = new CanvasIcon(heartSvg, '#ff5a6b', true);
  private readonly emptyHeartIcon = new CanvasIcon(heartSvg, '#5c657d');
  private readonly lifePickupIcon = new CanvasIcon(heartSvg, '#ff5a6b', true);
  private readonly player = new PolarityVanguardPlayer();
  private readonly enemies: PolarityVanguardEnemy[] = [];
  private readonly playerProjectiles: PolarityProjectile[] = [];
  private readonly enemyProjectiles: PolarityProjectile[] = [];
  private shootCooldown = 0;
  private enemyShotCooldown = 1;
  private score = 0;
  private absorbedShots = 0;
  private chain = 0;
  private gameOver = false;
  private readonly lives = signalValue(3);
  private readonly nextLifeScore = signalValue(1000);
  private readonly lifePickup = signalValue<LifePickup | undefined>(undefined);
  private readonly damageCooldown = signalValue(0);
  private readonly pointerListenerCleanup: Array<() => void> = [];

  public constructor(onReturnToMenu?: () => void) {
    super(onReturnToMenu);
    this.createProjectiles();
    this.createFormation();
    this.pointerListenerCleanup.push(
      GameContext.addPointerStartListener(this.handleTouchStart),
      GameContext.addPointerMoveListener(this.handleTouchMove),
      GameContext.addPointerEndListener(this.handleTouchEnd)
    );
    this.start();
  }

  protected get isGameOver(): boolean {
    return this.gameOver;
  }

  protected updateGame(deltaSeconds: number): void {
    this.player.setBottomMargin(this.getPlayerBottomMargin());
    this.player.update(deltaSeconds);
    this.updateLifePickup(deltaSeconds);
    this.damageCooldown.set(Math.max(0, this.damageCooldown() - deltaSeconds));
    this.updateShooting(deltaSeconds);
    this.enemies.filter((enemy) => enemy.alive).forEach((enemy) => {
      enemy.update(deltaSeconds);
    });
    this.playerProjectiles.forEach((projectile) => projectile.update(deltaSeconds));
    this.enemyProjectiles.forEach((projectile) => projectile.update(deltaSeconds));
    this.updateEnemyFire(deltaSeconds);
    this.checkCollisions();

    if (this.enemies.every((enemy) => !enemy.alive)) {
      this.createFormation();
    }
  }

  private updateShooting(deltaSeconds: number): void {
    this.shootCooldown -= deltaSeconds;
    const wantsToShoot = (
      GameEvents.isKeyPressed(' ')
      || GameEvents.isKeyPressed('Space')
      || GameEvents.isKeyPressed('1')
    );

    if (!wantsToShoot || this.shootCooldown > 0) return;

    const projectile = this.playerProjectiles.find((candidate) => !candidate.active);
    if (!projectile) return;

    projectile.start(
      this.player.x,
      this.player.y - this.player.height * 0.5,
      -1,
      this.player.currentPolarity
    );
    this.shootCooldown = 0.16;
    GameLoader.playAudio('slide');
  }

  private updateEnemyFire(deltaSeconds: number): void {
    this.enemyShotCooldown -= deltaSeconds;
    if (this.enemyShotCooldown > 0) return;

    const aliveEnemies = this.enemies.filter((enemy) => enemy.alive);
    const enemy = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
    const projectile = this.enemyProjectiles.find((candidate) => !candidate.active);

    if (enemy && projectile) {
      projectile.start(
        enemy.x,
        enemy.y + enemy.height * 0.5,
        1,
        enemy.polarity
      );
    }

    this.enemyShotCooldown = 0.35 + Math.random() * 0.35;
  }

  private checkCollisions(): void {
    this.playerProjectiles.forEach((projectile) => {
      if (!projectile.active) return;

      const enemy = this.enemies.find((candidate) => (
        candidate.alive
        && this.overlapsCircle(
          projectile.x,
          projectile.y,
          projectile.radius,
          candidate.x,
          candidate.y,
          candidate.width,
          candidate.height
        )
      ));

      if (!enemy) return;

      projectile.active = false;
      enemy.alive = false;
      this.chain = enemy.polarity === this.player.currentPolarity
        ? this.chain + 1
        : 0;
      this.addScore(100 + this.chain * 25);
      GameLoader.playAudio(`boom${1 + Math.floor(Math.random() * 4)}`);
    });

    this.enemyProjectiles.forEach((projectile) => {
      if (
        !projectile.active
        || !this.overlapsCircle(
          projectile.x,
          projectile.y,
          projectile.radius,
          this.player.x,
          this.player.y,
          this.player.width,
          this.player.height
        )
      ) {
        return;
      }

      projectile.active = false;
      if (projectile.getPolarity() === this.player.currentPolarity) {
        this.absorbedShots += 1;
        this.addScore(25);
      } else if (this.damageCooldown() === 0) {
        this.lives.set(Math.max(0, this.lives() - 1));
        this.damageCooldown.set(0.75);
        if (this.lives() === 0) {
          this.gameOver = true;
        }
        GameLoader.playAudio('lose');
      }
    });
  }

  protected drawGame(): void {
    const hudScale = GameContext.isPortrait ? 1.35 : 1;
    GameContext.clear();
    this.drawBackground();
    this.enemies.forEach((enemy) => enemy.draw());
    this.drawLifePickup();
    this.player.draw();
    this.playerProjectiles.forEach((projectile) => projectile.draw());
    this.enemyProjectiles.forEach((projectile) => projectile.draw());

    const dimensions = GameContext.gameDimensionsModel;
    GameContext.drawText(
      `SCORE ${this.score}`,
      40 * hudScale,
      60 * hudScale,
      30 * hudScale,
      '#ffffff'
    );
    this.drawLives();
    GameContext.drawText(
      `CHAIN ${this.chain}`,
      40 * hudScale,
      154 * hudScale,
      24 * hudScale,
      '#ffffff'
    );
    GameContext.drawText(
      `ABSORB ${this.absorbedShots}`,
      40 * hudScale,
      190 * hudScale,
      24 * hudScale,
      '#ffffff'
    );
    GameContext.drawText(
      `POLARITY ${this.player.currentPolarity.toUpperCase()}`,
      dimensions.getWidth() - 40 * hudScale,
      60 * hudScale,
      28 * hudScale,
      POLARITY_COLORS[this.player.currentPolarity],
      'right'
    );
    GameContext.drawText(
      GameContext.isMobileDevice
        ? 'ABSORB MATCHING FIRE. SWITCH POLARITY TO SURVIVE.'
        : 'ARROWS / WASD MOVE   SPACE FIRE   SHIFT OR C SWITCH',
      dimensions.getWidth() * 0.5,
      dimensions.getHeight() - 28,
      18,
      '#d9e1ff',
      'center'
    );
    this.drawTouchControls();

    if (this.gameOver) {
      GameContext.drawRect(0, 0, dimensions.getWidth(), dimensions.getHeight(), '#171125');
      GameContext.drawText(
        'VANGUARD DESTROYED',
        dimensions.getWidth() * 0.5,
        dimensions.getHeight() * 0.45,
        58,
        '#ff6584',
        'center'
      );
      GameContext.drawText(
        'USE THE ACTION BUTTONS BELOW',
        dimensions.getWidth() * 0.5,
        dimensions.getHeight() * 0.55,
        28,
        '#ffffff',
        'center'
      );
    }
  }

  private drawBackground(): void {
    const dimensions = GameContext.gameDimensionsModel;
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
  }

  private drawLives(): void {
    const x = GameContext.isPortrait ? 42 : 32;
    const y = GameContext.isPortrait ? 112 : 80;
    const spacing = GameContext.isPortrait ? 50 : 30;
    const size = GameContext.isPortrait ? 46 : 26;

    for (let index = 0; index < 3; index++) {
      const icon = index < this.lives()
        ? this.fullHeartIcon
        : this.emptyHeartIcon;
      icon.draw(
        x + index * spacing - size * 0.5,
        y - size * 0.5,
        size
      );
    }
  }

  private drawLifePickup(): void {
    const pickup = this.lifePickup();
    if (pickup === undefined) return;

    this.lifePickupIcon.draw(
      pickup.x - pickup.size * 0.5,
      pickup.y - pickup.size * 0.5,
      pickup.size
    );
  }

  private drawTouchControls(): void {
    if (!GameContext.isMobileDevice) return;

    const controls = this.getTouchControlsLayout();
    this.drawTouchControl(controls.left, this.leftIcon, '#3867d6');
    this.drawTouchControl(controls.up, this.upIcon, '#3867d6');
    this.drawTouchControl(controls.shoot, this.shootIcon, '#9c3e45');
    this.drawTouchControl(controls.down, this.downIcon, '#3867d6');
    this.drawTouchControl(controls.right, this.rightIcon, '#3867d6');
    this.drawTouchControl(
      controls.polarity,
      this.polarityIcon,
      POLARITY_COLORS[this.player.currentPolarity]
    );
  }

  private drawTouchControl(
    circle: Circle,
    icon: CanvasIcon,
    color: string
  ): void {
    GameContext.drawCircle(
      circle.x,
      circle.y,
      circle.radius,
      'rgba(9, 14, 38, 0.78)'
    );
    GameContext.drawCircle(
      circle.x,
      circle.y,
      circle.radius - 4,
      `${color}aa`
    );
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
    icon.draw(
      circle.x - circle.radius * 0.525,
      circle.y - circle.radius * 0.525,
      circle.radius * 1.05
    );
  }

  private getTouchControlsLayout(): {
    left: Circle;
    right: Circle;
    up: Circle;
    down: Circle;
    shoot: Circle;
    polarity: Circle;
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
      up: {
        x: dimensions.getWidth() * 0.5 - radius * 2.1,
        y,
        radius
      },
      shoot: {
        x: dimensions.getWidth() * 0.5,
        y,
        radius
      },
      down: {
        x: dimensions.getWidth() * 0.5 + radius * 2.1,
        y,
        radius
      },
      polarity: {
        x: dimensions.getWidth() * 0.5,
        y: y - radius * 2.25,
        radius: radius * 0.78
      }
    };
  }

  private getPlayerBottomMargin(): number {
    if (!GameContext.isMobileDevice) return 32;

    const controls = this.getTouchControlsLayout();
    const controlsTop = Math.min(
      controls.left.y - controls.left.radius,
      controls.right.y - controls.right.radius,
      controls.up.y - controls.up.radius,
      controls.down.y - controls.down.radius,
      controls.shoot.y - controls.shoot.radius,
      controls.polarity.y - controls.polarity.radius
    );

    return GameContext.gameDimensionsModel.getHeight() - controlsTop + 32;
  }

  private readonly handleTouchStart = (pointer: GamePointer): void => {
    this.updateTouchPointer(pointer);
  };

  private readonly handleTouchMove = (pointer: GamePointer): void => {
    this.updateTouchPointer(pointer);
  };

  private readonly handleTouchEnd = (pointer: GamePointer): void => {
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
      this.containsPointInCircle(controls.up, pointer.x, pointer.y)
    ) {
      key = 'ArrowUp';
    } else if (
      this.containsPointInCircle(controls.down, pointer.x, pointer.y)
    ) {
      key = 'ArrowDown';
    } else if (
      this.containsPointInCircle(controls.shoot, pointer.x, pointer.y)
    ) {
      key = ' ';
    } else if (
      this.containsPointInCircle(controls.polarity, pointer.x, pointer.y)
    ) {
      key = 'c';
    }

    GameEvents.setPointerKey(pointer.id, key);
  }

  private containsPointInCircle(
    circle: Circle,
    x: number,
    y: number
  ): boolean {
    const distanceX = x - circle.x;
    const distanceY = y - circle.y;

    return distanceX * distanceX + distanceY * distanceY <= circle.radius ** 2;
  }

  private createFormation(): void {
    this.enemies.length = 0;
    const dimensions = GameContext.gameDimensionsModel;
    const columns = GameContext.isPortrait ? 5 : 8;
    const spacing = 145;
    const startX = (dimensions.getWidth() - (columns - 1) * spacing) * 0.5;

    for (let row = 0; row < 3; row++) {
      for (let column = 0; column < columns; column++) {
        const polarity: Polarity = (row + column) % 2 === 0 ? 'light' : 'dark';
        this.enemies.push(
          new PolarityVanguardEnemy(
            startX + column * spacing,
            180 + row * 110,
            polarity,
            row * columns + column
          )
        );
      }

    }

    this.enemyShotCooldown = 0.8;
  }

  private addScore(points: number): void {
    this.score += points;

    while (this.score >= this.nextLifeScore()) {
      if (this.lives() < 3 && this.lifePickup() === undefined) {
        this.spawnLifePickup();
      }

      this.nextLifeScore.set(this.nextLifeScore() + 1000);
    }
  }

  private spawnLifePickup(): void {
    const dimensions = GameContext.gameDimensionsModel;
    const size = GameContext.isPortrait ? 58 : 42;

    this.lifePickup.set({
      x: size * 0.5 + Math.random() * (dimensions.getWidth() - size),
      y: -size * 0.5,
      size
    });
  }

  private updateLifePickup(deltaSeconds: number): void {
    const pickup = this.lifePickup();
    if (pickup === undefined) return;

    const nextY = pickup.y + 180 * deltaSeconds;
    const dimensions = GameContext.gameDimensionsModel;
    if (nextY > dimensions.getHeight() + pickup.size * 0.5) {
      this.lifePickup.set(undefined);
      return;
    }

    if (this.overlapsCircle(
      pickup.x,
      nextY,
      pickup.size * 0.5,
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height
    )) {
      this.lives.set(Math.min(3, this.lives() + 1));
      this.lifePickup.set(undefined);
      GameLoader.playAudio('win');
      return;
    }

    this.lifePickup.set({ ...pickup, y: nextY });
  }

  private createProjectiles(): void {
    for (let index = 0; index < 18; index++) {
      this.playerProjectiles.push(
        new PolarityProjectile(820, 'light', 7)
      );
    }

    for (let index = 0; index < 36; index++) {
      this.enemyProjectiles.push(
        new PolarityProjectile(
          360,
          index % 2 === 0 ? 'light' : 'dark',
          11
        )
      );
    }
  }

  protected restartGame(): void {
    this.score = 0;
    this.absorbedShots = 0;
    this.chain = 0;
    this.gameOver = false;
    this.lives.set(3);
    this.nextLifeScore.set(1000);
    this.lifePickup.set(undefined);
    this.damageCooldown.set(0);
    this.controls.hideEndActions();
    this.player.reset();
    this.playerProjectiles.forEach((projectile) => {
      projectile.active = false;
    });
    this.enemyProjectiles.forEach((projectile) => {
      projectile.active = false;
    });
    this.createFormation();
    GameLoader.playAudio('newgame');
  }

  protected disposeGame(): void {
    this.pointerListenerCleanup.forEach((cleanup) => cleanup());
    this.pointerListenerCleanup.length = 0;
  }

  private overlapsCircle(
    circleX: number,
    circleY: number,
    radius: number,
    rectangleX: number,
    rectangleY: number,
    rectangleWidth: number,
    rectangleHeight: number
  ): boolean {
    const closestX = Math.max(
      rectangleX - rectangleWidth * 0.5,
      Math.min(circleX, rectangleX + rectangleWidth * 0.5)
    );
    const closestY = Math.max(
      rectangleY - rectangleHeight * 0.5,
      Math.min(circleY, rectangleY + rectangleHeight * 0.5)
    );
    const distanceX = circleX - closestX;
    const distanceY = circleY - closestY;

    return distanceX * distanceX + distanceY * distanceY <= radius * radius;
  }
}
