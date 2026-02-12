export interface GameStateEventMap {
  hardDrop: void;
  lock: void;
  lineClear: { count: number };
  gameOver: void;
  pause: void;
  resume: void;
  levelChange: { level: number };
  restart: void;
}

export type GameStateEventHandler<K extends keyof GameStateEventMap> =
  GameStateEventMap[K] extends void ? () => void : (data: GameStateEventMap[K]) => void;
