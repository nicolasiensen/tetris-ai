import crypto from 'node:crypto';
import { Router } from 'express';
import { insertScore, getTopScores, insertSession, getSession, markSessionUsed } from './db.ts';
import { validateScoreInput, checkPlausibility } from './validation.ts';

const MIN_SESSION_MS = 3000;

const router = Router();

router.get('/scores', (req, res) => {
  const limitParam = Number(req.query.limit) || 10;
  const limit = Math.min(Math.max(1, limitParam), 100);
  const scores = getTopScores.all({ limit });
  res.json(scores);
});

router.post('/sessions', (_req, res) => {
  const token = crypto.randomUUID();
  insertSession.run({ token, created_at: Date.now() });
  res.status(201).json({ token });
});

router.post('/scores', (req, res) => {
  const result = validateScoreInput(req.body);
  if (!result.valid) {
    res.status(400).json({ error: result.error });
    return;
  }

  const { token, ...scoreData } = result.data;

  // Validate session token
  const session = getSession.get({ token }) as
    | { token: string; created_at: number; used: number }
    | undefined;

  if (!session) {
    res.status(400).json({ error: 'Invalid session token' });
    return;
  }

  if (session.used) {
    res.status(400).json({ error: 'Session token already used' });
    return;
  }

  // Check minimum elapsed time
  const elapsed = Date.now() - session.created_at;
  if (elapsed < MIN_SESSION_MS) {
    res.status(400).json({ error: 'Game session too short' });
    return;
  }

  // Check score plausibility
  const plausibilityError = checkPlausibility(scoreData);
  if (plausibilityError) {
    res.status(400).json({ error: plausibilityError });
    return;
  }

  // Mark session as used and insert score
  markSessionUsed.run({ token });
  const info = insertScore.run(scoreData);
  const entry = {
    id: info.lastInsertRowid,
    ...scoreData,
  };
  res.status(201).json(entry);
});

export default router;
