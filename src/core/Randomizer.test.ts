import { describe, it, expect } from 'vitest';
import { Randomizer } from './Randomizer.ts';
import type { PieceType } from '../types.ts';

const ALL_PIECES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

describe('Randomizer', () => {
  it('returns all 7 piece types in the first 7 draws', () => {
    const rand = new Randomizer();
    const first7: PieceType[] = [];
    for (let i = 0; i < 7; i++) {
      first7.push(rand.next());
    }
    expect([...first7].sort()).toEqual([...ALL_PIECES].sort());
  });

  it('every group of 7 pieces contains all types (7-bag property)', () => {
    const rand = new Randomizer();
    for (let bag = 0; bag < 10; bag++) {
      const group: PieceType[] = [];
      for (let i = 0; i < 7; i++) {
        group.push(rand.next());
      }
      expect([...group].sort()).toEqual([...ALL_PIECES].sort());
    }
  });

  it('peek returns upcoming pieces without consuming them', () => {
    const rand = new Randomizer();
    const peeked = rand.peek(5);
    expect(peeked).toHaveLength(5);

    // Drawing should return the same pieces
    for (let i = 0; i < 5; i++) {
      expect(rand.next()).toBe(peeked[i]);
    }
  });

  it('peek with count larger than current queue still works', () => {
    const rand = new Randomizer();
    const peeked = rand.peek(20);
    expect(peeked).toHaveLength(20);
    // All should be valid piece types
    for (const p of peeked) {
      expect(ALL_PIECES).toContain(p);
    }
  });
});
