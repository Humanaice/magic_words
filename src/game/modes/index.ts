import { randomInt } from '../random';
import type { GameModeId, WordPlatform } from '../types';

/**
 * What differs between the two game modes. Everything else (physics, power-ups,
 * scoring) is shared by the engine.
 */
export interface GameModeRules {
  id: GameModeId;
  /** Display name (kept in English like the original buttons). */
  name: string;
  /** Short explanation shown on the start screen. */
  description: string;
  /** How many platforms are created in one row. */
  rowSize(rng: () => number): number;
  /**
   * Whether the player may type this platform now. `nextRow` is the row right
   * above the one the player stands on; `free` is true while standing on the
   * ground or on the revive cloud (any word is allowed then).
   */
  canType(platform: WordPlatform, nextRow: number, free: boolean): boolean;
  /** Stairs: when a platform is chosen, the other clouds of its row fall away. */
  discardRowSiblings: boolean;
}

/** Stairs: always three clouds per row; the player picks one per row ("degrau"). */
export const stairsMode: GameModeRules = {
  id: 'stairs',
  name: 'Stairs',
  description: 'Sempre três nuvens por degrau: escolha só uma e suba degrau por degrau.',
  rowSize: () => 3,
  canType: (platform, nextRow, free) => free || platform.row === nextRow,
  discardRowSiblings: true,
};

/** Random: one to three clouds per row; any cloud can be typed at any time. */
export const randomMode: GameModeRules = {
  id: 'random',
  name: 'Random',
  description: 'De uma a três nuvens por vez, e você pode pular em qualquer uma delas.',
  rowSize: (rng) => randomInt(1, 4, rng),
  canType: () => true,
  discardRowSiblings: false,
};

export const GAME_MODES: Record<GameModeId, GameModeRules> = {
  stairs: stairsMode,
  random: randomMode,
};

export function isGameModeId(value: string): value is GameModeId {
  return value === 'stairs' || value === 'random';
}
