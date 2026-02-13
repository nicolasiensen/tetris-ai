import { submitScore, fetchLeaderboard, type ScoreEntry } from '../api.ts';

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export class LeaderboardOverlay {
  private overlay: HTMLDivElement;
  private onRestart: () => void;

  constructor(parent: HTMLElement, onRestart: () => void) {
    this.onRestart = onRestart;
    this.overlay = document.createElement('div');
    this.overlay.id = 'leaderboard-overlay';
    this.overlay.style.display = 'none';
    parent.appendChild(this.overlay);
  }

  show(stats: { score: number; level: number; lines: number }, token: string | null): void {
    this.overlay.style.display = 'flex';
    this.showSubmitForm(stats, token);
  }

  hide(): void {
    this.overlay.style.display = 'none';
    this.overlay.innerHTML = '';
  }

  private showSubmitForm(
    stats: { score: number; level: number; lines: number },
    token: string | null,
  ): void {
    this.overlay.innerHTML = `
      <div class="lb-panel">
        <h1 class="lb-title">GAME OVER</h1>
        <div class="lb-stats">
          <div class="lb-stat"><span class="lb-label">Score</span><span class="lb-value">${stats.score.toLocaleString()}</span></div>
          <div class="lb-stat"><span class="lb-label">Level</span><span class="lb-value">${stats.level}</span></div>
          <div class="lb-stat"><span class="lb-label">Lines</span><span class="lb-value">${stats.lines}</span></div>
        </div>
        <form class="lb-form" autocomplete="off">
          <input
            type="text"
            class="lb-input"
            placeholder="Enter your name"
            maxlength="20"
            autofocus
          />
          <div class="lb-buttons">
            <button type="submit" class="lb-btn lb-btn-primary">Submit</button>
            <button type="button" class="lb-btn lb-btn-secondary lb-skip-btn">Skip</button>
          </div>
        </form>
      </div>
    `;

    const form = this.overlay.querySelector('.lb-form') as HTMLFormElement;
    const input = this.overlay.querySelector('.lb-input') as HTMLInputElement;
    const skipBtn = this.overlay.querySelector('.lb-skip-btn') as HTMLButtonElement;

    // Prevent game inputs while typing
    input.addEventListener('keydown', (e) => e.stopPropagation());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = input.value.trim();
      if (!name) {
        input.focus();
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      try {
        if (token) {
          await submitScore({ name, ...stats, token });
        }
      } catch {
        // Still show leaderboard even if submit fails
      }
      this.showLeaderboard();
    });

    skipBtn.addEventListener('click', () => {
      this.showLeaderboard();
    });

    // Focus the input after a brief delay to ensure it's rendered
    requestAnimationFrame(() => input.focus());
  }

  private async showLeaderboard(): Promise<void> {
    this.overlay.innerHTML = `
      <div class="lb-panel">
        <h1 class="lb-title">LEADERBOARD</h1>
        <div class="lb-loading">Loading...</div>
      </div>
    `;

    let scores: ScoreEntry[] = [];
    try {
      scores = await fetchLeaderboard(10);
    } catch {
      // Show empty leaderboard on error
    }

    let tableRows = '';
    if (scores.length === 0) {
      tableRows = '<tr><td colspan="5" class="lb-empty">No scores yet</td></tr>';
    } else {
      tableRows = scores
        .map(
          (entry, i) => `
          <tr>
            <td class="lb-rank">${i + 1}</td>
            <td class="lb-name">${escapeHtml(entry.name)}</td>
            <td class="lb-score">${entry.score.toLocaleString()}</td>
            <td>${entry.level}</td>
            <td>${entry.lines}</td>
          </tr>
        `,
        )
        .join('');
    }

    this.overlay.innerHTML = `
      <div class="lb-panel">
        <h1 class="lb-title">LEADERBOARD</h1>
        <table class="lb-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Score</th>
              <th>Level</th>
              <th>Lines</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        <button class="lb-btn lb-btn-primary lb-play-again">Play Again</button>
      </div>
    `;

    const playAgainBtn = this.overlay.querySelector('.lb-play-again') as HTMLButtonElement;
    playAgainBtn.addEventListener('click', () => {
      this.hide();
      this.onRestart();
    });
  }

  destroy(): void {
    this.overlay.remove();
  }
}
