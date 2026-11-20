export type GameModeId = 'stairs' | 'random';

/**
 * Platform (cloud) types. The first seven come from the original game; Guard,
 * Fog and Storm were added in the rewrite.
 */
export type PlatformType =
  | 'Normal'
  | 'Double'
  | 'ExtraLife'
  | 'SlowTime'
  | 'Guard'
  | 'Reverse'
  | 'Shuffle'
  | 'Fog'
  | 'Storm'
  | 'Death';

/**
 * good: power-up; neutral: plain cloud; tricky: safe but harder to type;
 * hazard: hurts the witch (unless the Guard power-up absorbs it).
 */
export type PlatformCategory = 'good' | 'neutral' | 'tricky' | 'hazard';

export interface PlatformStyle {
  /** Text color of the word (the manual explains the colors). */
  textColor: string;
  category: PlatformCategory;
}

export const PLATFORM_STYLES: Record<PlatformType, PlatformStyle> = {
  Normal: { textColor: '#ffffff', category: 'neutral' },
  Double: { textColor: '#ffe600', category: 'good' },
  ExtraLife: { textColor: '#32cd32', category: 'good' },
  SlowTime: { textColor: '#00e5ff', category: 'good' },
  Guard: { textColor: '#ff9800', category: 'good' },
  Reverse: { textColor: '#ee82ee', category: 'tricky' },
  Shuffle: { textColor: '#fa8072', category: 'tricky' },
  Fog: { textColor: '#a6a6a6', category: 'tricky' },
  Storm: { textColor: '#5a3bff', category: 'hazard' },
  Death: { textColor: '#ff2a2a', category: 'hazard' },
};

export function isHazard(type: PlatformType): boolean {
  return PLATFORM_STYLES[type].category === 'hazard';
}

/** Spawn table: each entry is equally likely, so plain clouds stay the most common. */
export const PLATFORM_SPAWN_TABLE: readonly PlatformType[] = [
  'Double',
  'ExtraLife',
  'SlowTime',
  'Guard',
  'Reverse',
  'Shuffle',
  'Fog',
  'Storm',
  'Death',
  'Normal',
  'Normal',
  'Normal',
  'Normal',
  'Normal',
];

export interface WordPlatform {
  /** The text the player must type. */
  text: string;
  /** What the cloud shows, when different from `text` (Fog hides letters with "?"). */
  label?: string;
  type: PlatformType;
  /** Horizontal center, world units. */
  x: number;
  /** Top of the platform cloud (the word label sits right above it), world units. */
  y: number;
  /** Fall speed in world units per tick. */
  speed: number;
  /** Row ("degrau") the platform belongs to. Used by the Stairs mode. */
  row: number;
  typed: boolean;
}

export type GameStatus = 'ready' | 'playing' | 'paused' | 'over';

/** Snapshot of the game state for the React HUD (emitted only when it changes). */
export interface HudState {
  status: GameStatus;
  score: number;
  /** The player holds an extra life ("+1" cloud). */
  extraLife: boolean;
  /** Remaining fraction (0–1) of the slow-time power-up, 0 when inactive. */
  slowTime: number;
  /** The Guard power-up is waiting to absorb the next hazard. */
  guard: boolean;
  /** Remaining fraction (0–1) of the double points power-up, 0 when inactive. */
  double: number;
  /** What the player has typed so far. */
  typed: string;
  /** True when `typed` is a prefix of at least one word the player may type now. */
  typedMatches: boolean;
  /** Whole seconds left before the witch starts falling, or null when not waiting. */
  fallCountdown: number | null;
  /** True once the sky has turned into space. */
  inSpace: boolean;
}
