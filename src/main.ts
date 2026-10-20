import './style.css'
import { GameSelector } from './games/game-selector';
import GameLoader from './engine/assets/loader';

window.addEventListener('load', async () => {

  await GameLoader.loadAll();
  new GameSelector();
});
