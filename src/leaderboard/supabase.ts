import type { SupabaseClient } from '@supabase/supabase-js';
import type { GameModeId } from '../game/types';
import type { LeaderboardBackend, NewScore, ScoreEntry } from './types';

/** Table created by supabase/schema.sql. */
const TABLE = 'scores';

interface ScoreRow {
  id: number;
  nickname: string;
  score: number;
  mode: GameModeId;
  created_at: string;
}

/**
 * Online leaderboard stored in Supabase (Postgres). The anon key only allows
 * SELECT and INSERT (see Row Level Security in supabase/schema.sql).
 */
export class SupabaseLeaderboard implements LeaderboardBackend {
  readonly kind = 'supabase' as const;
  readonly description = 'Placar online: pontuações de todos os jogadores.';
  private client: Promise<SupabaseClient> | null = null;

  constructor(
    private readonly url: string,
    private readonly anonKey: string,
  ) {}

  /** supabase-js is loaded on demand, so it's not in the main bundle. */
  private getClient(): Promise<SupabaseClient> {
    this.client ??= import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(this.url, this.anonKey, { auth: { persistSession: false, autoRefreshToken: false } }),
    );
    return this.client;
  }

  async top(mode: GameModeId, limit: number): Promise<ScoreEntry[]> {
    const client = await this.getClient();
    const { data, error } = await client
      .from(TABLE)
      .select('id, nickname, score, mode, created_at')
      .eq('mode', mode)
      .order('score', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) throw new Error(`Não foi possível carregar o placar online (${error.message}).`);
    return ((data ?? []) as ScoreRow[]).map((row) => ({
      id: String(row.id),
      nickname: row.nickname,
      score: row.score,
      mode: row.mode,
      createdAt: row.created_at,
    }));
  }

  async submit(entry: NewScore): Promise<void> {
    const client = await this.getClient();
    const { error } = await client.from(TABLE).insert({
      nickname: entry.nickname,
      score: entry.score,
      mode: entry.mode,
    });
    if (error) throw new Error(`Não foi possível salvar no placar online (${error.message}).`);
  }
}
