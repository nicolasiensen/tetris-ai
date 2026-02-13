import { describe, it, expect } from 'vitest';
import { validateScoreInput, checkPlausibility } from './validation.ts';

describe('validateScoreInput', () => {
  const validInput = { name: 'Alice', score: 1000, level: 5, lines: 40, token: 'abc-123' };

  it('accepts valid input', () => {
    const result = validateScoreInput(validInput);
    expect(result).toEqual({ valid: true, data: validInput });
  });

  it('trims whitespace from name', () => {
    const result = validateScoreInput({ ...validInput, name: '  Bob  ' });
    expect(result).toEqual({ valid: true, data: { ...validInput, name: 'Bob' } });
  });

  it('accepts zero values for score, level, lines', () => {
    const result = validateScoreInput({ name: 'Test', score: 0, level: 0, lines: 0, token: 't' });
    expect(result).toEqual({
      valid: true,
      data: { name: 'Test', score: 0, level: 0, lines: 0, token: 't' },
    });
  });

  it('rejects null body', () => {
    const result = validateScoreInput(null);
    expect(result).toEqual({ valid: false, error: 'Request body must be a JSON object' });
  });

  it('rejects non-object body', () => {
    const result = validateScoreInput('string');
    expect(result).toEqual({ valid: false, error: 'Request body must be a JSON object' });
  });

  it('rejects missing name', () => {
    const result = validateScoreInput({ score: 100, level: 1, lines: 5, token: 't' });
    expect(result).toEqual({ valid: false, error: 'name must be a string' });
  });

  it('rejects empty name', () => {
    const result = validateScoreInput({ ...validInput, name: '   ' });
    expect(result).toEqual({ valid: false, error: 'name must not be empty' });
  });

  it('rejects name over 20 characters', () => {
    const result = validateScoreInput({ ...validInput, name: 'A'.repeat(21) });
    expect(result).toEqual({ valid: false, error: 'name must be at most 20 characters' });
  });

  it('accepts name of exactly 20 characters', () => {
    const name = 'A'.repeat(20);
    const result = validateScoreInput({ ...validInput, name });
    expect(result).toEqual({ valid: true, data: { ...validInput, name } });
  });

  it('rejects non-integer score', () => {
    const result = validateScoreInput({ ...validInput, score: 1.5 });
    expect(result).toEqual({ valid: false, error: 'score must be a non-negative integer' });
  });

  it('rejects negative score', () => {
    const result = validateScoreInput({ ...validInput, score: -1 });
    expect(result).toEqual({ valid: false, error: 'score must be a non-negative integer' });
  });

  it('rejects string score', () => {
    const result = validateScoreInput({ ...validInput, score: '100' });
    expect(result).toEqual({ valid: false, error: 'score must be a non-negative integer' });
  });

  it('rejects score over max', () => {
    const result = validateScoreInput({ ...validInput, score: 1_000_000_000 });
    expect(result).toEqual({ valid: false, error: 'score must be at most 999999999' });
  });

  it('rejects non-integer level', () => {
    const result = validateScoreInput({ ...validInput, level: 2.5 });
    expect(result).toEqual({ valid: false, error: 'level must be a non-negative integer' });
  });

  it('rejects level over max', () => {
    const result = validateScoreInput({ ...validInput, level: 1001 });
    expect(result).toEqual({ valid: false, error: 'level must be at most 1000' });
  });

  it('rejects non-integer lines', () => {
    const result = validateScoreInput({ ...validInput, lines: 3.14 });
    expect(result).toEqual({ valid: false, error: 'lines must be a non-negative integer' });
  });

  it('rejects lines over max', () => {
    const result = validateScoreInput({ ...validInput, lines: 1_000_000 });
    expect(result).toEqual({ valid: false, error: 'lines must be at most 999999' });
  });

  it('rejects missing token', () => {
    const { token: _, ...noToken } = validInput;
    const result = validateScoreInput(noToken);
    expect(result).toEqual({ valid: false, error: 'token must be a non-empty string' });
  });

  it('rejects empty token', () => {
    const result = validateScoreInput({ ...validInput, token: '' });
    expect(result).toEqual({ valid: false, error: 'token must be a non-empty string' });
  });

  it('rejects non-string token', () => {
    const result = validateScoreInput({ ...validInput, token: 123 });
    expect(result).toEqual({ valid: false, error: 'token must be a non-empty string' });
  });
});

describe('checkPlausibility', () => {
  it('accepts a valid score', () => {
    // 40 lines at level 5 = floor(40/10)+1 = 5 ✓
    const result = checkPlausibility({ score: 1000, level: 5, lines: 40 });
    expect(result).toBeNull();
  });

  it('accepts zero lines with small score from drops', () => {
    // 0 lines → level must be 1
    const result = checkPlausibility({ score: 200, level: 1, lines: 0 });
    expect(result).toBeNull();
  });

  it('rejects inconsistent level-lines', () => {
    // 40 lines → expected level 5, not 3
    const result = checkPlausibility({ score: 1000, level: 3, lines: 40 });
    expect(result).toContain('inconsistent');
  });

  it('rejects impossibly high score', () => {
    // 10 lines at level 2 → upper bound = ceil(10/4)*800*2 + 10*100 + 5000 = 4800+1000+5000 = 10800
    const result = checkPlausibility({ score: 50000, level: 2, lines: 10 });
    expect(result).toContain('exceeds plausible maximum');
  });

  it('accepts a high but plausible score', () => {
    // 100 lines at level 11 → upper bound = ceil(100/4)*800*11 + 100*100 + 5000 = 220000+10000+5000 = 235000
    const result = checkPlausibility({ score: 200000, level: 11, lines: 100 });
    expect(result).toBeNull();
  });

  it('accepts zero score with zero lines', () => {
    const result = checkPlausibility({ score: 0, level: 1, lines: 0 });
    expect(result).toBeNull();
  });

  it('accepts score at exact upper bound', () => {
    // 4 lines at level 1 → upper bound = ceil(4/4)*800*1 + 4*100 + 5000 = 800+400+5000 = 6200
    const result = checkPlausibility({ score: 6200, level: 1, lines: 4 });
    expect(result).toBeNull();
  });

  it('rejects score just over upper bound', () => {
    // upper bound = 6200 (same as above)
    const result = checkPlausibility({ score: 6201, level: 1, lines: 4 });
    expect(result).toContain('exceeds plausible maximum');
  });
});
