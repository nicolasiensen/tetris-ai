export interface ScoreEntry {
  id: number;
  name: string;
  score: number;
  level: number;
  lines: number;
  created_at: string;
}

export async function createSession(): Promise<{ token: string }> {
  const res = await fetch('/api/sessions', { method: 'POST' });
  if (!res.ok) {
    throw new Error('Failed to create session');
  }
  return res.json();
}

export async function submitScore(data: {
  name: string;
  score: number;
  level: number;
  lines: number;
  token: string;
}): Promise<ScoreEntry> {
  const res = await fetch('/api/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error || 'Failed to submit score');
  }
  return res.json();
}

export async function fetchLeaderboard(limit = 10): Promise<ScoreEntry[]> {
  const res = await fetch(`/api/scores?limit=${limit}`);
  if (!res.ok) {
    throw new Error('Failed to fetch leaderboard');
  }
  return res.json();
}
