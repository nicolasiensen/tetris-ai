export interface ScoreInput {
  name: string;
  score: number;
  level: number;
  lines: number;
  token: string;
}

export interface ValidationResult {
  valid: true;
  data: ScoreInput;
}

export interface ValidationError {
  valid: false;
  error: string;
}

const MAX_SCORE = 999_999_999;
const MAX_LEVEL = 1000;
const MAX_LINES = 999_999;
const MAX_NAME_LENGTH = 20;

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

export function validateScoreInput(body: unknown): ValidationResult | ValidationError {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const { name, score, level, lines } = body as Record<string, unknown>;

  if (typeof name !== 'string') {
    return { valid: false, error: 'name must be a string' };
  }

  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    return { valid: false, error: 'name must not be empty' };
  }
  if (trimmedName.length > MAX_NAME_LENGTH) {
    return { valid: false, error: `name must be at most ${MAX_NAME_LENGTH} characters` };
  }

  if (!isNonNegativeInteger(score)) {
    return { valid: false, error: 'score must be a non-negative integer' };
  }
  if (score > MAX_SCORE) {
    return { valid: false, error: `score must be at most ${MAX_SCORE}` };
  }

  if (!isNonNegativeInteger(level)) {
    return { valid: false, error: 'level must be a non-negative integer' };
  }
  if (level > MAX_LEVEL) {
    return { valid: false, error: `level must be at most ${MAX_LEVEL}` };
  }

  if (!isNonNegativeInteger(lines)) {
    return { valid: false, error: 'lines must be a non-negative integer' };
  }
  if (lines > MAX_LINES) {
    return { valid: false, error: `lines must be at most ${MAX_LINES}` };
  }

  const { token } = body as Record<string, unknown>;
  if (typeof token !== 'string' || token.length === 0) {
    return { valid: false, error: 'token must be a non-empty string' };
  }

  return {
    valid: true,
    data: { name: trimmedName, score, level, lines, token },
  };
}

export function checkPlausibility(data: {
  score: number;
  level: number;
  lines: number;
}): string | null {
  const { score, level, lines } = data;

  // Level-lines consistency: level must equal floor(lines / 10) + 1
  const expectedLevel = Math.floor(lines / 10) + 1;
  if (level !== expectedLevel) {
    return `level ${level} is inconsistent with ${lines} lines (expected ${expectedLevel})`;
  }

  // Score upper bound:
  // - Max line clear points: all tetrises at max level = ceil(lines/4) * 800 * level
  // - Generous drop bonus: lines * 100
  // - Buffer for zero-line games (drops only): 5000
  const maxLineClearPoints = Math.ceil(lines / 4) * 800 * level;
  const maxDropBonus = lines * 100;
  const upperBound = maxLineClearPoints + maxDropBonus + 5000;

  if (score > upperBound) {
    return `score ${score} exceeds plausible maximum of ${upperBound} for ${lines} lines at level ${level}`;
  }

  return null;
}
