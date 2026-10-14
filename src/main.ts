import './style.css'
import { Game } from './class/game.ts';
import GameLoader from './engine/loader';

window.addEventListener('load', async () => {

  await GameLoader.loadAll();
  new Game();
});