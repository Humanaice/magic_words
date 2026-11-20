/**
 * World constants. The game simulates in a fixed logical world (the size of the
 * original canvas, 515x492) at a fixed 60 ticks per second, exactly like the
 * original frame-based game. The world is then scaled to fit the screen.
 */
export const WORLD_WIDTH = 515;
export const WORLD_HEIGHT = 492;

/** Simulation rate. All durations below are in ticks (1 tick = 1/60 s). */
export const TICKS_PER_SECOND = 60;

/** Ticks the witch can stand still (start / after reviving) before she starts falling. */
export const IDLE_TICKS_BEFORE_FALL = 650;
/** A new background cloud appears every N ticks while in the sky. */
export const BG_CLOUD_INTERVAL = 350;
/** Score at which the sky fades into space. */
export const SPACE_SCORE = 500;

export const SLOW_TIME_TICKS = 600;
export const DOUBLE_POINTS_TICKS = 1400;
export const POINTS_PER_WORD = 10;

/** Initial platform speed (word fall speed is platSpeed / 10 px per tick). */
export const INITIAL_PLAT_SPEED = 5;
export const MAX_PLAT_SPEED = 10;
export const PLAT_SPEED_STEP = 0.05;
/** Fall speed of a Storm cloud after the witch lands on it (she must jump again fast). */
export const STORM_SPEED = 2.4;
/** Fraction of the letters a Fog cloud hides (never the first letter). */
export const FOG_HIDDEN_FRACTION = 0.34;
/** Platforms the player left behind (or rows skipped in Stairs) drop at this speed. */
export const DISCARDED_PLATFORM_SPEED = 10;
/** Starting value of the spawn cooldown, so the first row spawns right away. */
export const INITIAL_PLAT_COOLDOWN = 699;

/** Horizontal column centers where platforms can spawn, as a fraction of the width. */
export const COLUMN_CENTERS = [0.2, 0.5, 0.8] as const;

/** Sprite geometry (source sizes in the sprite sheets). */
export const WITCH_FRAME_W = 32;
export const WITCH_FRAME_H = 48;
export const WITCH_CHARGE_FRAME = 48;
export const WITCH_FRAMES = 5;
export const WITCH_DRAW_W = WITCH_FRAME_W * 2.5;
export const WITCH_DRAW_H = WITCH_FRAME_H * 2.5;
export const ANIMATION_TICKS_PER_FRAME = 5;

/** Platform cloud drawn under each word. */
export const PLATFORM_CLOUD_W = 84;
export const PLATFORM_CLOUD_H = 50;

/**
 * Tallest world allowed on portrait screens (the tower sprite is 952 units
 * tall and must still cover the screen at the start).
 */
export const MAX_WORLD_HEIGHT = 970;
