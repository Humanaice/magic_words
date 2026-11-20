import { LocalLeaderboard } from './local';
import { SupabaseLeaderboard } from './supabase';
import type { LeaderboardBackend } from './types';

export * from './types';

/**
 * Chooses the backend from the build-time environment:
 * VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set -> Supabase, otherwise local.
 */
export function createLeaderboard(env: ImportMetaEnv = import.meta.env): LeaderboardBackend {
  const url = env.VITE_SUPABASE_URL?.trim();
  const key = env.VITE_SUPABASE_ANON_KEY?.trim();
  if (url && key) return new SupabaseLeaderboard(url, key);
  return new LocalLeaderboard();
}

export const leaderboard: LeaderboardBackend = createLeaderboard();

const NICKNAME_KEY = 'magic-words:nickname';

export function loadNickname(): string {
  try {
    return localStorage.getItem(NICKNAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveNickname(nickname: string): void {
  try {
    localStorage.setItem(NICKNAME_KEY, nickname);
  } catch {
    // Ignore: remembering the nickname is only a convenience.
  }
}
