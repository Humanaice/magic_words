import { describe, expect, it } from 'vitest';
import { createLeaderboard } from './index';
import { LocalLeaderboard } from './local';
import { cleanNickname, validateNewScore } from './types';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

describe('LocalLeaderboard', () => {
  it('returns the top scores of a mode, highest first', async () => {
    const board = new LocalLeaderboard(memoryStorage());
    await board.submit({ nickname: 'ana', score: 30, mode: 'stairs' });
    await board.submit({ nickname: 'bia', score: 90, mode: 'stairs' });
    await board.submit({ nickname: 'caio', score: 60, mode: 'random' });
    await board.submit({ nickname: 'davi', score: 50, mode: 'stairs' });

    const top = await board.top('stairs', 2);
    expect(top.map((e) => [e.nickname, e.score])).toEqual([
      ['bia', 90],
      ['davi', 50],
    ]);
    expect((await board.top('random', 10)).map((e) => e.nickname)).toEqual(['caio']);
  });

  it('ignores corrupted storage', async () => {
    const storage = memoryStorage();
    storage.setItem('magic-words:scores:v1', '{not json');
    expect(await new LocalLeaderboard(storage).top('stairs', 10)).toEqual([]);
    storage.setItem('magic-words:scores:v1', JSON.stringify([{ nickname: 1 }]));
    expect(await new LocalLeaderboard(storage).top('stairs', 10)).toEqual([]);
  });
});

describe('validation', () => {
  it('cleans nicknames', () => {
    expect(cleanNickname('  Wil\u0000low   da  Silva ')).toBe('Willow da Silva');
  });

  it('validates nickname length, score range and mode', () => {
    expect(validateNewScore({ nickname: 'Willow', score: 120, mode: 'stairs' })).toBeNull();
    expect(validateNewScore({ nickname: '', score: 120, mode: 'stairs' })).not.toBeNull();
    expect(validateNewScore({ nickname: 'x'.repeat(21), score: 1, mode: 'stairs' })).not.toBeNull();
    expect(validateNewScore({ nickname: 'a', score: -1, mode: 'random' })).not.toBeNull();
    expect(validateNewScore({ nickname: 'a', score: 1.5, mode: 'random' })).not.toBeNull();
    expect(validateNewScore({ nickname: 'a', score: 1, mode: 'hard' as 'random' })).not.toBeNull();
  });
});

describe('createLeaderboard', () => {
  it('uses the local backend without Supabase variables', () => {
    expect(createLeaderboard({} as ImportMetaEnv).kind).toBe('local');
  });

  it('uses Supabase when both variables are set', () => {
    const env = { VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'key' } as ImportMetaEnv;
    expect(createLeaderboard(env).kind).toBe('supabase');
  });
});
