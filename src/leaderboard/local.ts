import type { GameModeId } from '../game/types';
import type { LeaderboardBackend, NewScore, ScoreEntry } from './types';

const STORAGE_KEY = 'magic-words:scores:v1';
/** Keep only the best N scores per mode so storage never grows unbounded. */
const KEEP_PER_MODE = 100;

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function isScoreEntry(value: unknown): value is ScoreEntry {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.nickname === 'string' &&
    typeof v.score === 'number' &&
    (v.mode === 'stairs' || v.mode === 'random') &&
    typeof v.createdAt === 'string'
  );
}

export function compareScores(a: ScoreEntry, b: ScoreEntry): number {
  // Highest score first; on a tie, whoever got there first.
  return b.score - a.score || a.createdAt.localeCompare(b.createdAt);
}

/** Leaderboard saved in this browser only. Works with zero setup. */
export class LocalLeaderboard implements LeaderboardBackend {
  readonly kind = 'local' as const;
  readonly description = 'Placar local: salvo só neste navegador.';

  constructor(private readonly storage: StorageLike | null = safeLocalStorage()) {}

  async top(mode: GameModeId, limit: number): Promise<ScoreEntry[]> {
    return this.read()
      .filter((e) => e.mode === mode)
      .sort(compareScores)
      .slice(0, limit);
  }

  async submit(entry: NewScore): Promise<void> {
    const all = this.read();
    all.push({
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      nickname: entry.nickname,
      score: entry.score,
      mode: entry.mode,
      createdAt: new Date().toISOString(),
    });
    const kept = (['stairs', 'random'] as const).flatMap((mode) =>
      all
        .filter((e) => e.mode === mode)
        .sort(compareScores)
        .slice(0, KEEP_PER_MODE),
    );
    this.write(kept);
  }

  private read(): ScoreEntry[] {
    if (!this.storage) return [];
    try {
      const parsed: unknown = JSON.parse(this.storage.getItem(STORAGE_KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter(isScoreEntry) : [];
    } catch {
      return [];
    }
  }

  private write(entries: ScoreEntry[]): void {
    if (!this.storage) throw new Error('Não foi possível salvar: o armazenamento do navegador está bloqueado.');
    this.storage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }
}

function safeLocalStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
