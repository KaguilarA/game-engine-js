import { GameContext } from '../engine/context';
import { Events } from '../engine/events';
import { Player } from './player.ts';
import { Projectile } from './projectile';

export class Game {
  private parent: HTMLElement;
  private events = new Events();
  private context = new GameContext();
  private player = new Player(this.context, this.events);

  private projectiles: Projectile[] = [];
  private projectileLength = 10;

  constructor(parent: HTMLElement) {
    this.parent = parent;
    this.parent.appendChild(this.context.canvas);
    this.player.update();
    this.events.initEvents();
    this.gameLoop();
    this.initProjectiles();

    console.log('Projectiles initialized:', this);
  }

  private gameLoop(): void {
    this.context.clear();
    this.player.draw();
    this.player.update();

    this.projectiles.forEach(projectile => {
      projectile.update();
      projectile.draw();
    });

    if (this.events.isKeyPressed('1')) {
      this.shootProjectile();
    }

    requestAnimationFrame(() => this.gameLoop());
  }

  private initProjectiles(): void {
    for (let i = 0; i < this.projectileLength; i++) {
      this.projectiles.push(new Projectile(this.context));
    }
  }

  private getProjectile(): Projectile | undefined {
    for(let i = 0; i < this.projectiles.length; i++) {
      if (this.projectiles[i].isFree()) {
        return this.projectiles[i];
      }
    }
    return undefined;
  }

  public shootProjectile(): void {
    const projectile = this.getProjectile();
    if (projectile) {
      projectile.start(this.player.x, this.player.y);
    }
  }
}