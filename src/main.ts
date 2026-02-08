import { GameLoop } from './game/GameLoop.ts';
import './style.css';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const game = new GameLoop(canvas, ctx);
game.start();
