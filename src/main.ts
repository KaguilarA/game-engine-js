import './style.css'
import { Game } from './class/game.ts';

window.addEventListener('load', () => {
  const app = document.getElementById('app');
  const game = new Game(app!);
});