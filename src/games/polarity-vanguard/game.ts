import GameContext from '../../engine/core/context';
import { MathUtils } from '../../engine/core/math-utils';
import { Collision2D } from '../../engine/core/collision2d';
import { BaseGame } from '../../engine/core/base-game';
import CanvasIcon from '../../engine/rendering/canvas-icon';
import { GameBackground } from '../../engine/rendering/background';
import GameEvents from '../../engine/input/events';
import GameLoader from '../../engine/assets/loader';
import { TouchControls } from '../../engine/input/touch-controls';
import type { TouchControlCircle } from '../../engine/interfaces/touch-control-circle';
import { signalValue } from 'reactive-values';
import { FallingPickup } from '../../engine/entities/falling-pickup';

import { PolarityVanguardEnemy } from './enemy';
import type { Polarity } from './polarity';
import { POLARITY_COLORS } from './polarity';
import { PolarityVanguardPlayer } from './player';
import { PolarityProjectile } from './projectile';
import arrowLeftRightSvg from 'lucide-static/icons/arrow-left-right.svg?raw';
import heartSvg from 'lucide-static/icons/heart.svg?raw';

/**
 * Polarity shooter with absorbable shots and a score-chain system.
 * @class PolarityVanguardGame
 */
export class PolarityVanguardGame extends BaseGame {
  /**
   * Stores the touch controls state.
   * @property {TouchControls} touchControls
   * @private
   * @readonly
   */
  private readonly touchControls = new TouchControls();
  /**
   * Stores the polarity icon state.
   * @property {CanvasIcon} polarityIcon
   * @private
   * @readonly
   */
  private readonly polarityIcon = new CanvasIcon(arrowLeftRightSvg);
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
   * @property {PolarityVanguardPlayer} player
   * @private
   * @readonly
   */
  private readonly player = new PolarityVanguardPlayer();
  /**
   * Stores the enemies state.
   * @property {PolarityVanguardEnemy[]} enemies
   * @private
   * @readonly
   */
  private readonly enemies: PolarityVanguardEnemy[] = [];
  /**
   * Stores the player projectiles state.
   * @property {PolarityProjectile[]} playerProjectiles
   * @private
   * @readonly
   */
  private readonly playerProjectiles: PolarityProjectile[] = [];
  /**
   * Stores the enemy projectiles state.
   * @property {PolarityProjectile[]} enemyProjectiles
   * @private
   * @readonly
   */
  private readonly enemyProjectiles: PolarityProjectile[] = [];
  /**
   * Stores the shoot cooldown state.
   * @property {number} shootCooldown
   * @private
   */
  private shootCooldown = 0;
  /**
   * Stores the enemy shot cooldown state.
   * @property {number} enemyShotCooldown
   * @private
   */
  private enemyShotCooldown = 1;
  /**
   * Stores the score state.
   * @property {number} score
   * @private
   */
  private readonly scoreState = signalValue(0);
  private get score(): number { return this.scoreState(); }
  private set score(value: number) { this.scoreState.set(value); }
  /**
   * Stores the absorbed shots state.
   * @property {number} absorbedShots
   * @private
   */
  private readonly absorbedShotsState = signalValue(0);
  private get absorbedShots(): number { return this.absorbedShotsState(); }
  private set absorbedShots(value: number) { this.absorbedShotsState.set(value); }
  /**
   * Stores the chain state.
   * @property {number} chain
   * @private
   */
  private readonly chainState = signalValue(0);
  private get chain(): number { return this.chainState(); }
  private set chain(value: number) { this.chainState.set(value); }
  /**
   * Stores the game over state.
   * @property {boolean} gameOver
   * @private
   */
  private readonly gameOverState = signalValue(false);
  private get gameOver(): boolean { return this.gameOverState(); }
  private set gameOver(value: boolean) { this.gameOverState.set(value); }
  /**
   * Stores the lives state.
   * @property {Signal} lives
   * @private
   * @readonly
   */
  private readonly lives = signalValue(3);
  /**
   * Stores the next life score state.
   * @property {Signal} nextLifeScore
   * @private
   * @readonly
   */
  private readonly nextLifeScore = signalValue(1000);
  /**
   * Stores the life pickup state.
   * @property {Signal} lifePickup
   * @private
   * @readonly
   */
  private readonly lifePickup = signalValue<FallingPickup | undefined>(undefined);
  /**
   * Stores the damage cooldown state.
   * @property {Signal} damageCooldown
   * @private
   * @readonly
   */
  private readonly damageCooldown = signalValue(0);

  /**
   * Initializes the player, controls, projectile pools, and enemy formation.
   * @public
   * @return {void}
   */
  public constructor(onReturnToMenu?: () => void) {
    super(onReturnToMenu);
    this.createProjectiles();
    this.createFormation();
    this.registerCleanup(() => this.touchControls.dispose());
    this.start();
  }

  /**
   * Reports whether the player has lost all lives.
   * @protected
   * @return {boolean}
   */
  protected get isGameOver(): boolean {
    return this.gameOver;
  }

  /**
   * Advances player input, projectiles, enemies, and collision resolution.
   * @protected
   * @return {void}
   */
  protected updateGame(deltaSeconds: number): void {
    this.player.setBottomMargin(this.getPlayerBottomMargin());
    this.player.update(deltaSeconds);
    this.updateLifePickup(deltaSeconds);
    this.damageCooldown.set(Math.max(0, this.damageCooldown() - deltaSeconds));
    this.updateShooting(deltaSeconds);
    this.enemies.filter((enemy) => enemy.alive).forEach((enemy) => {
      enemy.update(deltaSeconds);
    });
    for (const projectile of this.playerProjectiles) projectile.update(deltaSeconds);
    for (const projectile of this.enemyProjectiles) projectile.update(deltaSeconds);
    this.updateEnemyFire(deltaSeconds);
    this.checkCollisions();

    if (this.enemies.every((enemy) => !enemy.alive)) {
      this.createFormation();
    }

  }

  /**
   * Reflows player, enemy formation, and projectile positions on resize.
   * @protected
   * @return {void}
   */
  protected onViewportChanged(): void {
    this.player.reset();
    this.createFormation();
    this.playerProjectiles.forEach((projectile) => {
      projectile.active = false;
    });
    this.enemyProjectiles.forEach((projectile) => {
      projectile.active = false;
    });
  }

  /**
   * Fires player shots while the fire key is held and cooldown is clear.
   * @private
   * @return {void}
   */
  private updateShooting(deltaSeconds: number): void {
    this.shootCooldown -= deltaSeconds;
    const wantsToShoot = GameEvents.isKeyPressed(' ');

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

  /**
   * Schedules formation shots and activates available enemy projectiles.
   * @private
   * @return {void}
   */
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

  /**
   * Resolves polarity absorption, enemy hits, and player damage.
   * @private
   * @return {void}
   */
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
      enemy.defeat();
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

  /**
   * Draws the background, combat entities, HUD, and touch controls.
   * @protected
   * @return {void}
   */
  protected drawGame(): void {
    const hudScale = GameContext.isPortrait ? 0.9 : 1;
    const dimensions = GameContext.gameDimensionsModel;
    const unit = GameContext.viewportUnit();
    GameContext.clear();
    GameBackground.draw(
      GameLoader.getImage('background1080x1920'),
      GameLoader.getImage('background1920x1080')
    );
    for (const enemy of this.enemies) enemy.draw();
    this.drawLifePickup();
    this.player.draw();
    for (const projectile of this.playerProjectiles) projectile.draw();
    for (const projectile of this.enemyProjectiles) projectile.draw();

    this.drawLabel(
      `SCORE ${this.score}`,
      30 * hudScale,
      44 * hudScale,
      Math.max(14, Math.min(unit * 0.035, 22)) * hudScale,
      '#ffffff',
      'left',
      dimensions.getWidth() * 0.35
    );
    this.drawLives();
    this.drawLabel(
      `CHAIN ${this.chain}`,
      30 * hudScale,
      (GameContext.isPortrait ? 132 : 126) * hudScale,
      Math.max(12, Math.min(unit * 0.028, 18)) * hudScale,
      '#ffffff',
      'left',
      dimensions.getWidth() * 0.35
    );
    this.drawLabel(
      `ABSORB ${this.absorbedShots}`,
      30 * hudScale,
      (GameContext.isPortrait ? 160 : 156) * hudScale,
      Math.max(12, Math.min(unit * 0.028, 18)) * hudScale,
      '#ffffff',
      'left',
      dimensions.getWidth() * 0.35
    );
    this.drawLabel(
      `POLARITY ${this.player.currentPolarity.toUpperCase()}`,
      dimensions.getWidth() - 30 * hudScale,
      44 * hudScale,
      Math.max(13, Math.min(unit * 0.032, 20)) * hudScale,
      POLARITY_COLORS[this.player.currentPolarity],
      'right',
      dimensions.getWidth() * 0.38
    );
    this.drawLabel(
      GameContext.isMobileDevice
        ? 'ABSORB MATCHING FIRE. SWITCH POLARITY TO SURVIVE.'
        : 'ARROWS / WASD MOVE   SPACE FIRE   SHIFT OR C SWITCH',
      dimensions.getWidth() * 0.5,
      dimensions.getHeight() - 26,
      Math.max(10, Math.min(unit * 0.022, 14)),
      '#d9e1ff',
      'center',
      dimensions.getWidth() * 0.9
    );
    this.drawTouchControls();

    if (this.gameOver) {
      GameContext.drawRect(0, 0, dimensions.getWidth(), dimensions.getHeight(), '#171125');
      this.drawLabel(
        'VANGUARD DESTROYED',
        dimensions.getWidth() * 0.5,
        dimensions.getHeight() * 0.45,
        Math.max(22, Math.min(unit * 0.065, 42)),
        '#ff6584',
        'center',
        dimensions.getWidth() * 0.85
      );
      this.drawLabel(
        'USE THE ACTION BUTTONS BELOW',
        dimensions.getWidth() * 0.5,
        dimensions.getHeight() * 0.54,
        Math.max(12, Math.min(unit * 0.026, 18)),
        '#ffffff',
        'center',
        dimensions.getWidth() * 0.85
      );
    }
  }

  /**
   * Draws the player's remaining hearts in the HUD.
   * @private
   * @return {void}
   */
  private drawLives(): void {
    const x = GameContext.isPortrait ? 30 : 32;
    const y = GameContext.isPortrait ? 90 : 80;
    const spacing = GameContext.isPortrait ? 28 : 30;
    const size = GameContext.isPortrait ? 22 : 26;

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

  /**
   * Draws the current falling life pickup when present.
   * @private
   * @return {void}
   */
  private drawLifePickup(): void {
    const pickup = this.lifePickup();
    if (pickup === undefined) return;

    this.lifePickupIcon.draw(
      pickup.x - pickup.size * 0.5,
      pickup.y - pickup.size * 0.5,
      pickup.size
    );
  }

  /**
   * Draws shared movement/fire controls and the polarity switch button.
   * @private
   * @return {void}
   */
  private drawTouchControls(): void {
    if (!GameContext.isMobileDevice) return;

    this.touchControls.draw();
    const controls = this.getTouchControlsLayout();
    this.touchControls.setExtraKeys([[controls.polarity, 'c']]);
    this.touchControls.drawExtra(
      controls.polarity,
      this.polarityIcon,
      POLARITY_COLORS[this.player.currentPolarity]
    );
  }

  /**
   * Places polarity directly above the shared fire button.
   * @private
   * @return {{ polarity: TouchControlCircle }} The polarity button bounds.
   */
  private getTouchControlsLayout(): {
    polarity: TouchControlCircle;
  } {
    const { shoot } = this.touchControls.layout;
    return {
      polarity: {
        x: shoot.x,
        y: shoot.y - shoot.radius * 2 - Math.max(8, shoot.radius * 0.35),
        radius: shoot.radius
      }
    };
  }

  /**
   * Calculates the player boundary above the bottom control row.
   * @private
   * @return {number}
   */
  private getPlayerBottomMargin(): number {
    if (!GameContext.isMobileDevice) return 32;

    const shared = this.touchControls.layout;
    const polarity = this.getTouchControlsLayout().polarity;
    const top = Math.min(
      GameContext.gameDimensionsModel.getHeight() - shared.reservedBottom,
      polarity.y - polarity.radius
    );
    return GameContext.gameDimensionsModel.getHeight() - top + 32;
  }

  /**
   * Replaces the enemy formation with a fresh phase and polarity pattern.
   * @private
   * @return {void}
   */
  private createFormation(): void {
    this.enemies.length = 0;
    const dimensions = GameContext.gameDimensionsModel;
    const unit = GameContext.viewportUnit();
    const columns = Math.max(
      3,
      Math.min(8, Math.floor(dimensions.getWidth() / 100))
    );
    const enemyWidth = MathUtils.clamp(unit * 0.052, 28, 48);
    const enemyHeight = enemyWidth * (64 / 72);
    const spacing = dimensions.getWidth() / (columns + 1);
    const startX = (dimensions.getWidth() - (columns - 1) * spacing) * 0.5;

    for (let row = 0; row < 3; row++) {
      for (let column = 0; column < columns; column++) {
        const polarity: Polarity = (row + column) % 2 === 0 ? 'light' : 'dark';
        this.enemies.push(
          new PolarityVanguardEnemy(
            startX + column * spacing,
            Math.max(80, unit * 0.14) + row * spacing * 0.58,
            polarity,
            row * columns + column,
            enemyWidth,
            enemyHeight
          )
        );
      }
    }

    this.enemyShotCooldown = 0.8;
  }

  /**
   * Adds score and advances the next extra-life threshold.
   * @private
   * @return {void}
   */
  private addScore(points: number): void {
    this.score += points;

    while (this.score >= this.nextLifeScore()) {
      if (this.lives() < 3 && this.lifePickup() === undefined) {
        this.spawnLifePickup();
      }

      this.nextLifeScore.set(this.nextLifeScore() + 1000);
    }
  }

  /**
   * Creates a falling heart when the score milestone grants one.
   * @private
   * @return {void}
   */
  private spawnLifePickup(): void {
    const dimensions = GameContext.gameDimensionsModel;
    const size = GameContext.isPortrait ? 58 : 42;

    const x = size * 0.5 + Math.random() * (dimensions.getWidth() - size);
    const y = -size * 0.5;
    this.lifePickup.set(new FallingPickup(x, y, size));
  }

  /**
   * Moves the heart and restores a life when it overlaps the player.
   * @private
   * @return {void}
   */
  private updateLifePickup(deltaSeconds: number): void {
    const pickup = this.lifePickup();
    if (pickup === undefined) return;

    pickup.update(deltaSeconds);
    const nextY = pickup.y;
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

  }

  /**
   * Preallocates reusable player and enemy projectile pools.
   * @private
   * @return {void}
   */
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
          7
        )
      );
    }
  }

  /**
   * Resets score, lives, projectiles, enemies, and player state.
   * @protected
   * @return {void}
   */
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

  /**
   * Tests a rectangle against a circular projectile hit area.
   * @private
   * @return {boolean} Whether the shapes overlap.
   */
  private overlapsCircle(
    circleX: number,
    circleY: number,
    radius: number,
    rectangleX: number,
    rectangleY: number,
    rectangleWidth: number,
    rectangleHeight: number
  ): boolean {
    return Collision2D.overlapsCircleAndRectangle(
      circleX,
      circleY,
      radius,
      rectangleX - rectangleWidth * 0.5,
      rectangleY - rectangleHeight * 0.5,
      rectangleWidth,
      rectangleHeight
    );
  }
}
