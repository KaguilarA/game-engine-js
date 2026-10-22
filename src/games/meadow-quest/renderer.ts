import GameContext from '../../engine/core/context';
import GameLoader from '../../engine/assets/loader';
import Sprite from '../../engine/animations/sprites/sprite';
import type { Coin, Platform } from './level';

export interface PlatformerRenderState {
  cameraX: number;
  playerX: number;
  playerY: number;
  facing: number;
  score: number;
  lives: number;
  won: boolean;
  enemyX: number;
  moving: boolean;
  platforms: Platform[];
  coins: Coin[];
}

type DrawLabel = (text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign) => void;

/** Draws the platformer scene without owning its gameplay state. */
export class PlatformerRenderer {
  private readonly heroSprite: Sprite;
  private activeHeroClip = '';

  public constructor() {
    this.heroSprite = new Sprite(GameLoader.getImage('mario'), 56, 65, 0, 0, 0.5, 1);
    this.setHeroClip('idle');
  }

  public update(deltaSeconds: number, moving: boolean): void {
    this.setHeroClip(moving ? 'run' : 'idle');
    this.heroSprite.update(deltaSeconds);
  }

  public draw(state: PlatformerRenderState, drawLabel: DrawLabel): void {
    const viewport = GameContext.gameDimensionsModel;
    const width = viewport.getWidth();
    const height = viewport.getHeight();
    const floor = height * 0.79;
    const scale = Math.max(24, Math.min(42, height * 0.052));
    GameContext.clear();
    GameContext.drawRect(0, 0, width, height, '#73c9ff');
    this.drawClouds(width, height, state.cameraX);
    GameContext.drawRect(0, floor, width, height - floor, '#56b844');
    GameContext.drawRect(0, floor + 15, width, height - floor, '#9b592d');
    for (let x = -(state.cameraX % 42); x < width; x += 42) {
      GameContext.drawRect(x, floor + 15, 40, 3, '#c87c3a');
      GameContext.drawRect(x + 18, floor + 18, 3, 22, '#704122');
    }

    for (const platform of state.platforms) {
      const x = platform.x - state.cameraX;
      if (platform.kind === 'ground' || x < -platform.width || x > width) continue;
      const color = platform.kind === 'question' ? '#f4ae32' : '#b75a35';
      GameContext.drawRect(x, platform.y, platform.width, platform.height, color);
      GameContext.drawRect(x, platform.y, platform.width, 4, platform.kind === 'question' ? '#ffe179' : '#e78950');
      if (platform.kind === 'question') drawLabel('?', x + platform.width / 2, platform.y + platform.height * 0.72, platform.height * 0.72, '#fff4b0', 'center');
    }

    for (const coin of state.coins) {
      if (coin.collected) continue;
      const x = coin.x - state.cameraX;
      if (x > -20 && x < width + 20) {
        GameContext.drawCircle(x, coin.y, scale * 0.22, '#ffd843');
        GameContext.drawCircle(x, coin.y, scale * 0.11, '#fff2a0');
      }
    }

    const enemyY = floor - scale * 0.36;
    if (state.enemyX >= state.cameraX - 50 && state.enemyX <= state.cameraX + width + 50) {
      const ex = state.enemyX - state.cameraX;
      GameContext.drawCircle(ex, enemyY, scale * 0.38, '#a34739');
      GameContext.drawRect(ex - scale * 0.28, floor - scale * 0.12, scale * 0.56, scale * 0.12, '#59352f');
      GameContext.drawCircle(ex - scale * 0.13, enemyY - scale * 0.05, scale * 0.045, '#fff');
      GameContext.drawCircle(ex + scale * 0.13, enemyY - scale * 0.05, scale * 0.045, '#fff');
    }

    const px = state.playerX - state.cameraX;
    const playerWidth = Math.max(25, height * 0.045);
    const playerHeight = playerWidth * 1.35;
    this.heroSprite.dimensions.setSize(playerWidth * 1.15, playerHeight);
    this.heroSprite.dimensions.setPosition(px + playerWidth * 0.5, state.playerY + playerHeight);
    this.heroSprite.dimensions.setScale(state.facing, 1);
    this.heroSprite.draw();

    const goalX = 3500 - state.cameraX;
    GameContext.drawRect(goalX, floor - scale * 2.8, 5, scale * 2.8, '#f4f1d0');
    GameContext.drawRect(goalX + 5, floor - scale * 2.8, scale * 0.9, scale * 0.55, '#e64f48');
    drawLabel('MEADOW QUEST', width * 0.5, Math.max(30, height * 0.055), Math.max(21, height * 0.042), '#fff9dd', 'center');
    drawLabel(`COINS ${state.score}     LIVES ${state.lives}`, width * 0.5, height * 0.105, Math.max(14, height * 0.024), '#ffffff', 'center');
    if (state.won) drawLabel('LEVEL CLEAR!', width * 0.5, height * 0.43, Math.max(34, height * 0.075), '#fff6a5', 'center');
  }

  private setHeroClip(name: 'idle' | 'run'): void {
    if (this.activeHeroClip === name) return;
    this.heroSprite.playAtlasClip(GameLoader.getAtlas('mario').getAnimation(name));
    this.activeHeroClip = name;
  }

  private drawClouds(width: number, height: number, cameraX: number): void {
    const drift = cameraX * 0.2;
    for (let index = 0; index < 7; index++) {
      const x = ((index * 210 - drift) % (width + 240) + width + 240) % (width + 240) - 80;
      const y = height * (0.18 + (index % 3) * 0.09);
      GameContext.drawCircle(x, y, 22, '#ffffff');
      GameContext.drawCircle(x + 25, y - 8, 28, '#ffffff');
      GameContext.drawCircle(x + 52, y, 20, '#ffffff');
      GameContext.drawRect(x, y, 52, 18, '#ffffff');
    }
  }
}
