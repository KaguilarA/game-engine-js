import GameContext from '../../engine/context';
import type { GamePointer } from '../../engine/context';
import { BaseGame } from '../../engine/base-game';
import CanvasIcon from '../../engine/canvas-icon';
import GameEvents from '../../engine/events';
import GameLoader from '../../engine/loader';
import { signalValue } from 'reactive-values';
import chevronDownSvg from 'lucide-static/icons/chevron-down.svg?raw';
import chevronLeftSvg from 'lucide-static/icons/chevron-left.svg?raw';
import chevronRightSvg from 'lucide-static/icons/chevron-right.svg?raw';
import chevronUpSvg from 'lucide-static/icons/chevron-up.svg?raw';
import crosshairSvg from 'lucide-static/icons/crosshair.svg?raw';
import heartSvg from 'lucide-static/icons/heart.svg?raw';

type Direction = 'up' | 'down' | 'left' | 'right';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Pickup {
  x: number;
  y: number;
  size: number;
}

class Tank {
  public readonly x = signalValue(0);
  public readonly y = signalValue(0);
  public readonly alive = signalValue(true);
  private readonly health = signalValue(1);
  private readonly wallAttackCooldown = signalValue(0);
  private readonly maximumHealth: number;
  public direction: Direction = 'up';
  public readonly size: number;
  private readonly imageName: string;
  private readonly sourceWidth: number;
  private readonly sourceHeight: number;

  public constructor(
    imageName: string,
    x: number,
    y: number,
    size = 76,
    maximumHealth = 1
  ) {
    this.imageName = imageName;
    this.size = size;
    this.maximumHealth = maximumHealth;
    this.health.set(maximumHealth);
    this.health = signalValue(maximumHealth);
    this.sourceWidth = imageName === 'player'
      ? 140
      : imageName === 'beetlemorph'
        || imageName === 'lobstermorph'
        || imageName === 'phantommorph'
        ? 100
        : imageName === 'boss'
          ? 220
        : 80;
    this.sourceHeight = imageName === 'player'
      ? 120
      : imageName === 'boss'
        ? 200
      : this.sourceWidth;
    this.x.set(x);
    this.y.set(y);
  }

  public setPosition(x: number, y: number): void {
    this.x.set(x);
    this.y.set(y);
  }

  public takeHit(): boolean {
    if (!this.alive()) return false;

    this.health.set(Math.max(0, this.health() - 1));
    if (this.health() === 0) {
      this.alive.set(false);
    }

    return true;
  }

  public get healthRatio(): number {
    return this.health() / this.maximumHealth;
  }

  public updateWallAttackCooldown(deltaSeconds: number): void {
    this.wallAttackCooldown.set(
      Math.max(0, this.wallAttackCooldown() - deltaSeconds)
    );
  }

  public canAttackWall(): boolean {
    return this.wallAttackCooldown() === 0;
  }

  public startWallAttackCooldown(): void {
    this.wallAttackCooldown.set(0.28);
  }

  public draw(): void {
    if (!this.alive()) return;

    const context = GameContext.context;
    const angle = this.direction === 'right'
      ? Math.PI * 0.5
      : this.direction === 'down'
        ? Math.PI
        : this.direction === 'left'
          ? Math.PI * 1.5
          : 0;

    context.save();
    context.translate(this.x(), this.y());
    context.rotate(angle);
    context.drawImage(
      GameLoader.getImage(this.imageName),
      0,
      0,
      this.sourceWidth,
      this.sourceHeight,
      -this.size * 0.5,
      -this.size * 0.5,
      this.size,
      this.size
    );
    context.strokeStyle = '#17243b';
    context.lineWidth = 4;
    context.strokeRect(
      -this.size * 0.5,
      -this.size * 0.5,
      this.size,
      this.size
    );
    context.restore();
  }
}

class Bullet {
  public readonly x = signalValue(0);
  public readonly y = signalValue(0);
  public readonly active = signalValue(false);
  public direction: Direction = 'up';
  public readonly size = 16;

  public start(x: number, y: number, direction: Direction): void {
    this.x.set(x);
    this.y.set(y);
    this.direction = direction;
    this.active.set(true);
  }

  public stop(): void {
    this.active.set(false);
  }

  public update(deltaSeconds: number): void {
    if (!this.active()) return;

    const speed = 780;
    if (this.direction === 'up') this.y.set(this.y() - speed * deltaSeconds);
    if (this.direction === 'down') this.y.set(this.y() + speed * deltaSeconds);
    if (this.direction === 'left') this.x.set(this.x() - speed * deltaSeconds);
    if (this.direction === 'right') this.x.set(this.x() + speed * deltaSeconds);

    const dimensions = GameContext.gameDimensionsModel;
    if (
      this.x() < -this.size
      || this.y() < -this.size
      || this.x() > dimensions.getWidth() + this.size
      || this.y() > dimensions.getHeight() + this.size
    ) {
      this.stop();
    }
  }

  public draw(): void {
    if (!this.active()) return;
    const context = GameContext.context;
    const angle = this.direction === 'right'
      ? Math.PI * 0.5
      : this.direction === 'down'
        ? Math.PI
        : this.direction === 'left'
          ? Math.PI * 1.5
          : 0;

    context.save();
    context.translate(this.x(), this.y());
    context.rotate(angle);
    context.drawImage(
      GameLoader.getImage('enemyProjectile'),
      0,
      0,
      50,
      70,
      -25,
      -35,
      50,
      70
    );
    context.restore();
  }
}

interface Wall extends Rect {
  health: number;
}

export class TankFrontierGame extends BaseGame {
  private readonly player = new Tank('player', 960, 930);
  private readonly enemies: Tank[] = [];
  private boss: Tank | undefined;
  private readonly playerBullets: Bullet[] = [];
  private readonly enemyBullets: Bullet[] = [];
  private readonly walls: Wall[] = [];
  private readonly pointerListenerCleanup: Array<() => void> = [];
  private readonly leftIcon = new CanvasIcon(chevronLeftSvg);
  private readonly rightIcon = new CanvasIcon(chevronRightSvg);
  private readonly upIcon = new CanvasIcon(chevronUpSvg);
  private readonly downIcon = new CanvasIcon(chevronDownSvg);
  private readonly shootIcon = new CanvasIcon(crosshairSvg);
  private readonly fullHeartIcon = new CanvasIcon(heartSvg, '#ff5a6b', true);
  private readonly emptyHeartIcon = new CanvasIcon(heartSvg, '#5c657d');
  private readonly lifePickupIcon = new CanvasIcon(heartSvg, '#ff5a6b', true);
  private readonly score = signalValue(0);
  private readonly lives = signalValue(3);
  private readonly wave = signalValue(1);
  private readonly gameOver = signalValue(false);
  private readonly shootCooldown = signalValue(0);
  private readonly enemySpawnCooldown = signalValue(0);
  private readonly bossShotCooldown = signalValue(0);
  private readonly damageCooldown = signalValue(0);
  private readonly nextLifeScore = signalValue(1000);
  private readonly nextBossScore = signalValue(1000);
  private readonly lifePickup = signalValue<Pickup | undefined>(undefined);

  public constructor(onReturnToMenu?: () => void) {
    super(onReturnToMenu);
    this.resetPlayerPosition();
    this.createWalls();
    this.createBullets();
    this.createWave();
    this.pointerListenerCleanup.push(
      GameContext.addPointerStartListener(this.handleTouchStart),
      GameContext.addPointerMoveListener(this.handleTouchMove),
      GameContext.addPointerEndListener(this.handleTouchEnd)
    );
    this.start();
  }

  protected get isGameOver(): boolean {
    return this.gameOver();
  }

  protected updateGame(deltaSeconds: number): void {
    this.damageCooldown.set(Math.max(0, this.damageCooldown() - deltaSeconds));
    this.updatePlayer(deltaSeconds);
    this.updateLifePickup(deltaSeconds);
    this.updateBullets(deltaSeconds);
    this.updateEnemies(deltaSeconds);
    this.updateBoss(deltaSeconds);
    this.updateEnemySpawning(deltaSeconds);
    this.checkCollisions();

    if (
      this.boss === undefined
      && this.enemies.length > 0
      && this.enemies.every((enemy) => !enemy.alive())
    ) {
      this.wave.set(this.wave() + 1);
      this.createWalls();
      this.createWave();
    }
  }

  protected drawGame(): void {
    const dimensions = GameContext.gameDimensionsModel;
    const hudScale = GameContext.isPortrait ? 1.35 : 1;
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
      'rgba(12, 19, 39, 0.68)'
    );
    this.drawArena();
    this.drawBase();
    this.walls.forEach((wall) => this.drawWall(wall));
    this.enemies.forEach((enemy) => enemy.draw());
    this.boss?.draw();
    this.player.draw();
    this.playerBullets.forEach((bullet) => bullet.draw());
    this.enemyBullets.forEach((bullet) => bullet.draw());
    this.drawLifePickup();
    this.drawHud(hudScale);
    this.drawBossHealth();
    this.drawTouchControls();

    if (this.gameOver()) {
      GameContext.drawRect(
        0,
        0,
        dimensions.getWidth(),
        dimensions.getHeight(),
        'rgba(23, 17, 37, 0.82)'
      );
      GameContext.drawText(
        'TANK DESTROYED',
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

  private drawArena(): void {
    const dimensions = GameContext.gameDimensionsModel;
    const margin = GameContext.isPortrait ? 48 : 90;
    const arenaTop = 150;
    const arenaBottom = dimensions.getHeight() - 100;
    GameContext.drawRect(
      margin,
      arenaTop,
      dimensions.getWidth() - margin * 2,
      arenaBottom - arenaTop,
      'rgba(19, 31, 52, 0.9)'
    );
    GameContext.drawRect(
      margin,
      arenaTop,
      dimensions.getWidth() - margin * 2,
      arenaBottom - arenaTop,
      'rgba(68, 111, 131, 0.14)'
    );

    const context = GameContext.context;
    context.save();
    context.beginPath();
    context.rect(
      margin,
      arenaTop,
      dimensions.getWidth() - margin * 2,
      arenaBottom - arenaTop
    );
    context.clip();
    context.strokeStyle = 'rgba(129, 171, 184, 0.1)';
    context.lineWidth = 2;

    for (let x = margin; x <= dimensions.getWidth() - margin; x += 72) {
      context.moveTo(x, arenaTop);
      context.lineTo(x, arenaBottom);
    }
    for (let y = arenaTop; y <= arenaBottom; y += 72) {
      context.moveTo(margin, y);
      context.lineTo(dimensions.getWidth() - margin, y);
    }
    context.stroke();
    context.restore();

    context.strokeStyle = '#6b9aa5';
    context.lineWidth = 6;
    context.strokeRect(
      margin,
      arenaTop,
      dimensions.getWidth() - margin * 2,
      arenaBottom - arenaTop
    );
  }

  private drawBase(): void {
    const dimensions = GameContext.gameDimensionsModel;
    const centerX = dimensions.getWidth() * 0.5;
    const bottom = dimensions.getHeight() - 106;
    const width = GameContext.isPortrait ? 112 : 144;
    const height = GameContext.isPortrait ? 64 : 80;

    GameContext.drawRect(
      centerX - width * 0.5,
      bottom - height,
      width,
      height,
      '#4d5d76'
    );
    GameContext.drawRect(
      centerX - width * 0.34,
      bottom - height * 0.74,
      width * 0.68,
      height * 0.74,
      '#d09a51'
    );
    GameContext.drawRect(
      centerX - width * 0.18,
      bottom - height * 0.56,
      width * 0.36,
      height * 0.56,
      '#26364f'
    );
    GameContext.drawRect(
      centerX - width * 0.5,
      bottom - height,
      width,
      8,
      '#9bc1c5'
    );
  }

  private drawWall(wall: Wall): void {
    const color = wall.health === 2 ? '#bb754d' : '#75452f';
    GameContext.drawRect(wall.x, wall.y, wall.width, wall.height, color);
    GameContext.drawRect(
      wall.x + 4,
      wall.y + 4,
      wall.width - 8,
      wall.height * 0.42,
      'rgba(255, 211, 146, 0.24)'
    );
    GameContext.drawRect(
      wall.x + wall.width * 0.48,
      wall.y,
      4,
      wall.height,
      'rgba(27, 25, 35, 0.36)'
    );
  }

  private drawHud(scale: number): void {
    const dimensions = GameContext.gameDimensionsModel;
    GameContext.drawText(
      `SCORE ${this.score()}`,
      40 * scale,
      54 * scale,
      28 * scale,
      '#ffffff'
    );
    GameContext.drawText(
      `WAVE ${this.wave()}`,
      dimensions.getWidth() - 40 * scale,
      54 * scale,
      28 * scale,
      '#f8e27a',
      'right'
    );
    const x = GameContext.isPortrait ? 42 : 32;
    const y = GameContext.isPortrait ? 112 : 86;
    const spacing = GameContext.isPortrait ? 50 : 30;
    const size = GameContext.isPortrait ? 46 : 26;
    for (let index = 0; index < 3; index++) {
      const icon = index < this.lives()
        ? this.fullHeartIcon
        : this.emptyHeartIcon;
      icon.draw(x + index * spacing - size * 0.5, y - size * 0.5, size);
    }
    GameContext.drawText(
      'BATTLE CITY INSPIRED • ARROWS / WASD MOVE • SPACE FIRE',
      dimensions.getWidth() * 0.5,
      dimensions.getHeight() - 26,
      18,
      '#d9e1ff',
      'center'
    );
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

  private drawBossHealth(): void {
    const boss = this.boss;
    if (boss === undefined) return;

    const dimensions = GameContext.gameDimensionsModel;
    const width = Math.min(620, dimensions.getWidth() - 120);
    const x = (dimensions.getWidth() - width) * 0.5;
    const y = GameContext.isPortrait ? 148 : 112;

    GameContext.drawRect(x, y, width, 28, '#211d31');
    GameContext.drawRect(
      x + 4,
      y + 4,
      (width - 8) * boss.healthRatio,
      20,
      '#d95f5f'
    );
    GameContext.drawText(
      'BOSS',
      dimensions.getWidth() * 0.5,
      y + 21,
      16,
      '#ffffff',
      'center'
    );
  }

  private drawTouchControls(): void {
    if (!GameContext.isMobileDevice) return;
    const controls = this.getTouchControlsLayout();
    this.drawTouchControl(controls.left, this.leftIcon);
    this.drawTouchControl(controls.up, this.upIcon);
    this.drawTouchControl(controls.down, this.downIcon);
    this.drawTouchControl(controls.right, this.rightIcon);
    this.drawTouchControl(controls.shoot, this.shootIcon);
  }

  private drawTouchControl(circle: Circle, icon: CanvasIcon): void {
    GameContext.drawCircle(circle.x, circle.y, circle.radius, 'rgba(9, 14, 38, 0.78)');
    GameContext.drawCircle(circle.x, circle.y, circle.radius - 4, 'rgba(56, 103, 214, 0.66)');
    GameContext.drawCircle(circle.x, circle.y, circle.radius - 10, 'rgba(19, 31, 76, 0.42)');
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
  } {
    const dimensions = GameContext.gameDimensionsModel;
    const radius = Math.min(90, dimensions.getWidth() * 0.085);
    const margin = 44;
    const y = dimensions.getHeight() - radius - 52;
    return {
      left: { x: margin + radius, y, radius },
      right: { x: dimensions.getWidth() - margin - radius, y, radius },
      up: { x: dimensions.getWidth() * 0.5 - radius * 1.15, y: y - radius * 1.75, radius },
      down: { x: dimensions.getWidth() * 0.5 + radius * 1.15, y: y - radius * 1.75, radius },
      shoot: { x: dimensions.getWidth() * 0.5, y, radius }
    };
  }

  private updatePlayer(deltaSeconds: number): void {
    const direction = this.getInputDirection();
    if (direction !== undefined) this.player.direction = direction;
    const speed = 390;
    const next = this.movePosition(
      this.player.x(),
      this.player.y(),
      direction,
      speed * deltaSeconds
    );
    if (!this.collidesWithWalls(this.player, next.x, next.y)) {
      this.player.setPosition(next.x, next.y);
    }

    this.shootCooldown.set(Math.max(0, this.shootCooldown() - deltaSeconds));
    const wantsToShoot = (
      GameEvents.isKeyPressed(' ')
      || GameEvents.isKeyPressed('Space')
      || GameEvents.isKeyPressed('1')
    );
    if (wantsToShoot && this.shootCooldown() === 0) {
      this.fire(this.player, this.playerBullets);
      this.shootCooldown.set(0.28);
    }
  }

  private getInputDirection(): Direction | undefined {
    if (GameEvents.isKeyPressed('ArrowUp') || GameEvents.isKeyPressed('w')) return 'up';
    if (GameEvents.isKeyPressed('ArrowDown') || GameEvents.isKeyPressed('s')) return 'down';
    if (GameEvents.isKeyPressed('ArrowLeft') || GameEvents.isKeyPressed('a')) return 'left';
    if (GameEvents.isKeyPressed('ArrowRight') || GameEvents.isKeyPressed('d')) return 'right';
    return undefined;
  }

  private updateBullets(deltaSeconds: number): void {
    this.playerBullets.forEach((bullet) => bullet.update(deltaSeconds));
    this.enemyBullets.forEach((bullet) => bullet.update(deltaSeconds));
  }

  private updateEnemies(deltaSeconds: number): void {
    this.enemies.forEach((enemy, index) => {
      if (!enemy.alive()) return;
      const horizontal = this.player.x() - enemy.x();
      const vertical = this.player.y() - enemy.y();
        const preferredDirection: Direction = Math.abs(horizontal) > Math.abs(vertical)
        ? horizontal > 0 ? 'right' : 'left'
        : vertical > 0 ? 'down' : 'up';
        const secondaryDirection: Direction = Math.abs(horizontal) > Math.abs(vertical)
          ? vertical > 0 ? 'down' : 'up'
          : horizontal > 0 ? 'right' : 'left';
        enemy.updateWallAttackCooldown(deltaSeconds);
        const distance = (145 + index * 12) * deltaSeconds;
        const preferredNext = this.movePosition(
          enemy.x(),
          enemy.y(),
          preferredDirection,
          distance
        );
        const blockingWall = this.walls.find((wall) => (
          this.intersects(
            preferredNext.x - enemy.size * 0.5,
            preferredNext.y - enemy.size * 0.5,
            enemy.size,
            enemy.size,
            wall
          )
        ));

        if (blockingWall !== undefined) {
          enemy.direction = preferredDirection;
          if (enemy.canAttackWall()) {
            blockingWall.health -= 1;
            enemy.startWallAttackCooldown();
            GameLoader.playAudio('boom1');
            if (blockingWall.health <= 0) {
              this.walls.splice(this.walls.indexOf(blockingWall), 1);
            }
          }
          if (Math.random() < deltaSeconds * 0.8) {
            this.fire(enemy, this.enemyBullets);
          }
          return;
        }

        const directions: Direction[] = [
          preferredDirection,
          secondaryDirection,
          this.getOppositeDirection(preferredDirection),
          this.getOppositeDirection(secondaryDirection)
        ];
        const possibleMoves = directions
          .filter((direction, directionIndex) => (
            directions.indexOf(direction) === directionIndex
          ))
          .map((direction, directionIndex) => {
            const next = this.movePosition(
              enemy.x(),
              enemy.y(),
              direction,
              distance
            );

            return {
              direction,
              next,
              directionIndex,
              distanceToPlayer: (
                Math.abs(this.player.x() - next.x)
                + Math.abs(this.player.y() - next.y)
              )
            };
          })
          .filter(({ next }) => !this.collidesWithWalls(enemy, next.x, next.y))
          .sort((left, right) => (
            left.distanceToPlayer - right.distanceToPlayer
            || left.directionIndex - right.directionIndex
          ));

        const move = possibleMoves[0];
        if (move !== undefined) {
          enemy.direction = move.direction;
          enemy.setPosition(move.next.x, move.next.y);
        }

        if (Math.random() < deltaSeconds * 0.8) {
          this.fire(enemy, this.enemyBullets);
        }
      });
  }

  private getOppositeDirection(direction: Direction): Direction {
      if (direction === 'up') return 'down';
      if (direction === 'down') return 'up';
      if (direction === 'left') return 'right';
      return 'left';
  }

  private updateBoss(deltaSeconds: number): void {
      const boss = this.boss;
      if (boss === undefined || !boss.alive()) return;

      const dimensions = GameContext.gameDimensionsModel;
      const speed = 180;
      let nextX = boss.x() + (
        boss.direction === 'right' ? speed : -speed
      ) * deltaSeconds;
      const margin = GameContext.isPortrait ? 48 : 90;

      if (nextX - boss.size * 0.5 <= margin) {
        boss.direction = 'right';
        nextX = margin + boss.size * 0.5;
      } else if (
        nextX + boss.size * 0.5 >= dimensions.getWidth() - margin
      ) {
        boss.direction = 'left';
        nextX = dimensions.getWidth() - margin - boss.size * 0.5;
      }

      boss.setPosition(nextX, boss.y());
      this.bossShotCooldown.set(
        Math.max(0, this.bossShotCooldown() - deltaSeconds)
      );
      if (this.bossShotCooldown() === 0) {
        this.fire(boss, this.enemyBullets);
        this.bossShotCooldown.set(0.7);
    }
  }

  private updateEnemySpawning(deltaSeconds: number): void {
    if (this.boss !== undefined) return;

    this.enemySpawnCooldown.set(Math.max(0, this.enemySpawnCooldown() - deltaSeconds));
    if (this.enemySpawnCooldown() > 0 || this.enemies.length >= 6) return;
    this.spawnEnemy();
    this.enemySpawnCooldown.set(1.6);
  }

  private checkCollisions(): void {
    this.playerBullets.forEach((bullet) => {
      if (!bullet.active()) return;
      const wall = this.walls.find((candidate) => this.intersects(
        bullet.x() - bullet.size * 0.5,
        bullet.y() - bullet.size * 0.5,
        bullet.size,
        bullet.size,
        candidate
      ));
      if (wall) {
        wall.health -= 1;
        bullet.stop();
        if (wall.health <= 0) this.walls.splice(this.walls.indexOf(wall), 1);
        return;
      }
      const enemy = this.enemies.find((candidate) => (
        candidate.alive()
        && this.intersectsTank(bullet, candidate)
      ));
      if (enemy) {
        enemy.takeHit();
        bullet.stop();
        if (!enemy.alive()) {
          this.score.set(this.score() + 100);
          GameLoader.playAudio('boom1');
          this.updateLifeThreshold();
        }
        return;
      }

      if (
        this.boss !== undefined
        && this.boss.alive()
        && this.intersectsTank(bullet, this.boss)
      ) {
        this.boss.takeHit();
        bullet.stop();
        if (!this.boss.alive()) {
          this.score.set(this.score() + 500);
          this.spawnBossLifePickup();
          this.boss = undefined;
          this.wave.set(this.wave() + 1);
          this.createWalls();
          this.createWave();
          GameLoader.playAudio('win');
          this.updateLifeThreshold();
        } else {
          GameLoader.playAudio('boom1');
        }
      }
    });

    this.enemyBullets.forEach((bullet) => {
      if (!bullet.active()) return;
      if (this.walls.some((wall) => this.intersects(
        bullet.x() - bullet.size * 0.5,
        bullet.y() - bullet.size * 0.5,
        bullet.size,
        bullet.size,
        wall
      ))) {
        bullet.stop();
        return;
      }
      if (!this.intersectsTank(bullet, this.player)) return;
      bullet.stop();
      if (this.damageCooldown() > 0) return;
      this.lives.set(Math.max(0, this.lives() - 1));
      this.damageCooldown.set(0.9);
      this.resetPlayerPosition();
      if (this.lives() === 0) {
        this.gameOver.set(true);
        GameLoader.playAudio('lose');
      }
    });
  }

  private updateLifeThreshold(): void {
    while (this.score() >= this.nextLifeScore()) {
      if (this.lives() < 3 && this.lifePickup() === undefined) {
        const dimensions = GameContext.gameDimensionsModel;
        const size = GameContext.isPortrait ? 58 : 42;
        this.lifePickup.set({
          x: size + Math.random() * (dimensions.getWidth() - size * 2),
          y: -size,
          size
        });
      }
      this.nextLifeScore.set(this.nextLifeScore() + 1000);
    }
    while (this.score() >= this.nextBossScore()) {
      if (this.boss === undefined) {
        this.spawnBoss();
      }
      this.nextBossScore.set(this.nextBossScore() + 1000);
    }
  }

  private spawnBoss(): void {
    const dimensions = GameContext.gameDimensionsModel;
    this.enemies.length = 0;
    this.boss = new Tank(
      'boss',
      dimensions.getWidth() * 0.5,
      GameContext.isPortrait ? 300 : 240,
      GameContext.isPortrait ? 132 : 160,
      8
    );
    this.boss.direction = 'right';
    this.bossShotCooldown.set(1);
    GameLoader.playAudio('scream');
  }

  private spawnBossLifePickup(): void {
    if (this.lives() >= 3 || this.lifePickup() !== undefined) return;

    const boss = this.boss;
    if (boss === undefined) return;

    const size = GameContext.isPortrait ? 58 : 42;
    this.lifePickup.set({
      x: boss.x(),
      y: boss.y(),
      size
    });
  }

  private updateLifePickup(deltaSeconds: number): void {
    const pickup = this.lifePickup();
    if (pickup === undefined) return;
    const nextY = pickup.y + 180 * deltaSeconds;
    if (nextY > GameContext.gameDimensionsModel.getHeight() + pickup.size) {
      this.lifePickup.set(undefined);
      return;
    }
    if (this.intersects(
      pickup.x - pickup.size * 0.5,
      nextY - pickup.size * 0.5,
      pickup.size,
      pickup.size,
      {
        x: this.player.x() - this.player.size * 0.5,
        y: this.player.y() - this.player.size * 0.5,
        width: this.player.size,
        height: this.player.size
      }
    )) {
      this.lives.set(Math.min(3, this.lives() + 1));
      this.lifePickup.set(undefined);
      GameLoader.playAudio('win');
      return;
    }
    this.lifePickup.set({ ...pickup, y: nextY });
  }

  private fire(tank: Tank, bullets: Bullet[]): void {
    const bullet = bullets.find((candidate) => !candidate.active());
    if (!bullet) return;
    const offset = tank.size * 0.58;
    const x = tank.x() + (tank.direction === 'left' ? -offset : tank.direction === 'right' ? offset : 0);
    const y = tank.y() + (tank.direction === 'up' ? -offset : tank.direction === 'down' ? offset : 0);
    bullet.start(x, y, tank.direction);
    GameLoader.playAudio('slide');
  }

  private movePosition(
    x: number,
    y: number,
    direction: Direction | undefined,
    distance: number
  ): { x: number; y: number } {
    const dimensions = GameContext.gameDimensionsModel;
    const half = this.player.size * 0.5;
    const margin = GameContext.isPortrait ? 48 : 90;
    const minX = margin + half;
    const maxX = dimensions.getWidth() - margin - half;
    const minY = 150 + half;
    const maxY = dimensions.getHeight() - 100 - half;
    if (direction === 'up') y -= distance;
    if (direction === 'down') y += distance;
    if (direction === 'left') x -= distance;
    if (direction === 'right') x += distance;
    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y))
    };
  }

  private collidesWithWalls(tank: Tank, x: number, y: number): boolean {
    const half = tank.size * 0.5;
    return this.walls.some((wall) => this.intersects(
      x - half,
      y - half,
      tank.size,
      tank.size,
      wall
    ));
  }

  private intersectsTank(bullet: Bullet, tank: Tank): boolean {
    const half = tank.size * 0.5;
    return this.intersects(
      bullet.x() - bullet.size * 0.5,
      bullet.y() - bullet.size * 0.5,
      bullet.size,
      bullet.size,
      { x: tank.x() - half, y: tank.y() - half, width: tank.size, height: tank.size }
    );
  }

  private intersects(
    x: number,
    y: number,
    width: number,
    height: number,
    rect: Rect
  ): boolean {
    return (
      x < rect.x + rect.width
      && x + width > rect.x
      && y < rect.y + rect.height
      && y + height > rect.y
    );
  }

  private createWalls(): void {
    const dimensions = GameContext.gameDimensionsModel;
    const margin = GameContext.isPortrait ? 48 : 90;
    const tileSize = GameContext.isPortrait ? 58 : 72;
    const columns = Math.floor(
      (dimensions.getWidth() - margin * 2) / tileSize
    );
    const rows = Math.floor(
      (dimensions.getHeight() - 250) / tileSize
    );
    const startX = (
      dimensions.getWidth() - columns * tileSize
    ) * 0.5;

    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const isSpawnLane = row < 2;
        const isBaseLane = (
          row >= rows - 2
          && Math.abs(column - columns * 0.5) < 2.5
        );
        const isSideCorridor = column === 0 || column === columns - 1;

        if (
          isSpawnLane
          || isBaseLane
          || isSideCorridor
          || Math.random() > 0.27
        ) {
          continue;
        }

        this.walls.push({
          x: startX + column * tileSize,
          y: 190 + row * tileSize,
          width: tileSize - 3,
          height: tileSize - 3,
          health: Math.random() > 0.7 ? 1 : 2
        });
      }
    }
  }

  private createBullets(): void {
    for (let index = 0; index < 16; index++) this.playerBullets.push(new Bullet());
    for (let index = 0; index < 24; index++) this.enemyBullets.push(new Bullet());
  }

  private createWave(): void {
    this.enemies.length = 0;
    for (let index = 0; index < Math.min(3 + this.wave(), 6); index++) {
      this.enemies.push(
        new Tank(
          index % 2 === 0 ? 'eaglemorph' : 'beetlemorph',
          300 + index * 260,
          230
        )
      );
    }
    this.enemySpawnCooldown.set(1);
  }

  private spawnEnemy(): void {
    const index = this.enemies.length;
    this.enemies.push(
      new Tank(
        index % 2 === 0 ? 'rhinomorph' : 'lobstermorph',
        300 + (index % 6) * 260,
        230
      )
    );
  }

  private resetPlayerPosition(): void {
    const dimensions = GameContext.gameDimensionsModel;
    this.player.setPosition(
      dimensions.getWidth() * 0.5,
      dimensions.getHeight() - 150
    );
  }

  protected restartGame(): void {
    this.score.set(0);
    this.lives.set(3);
    this.wave.set(1);
    this.gameOver.set(false);
    this.nextLifeScore.set(1000);
    this.nextBossScore.set(1000);
    this.lifePickup.set(undefined);
    this.damageCooldown.set(0);
    this.bossShotCooldown.set(0);
    this.boss = undefined;
    this.controls.hideEndActions();
    this.resetPlayerPosition();
    this.player.direction = 'up';
    this.playerBullets.forEach((bullet) => bullet.stop());
    this.enemyBullets.forEach((bullet) => bullet.stop());
    this.walls.length = 0;
    this.createWalls();
    this.createWave();
    GameLoader.playAudio('newgame');
  }

  protected disposeGame(): void {
    this.pointerListenerCleanup.forEach((cleanup) => cleanup());
    this.pointerListenerCleanup.length = 0;
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
    const options: Array<[Circle, string]> = [
      [controls.left, 'ArrowLeft'],
      [controls.right, 'ArrowRight'],
      [controls.up, 'ArrowUp'],
      [controls.down, 'ArrowDown'],
      [controls.shoot, ' ']
    ];
    const control = options.find(([circle]) => this.containsPoint(circle, pointer.x, pointer.y));
    GameEvents.setPointerKey(pointer.id, control?.[1]);
  }

  private containsPoint(circle: Circle, x: number, y: number): boolean {
    const distanceX = x - circle.x;
    const distanceY = y - circle.y;
    return distanceX * distanceX + distanceY * distanceY <= circle.radius ** 2;
  }
}

interface Circle {
  x: number;
  y: number;
  radius: number;
}
