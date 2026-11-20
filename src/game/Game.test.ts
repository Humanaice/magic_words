import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameAssets } from './assets';
import type { GameAudio } from './audio';
import { Game, rollRowTypes } from './Game';
import { randomMode, stairsMode, type GameModeRules } from './modes';
import { PLATFORM_SPAWN_TABLE, isHazard, type HudState, type WordPlatform } from './types';
import { fogWord } from './words';

/** Small deterministic PRNG so the spawn tests are reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Word label rectangles drawn by the last render: [x, y, w, h]. */
let labels: number[][] = [];

/** A 2D context where every method is a no-op, except it records label boxes. */
function fakeCanvas(): HTMLCanvasElement {
  const ctx = new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === 'measureText') return (text: string) => ({ width: text.length * 10 });
        if (prop === 'roundRect') return (...args: number[]) => labels.push(args.slice(0, 4));
        return () => {};
      },
      set: () => true,
    },
  );
  return { getContext: () => ctx, style: {}, width: 0, height: 0 } as unknown as HTMLCanvasElement;
}

const audio = { playMusic() {}, pauseMusic() {}, stopMusic() {}, playMagic() {} } as unknown as GameAudio;

interface GameInternals {
  update(): void;
  spawnRow(): void;
  updatePlatforms(): void;
  platCooldown: number;
  render(): void;
  h: number;
  platforms: WordPlatform[];
}

function setup(mode: GameModeRules) {
  let hud: HudState | null = null;
  const onGameOver = vi.fn();
  const game = new Game(fakeCanvas(), {} as GameAssets, mode, audio, {
    onHud: (h) => (hud = h),
    onGameOver,
  });
  game.start();
  const internals = game as unknown as GameInternals;
  return { game, internals, onGameOver, hud: () => hud! };
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('window', { devicePixelRatio: 1 });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Game rules', () => {
  it('spawns a row of three clouds right away in Stairs', () => {
    const { internals } = setup(stairsMode);
    internals.update();
    expect(internals.platforms).toHaveLength(3);
    expect(new Set(internals.platforms.map((p) => p.row))).toEqual(new Set([0]));
  });

  it('scores 10 points when a word is typed and clears the buffer', () => {
    const { game, internals, hud } = setup(randomMode);
    internals.update();
    const target = internals.platforms[0];
    target.type = 'Normal';
    expect(game.setTyped(target.text.slice(0, 2))).toBe(false);
    expect(hud().typed).toBe(target.text.slice(0, 2));
    expect(hud().typedMatches).toBe(true);
    expect(game.setTyped(target.text)).toBe(true);
    expect(hud().score).toBe(10);
    expect(hud().typed).toBe('');
    expect(target.typed).toBe(true);
  });

  it('flags text that does not match any cloud', () => {
    const { game, internals, hud } = setup(randomMode);
    internals.update();
    game.setTyped('qqqq');
    expect(hud().typedMatches).toBe(false);
  });

  it('doubles points with the yellow cloud', () => {
    const { game, internals, hud } = setup(randomMode);
    internals.update();
    internals.platforms.forEach((p, i) => {
      p.type = i === 0 ? 'Double' : 'Normal';
      p.text = `palavra${'abc'[i]}`;
    });
    game.setTyped('palavraa');
    expect(hud().double).toBeGreaterThan(0);
    // Make another typeable cloud and type it.
    internals.platforms.push({ ...internals.platforms[0], text: 'outra', typed: false, type: 'Normal' });
    game.setTyped('outra');
    expect(hud().score).toBe(10 + 20);
  });

  it('ends the game on a red cloud without an extra life', () => {
    const { game, internals, onGameOver, hud } = setup(randomMode);
    internals.update();
    const target = internals.platforms[0];
    target.type = 'Death';
    game.setTyped(target.text);
    expect(hud().status).toBe('over');
    expect(onGameOver).toHaveBeenCalledWith(10);
  });

  it('uses the extra life instead of dying', () => {
    const { game, internals, hud } = setup(randomMode);
    internals.update();
    internals.platforms.forEach((p, i) => {
      p.type = i === 0 ? 'ExtraLife' : 'Death';
      p.text = `palavra${'abc'[i]}`;
    });
    game.setTyped('palavraa');
    expect(hud().extraLife).toBe(true);
    internals.platforms.push({ ...internals.platforms[0], text: 'morte', typed: false, type: 'Death' });
    game.setTyped('morte');
    expect(hud().status).toBe('playing');
    expect(hud().extraLife).toBe(false);
  });

  it('Stairs only allows the next row once off the starting ground', () => {
    const { game, internals } = setup(stairsMode);
    const state = game as unknown as { onStarterPosition: boolean; nextRow: number };
    internals.update();
    state.onStarterPosition = false;
    state.nextRow = 1;
    const target = internals.platforms[0];
    target.type = 'Normal';
    expect(game.setTyped(target.text)).toBe(false);
    state.nextRow = 0;
    expect(game.setTyped(target.text)).toBe(true);
  });

  it('keeps every word label fully inside the canvas', () => {
    const { internals } = setup(randomMode);
    internals.update();
    const [first] = internals.platforms;
    // A row that just spawned at the top edge and a cloud leaving through the bottom.
    first.y = 0;
    internals.platforms.push({ ...first, y: internals.h + 40, typed: false });
    labels = [];
    internals.render();
    const boxes = labels.filter(([, , w]) => w > 40); // label panels (not the typed-prefix highlight)
    expect(boxes.length).toBeGreaterThanOrEqual(2);
    for (const [, y, , h] of boxes) {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y + h).toBeLessThanOrEqual(internals.h);
    }
  });

  it('the witch falls and the game ends if no word is typed', () => {
    const { internals, onGameOver } = setup(randomMode);
    for (let i = 0; i < 2000 && onGameOver.mock.calls.length === 0; i++) internals.update();
    expect(onGameOver).toHaveBeenCalledWith(0);
  });
});

describe('cloud types', () => {
  it('the Guard absorbs a red cloud', () => {
    const { game, internals, hud } = setup(randomMode);
    internals.update();
    internals.platforms.forEach((p, i) => {
      p.type = i === 0 ? 'Guard' : 'Normal';
      p.text = `palavra${'abc'[i]}`;
    });
    game.setTyped('palavraa');
    expect(hud().guard).toBe(true);
    internals.platforms.push({ ...internals.platforms[0], text: 'morte', typed: false, type: 'Death' });
    game.setTyped('morte');
    expect(hud().status).toBe('playing');
    expect(hud().guard).toBe(false);
  });

  it('a Storm cloud plunges after landing on it', () => {
    const { game, internals } = setup(randomMode);
    internals.update();
    const target = internals.platforms[0];
    target.type = 'Storm';
    const before = target.speed;
    game.setTyped(target.text);
    expect(target.speed).toBeGreaterThan(before * 2);
  });

  it('Fog hides letters but the real word is typed', () => {
    const label = fogWord('elefante', 0.34, mulberry32(1));
    expect(label).toHaveLength(8);
    expect(label[0]).toBe('e');
    expect(label).toContain('?');
    const { game, internals, hud } = setup(randomMode);
    internals.update();
    const target = internals.platforms[0];
    Object.assign(target, { type: 'Fog', text: 'elefante', label });
    expect(game.setTyped('elefante')).toBe(true);
    expect(hud().score).toBe(10);
  });
});

describe('there is always a safe cloud to jump on', () => {
  it('rollRowTypes replaces an all-hazard roll', () => {
    const deathIndex = PLATFORM_SPAWN_TABLE.indexOf('Death');
    // An RNG that always lands on "Death" in the spawn table.
    const allDeath = () => (deathIndex + 0.5) / PLATFORM_SPAWN_TABLE.length;
    for (const count of [1, 2, 3]) {
      const types = rollRowTypes(count, allDeath);
      expect(types).toHaveLength(count);
      expect(types.some((t) => !isHazard(t))).toBe(true);
    }
  });

  it('rollRowTypes never returns only hazards (many seeded rolls)', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 20000; i++) {
      const types = rollRowTypes(1 + (i % 3), rng);
      expect(types.some((t) => !isHazard(t))).toBe(true);
    }
  });

  for (const mode of [stairsMode, randomMode]) {
    it(`${mode.name}: every spawned row has a non-hazard cloud (5000 rows)`, () => {
      const { game, internals } = setup(mode);
      game.setRandom(mulberry32(7));
      internals.platforms.length = 0;
      for (let i = 0; i < 5000; i++) internals.spawnRow();
      const rows = new Map<number, WordPlatform[]>();
      for (const p of internals.platforms) rows.set(p.row, [...(rows.get(p.row) ?? []), p]);
      expect(rows.size).toBe(5000);
      for (const clouds of rows.values()) {
        if (mode.id === 'stairs') expect(clouds).toHaveLength(3);
        else expect(clouds.length).toBeGreaterThanOrEqual(1);
        expect(clouds.some((p) => !isHazard(p.type))).toBe(true);
      }
    });
  }

  it('Random: clouds on screen always include a non-hazard', () => {
    const { game, internals } = setup(randomMode);
    game.setRandom(mulberry32(99));
    let checked = 0;
    for (let tick = 0; tick < 60 * 60 * 10; tick++) {
      internals.updatePlatforms();
      internals.platCooldown++;
      const visible = internals.platforms.filter((p) => !p.typed && p.y >= 0 && p.y <= internals.h);
      if (visible.length === 0) continue;
      checked++;
      expect(visible.some((p) => !isHazard(p.type))).toBe(true);
    }
    expect(checked).toBeGreaterThan(1000);
  });
});
