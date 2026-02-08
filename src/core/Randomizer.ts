import type { PieceType } from '../types.ts';

const ALL_PIECES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export class Randomizer {
  private queue: PieceType[] = [];

  constructor() {
    this.refill();
    this.refill();
  }

  next(): PieceType {
    if (this.queue.length <= 7) {
      this.refill();
    }
    return this.queue.shift()!;
  }

  peek(count: number): PieceType[] {
    while (this.queue.length < count) {
      this.refill();
    }
    return this.queue.slice(0, count);
  }

  private refill(): void {
    const bag = [...ALL_PIECES];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    this.queue.push(...bag);
  }
}
