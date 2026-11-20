import type { GameModeId } from '../game/types';

export interface ScoreEntry {
  id: string;
  nickname: string;
  score: number;
  mode: GameModeId;
  /** ISO date string. */
  createdAt: string;
}

export interface NewScore {
  nickname: string;
  score: number;
  mode: GameModeId;
}

/**
 * A place where scores are stored. Implementations: LocalLeaderboard
 * (localStorage, zero setup) and SupabaseLeaderboard (hosted, shared by
 * everyone). Add another backend by implementing this interface and wiring it
 * in `createLeaderboard`.
 */
export interface LeaderboardBackend {
  readonly kind: 'local' | 'supabase';
  /** Human-readable description shown on the leaderboard screen. */
  readonly description: string;
  /** Best scores of a mode, highest first. */
  top(mode: GameModeId, limit: number): Promise<ScoreEntry[]>;
  /** Saves a score (already validated with `validateNewScore`). */
  submit(entry: NewScore): Promise<void>;
}

export const NICKNAME_MAX_LENGTH = 20;
export const SCORE_MAX = 1_000_000;

/** Trims and collapses whitespace, removes control characters. */
export function cleanNickname(raw: string): string {
  return raw
    .replace(/\p{Cc}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Returns an error message (in Portuguese, shown in the UI) or null if valid. */
export function validateNewScore(entry: NewScore): string | null {
  const length = [...entry.nickname].length;
  if (length < 1) return 'Digite um apelido.';
  if (length > NICKNAME_MAX_LENGTH) return `O apelido pode ter no máximo ${NICKNAME_MAX_LENGTH} caracteres.`;
  if (!Number.isInteger(entry.score) || entry.score < 0 || entry.score > SCORE_MAX) return 'Pontuação inválida.';
  if (entry.mode !== 'stairs' && entry.mode !== 'random') return 'Modo de jogo inválido.';
  return null;
}
