import type { GameAssets } from './assets';
import type { GameAudio } from './audio';
import {
  ANIMATION_TICKS_PER_FRAME,
  BG_CLOUD_INTERVAL,
  COLUMN_CENTERS,
  DISCARDED_PLATFORM_SPEED,
  DOUBLE_POINTS_TICKS,
  IDLE_TICKS_BEFORE_FALL,
  INITIAL_PLAT_SPEED,
  INITIAL_ROW_GAP,
  MAX_PLAT_SPEED,
  MIN_ROW_GAP,
  PLAT_SPEED_STEP,
  PLATFORM_CLOUD_H,
  PLATFORM_CLOUD_W,
  POINTS_PER_WORD,
  SLOW_TIME_TICKS,
  STORM_MAX_SPEED,
  STORM_MIN_SPEED,
  STORM_SPEED_MULT,
  FOG_HIDDEN_FRACTION,
  SPACE_SCORE,
  TICKS_PER_SECOND,
  WITCH_CHARGE_FRAME,
  WITCH_DRAW_H,
  WITCH_DRAW_W,
  WITCH_FRAME_H,
  WITCH_FRAME_W,
  WITCH_FRAMES,
  MAX_WORLD_HEIGHT,
  WORLD_HEIGHT,
  WORLD_WIDTH as W,
} from './config';
import { fitCanvas, type Viewport } from './engine/canvas';
import { FixedStepLoop } from './engine/loop';
import { drawOutlinedText, drawPanel, font } from './engine/text';
import type { GameModeRules } from './modes';
import { pick, randomInt } from './random';
import {
  PLATFORM_SPAWN_TABLE,
  PLATFORM_STYLES,
  isHazard,
  type PlatformType,
  type GameStatus,
  type HudState,
  type WordPlatform,
} from './types';
import { WORDS, fogWord, normalizeTyped, reverseWord, shuffleWord } from './words';

/**
 * Picks the types of one row (Stairs) or spawn set (Random). Guarantee: at
 * least one cloud is never a hazard, so the player always has a safe option.
 * If the dice roll only hazards, one of them (at random) becomes a plain cloud.
 */
export function rollRowTypes(count: number, rng: () => number = Math.random): PlatformType[] {
  const types = Array.from({ length: count }, () => pick(PLATFORM_SPAWN_TABLE, rng));
  if (types.length > 0 && types.every(isHazard)) types[randomInt(0, types.length, rng)] = 'Normal';
  return types;
}

/** Background cloud sprites inside CloudBG.png: [sx, sy, sw, sh]. */
const BG_CLOUD_SPRITES = [
  [0, 0, 70, 50],
  [70, 0, 70, 50],
  [0, 50, 60, 30],
  [60, 50, 60, 42],
  [0, 80, 60, 50],
  [60, 92, 60, 50],
] as const;

interface BgCloud {
  sprite: (typeof BG_CLOUD_SPRITES)[number];
  x: number;
  y: number;
  /** +1 moves right, -1 moves left. */
  side: 1 | -1;
}

/** Minimum gap between a word label and the canvas edge. */
const LABEL_MARGIN = 4;
/** Distance from the top of a platform cloud to the witch's feet. */
const FOOT_OFFSET = 26;
/*
 * Vertical positions are anchored to the bottom of the world (the world can be
 * taller than the original 492 units on portrait screens, see `resize`):
 */
/** Feet height when standing on the ground at the start, from the bottom. */
const GROUND_FOOT_FROM_BOTTOM = 55;
/** The witch dies when her feet pass this far below the bottom edge. */
const DEATH_BELOW_BOTTOM = 75;
/** Platforms are removed this far below the bottom edge. */
const REMOVE_BELOW_BOTTOM = 60;

export interface GameCallbacks {
  onHud(state: HudState): void;
  onGameOver(score: number): void;
}

/**
 * The game engine: simulation + canvas rendering in plain TypeScript.
 * React only mounts the canvas and listens to HUD snapshots; it never
 * re-renders per frame.
 *
 * The rules are a port of the original GameScript.js (Stairs/Random modes),
 * keeping the same constants, but measured in fixed ticks instead of frames.
 */
export class Game {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly loop: FixedStepLoop;
  private viewport: Viewport = { scale: 1, dpr: 1 };
  private rng: () => number = Math.random;
  private lastHud = '';
  /**
   * World height. At least the original 492; taller on portrait screens so the
   * game fills the phone instead of showing black bars.
   */
  private h = WORLD_HEIGHT;

  private status: GameStatus = 'ready';
  private tick = 0;
  private score = 0;
  private platforms: WordPlatform[] = [];
  private typed = '';
  /** The platform the witch jumped to last (lastTypedWord in the original). */
  private current: WordPlatform | null = null;

  // Sky / space background
  private sky = { r: 135, g: 206, b: 250 };
  private spaceOpacity = 0;
  private spaceY: [number, number] = [0, -WORLD_HEIGHT];
  private bgClouds: BgCloud[] = [];

  // Witch state (names follow the original variables where it helps)
  /** Still standing on the starting ground (the ground is still on screen). */
  private onStarterPosition = true;
  /** Standing on the revive cloud after losing the extra life. */
  private revived = false;
  /** Standing on a platform (is_playing in the original). */
  private standing = false;
  /** Ticks spent waiting on the ground / revive cloud (timer_to_go). */
  private idleTicks = 0;
  /** Grows while falling/climbing; moves the ground and revive cloud down. */
  private gravity = 1;
  /** Grows while falling/climbing; scrolls the tower down. */
  private downCount = 1;
  private witchX = W / 2;
  private witchFootY = WORLD_HEIGHT - GROUND_FOOT_FROM_BOTTOM;
  private animFrame = 0;
  private puffFrame = -1;

  // Rows ("degraus") for the Stairs mode
  private rowCounter = 0;
  private nextRow = 0;

  // Power-ups
  private extraLife = false;
  private slowTimeTicks = 0;
  /** Guard power-up: absorbs the next hazard cloud. */
  private guard = false;
  private doubleTicks = 0;

  // Platform spawning
  private platSpeed = INITIAL_PLAT_SPEED;
  /** Vertical distance the latest spawned row has fallen (world units). */
  private distSinceLastSpawn = Infinity;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly assets: GameAssets,
    private readonly mode: GameModeRules,
    private readonly audio: GameAudio,
    private readonly callbacks: GameCallbacks,
  ) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D is not supported');
    this.ctx = ctx;
    this.loop = new FixedStepLoop(TICKS_PER_SECOND, this.update, this.render);
    this.reset();
    this.loop.start();
  }

  // ---------------------------------------------------------------- public API

  /** (Re)starts a run. */
  start(): void {
    this.reset();
    this.status = 'playing';
    this.loop.resetClock();
    this.audio.playMusic();
    this.emitHud();
  }

  pause(): void {
    if (this.status !== 'playing') return;
    this.status = 'paused';
    this.audio.pauseMusic();
    this.emitHud();
  }

  resume(): void {
    if (this.status !== 'paused') return;
    this.status = 'playing';
    this.loop.resetClock();
    this.audio.playMusic();
    this.emitHud();
  }

  togglePause(): void {
    if (this.status === 'playing') this.pause();
    else if (this.status === 'paused') this.resume();
  }

  getStatus(): GameStatus {
    return this.status;
  }

  /**
   * Sets what the player has typed so far (the whole buffer, not a single key,
   * so it works with mobile keyboards, autocomplete and paste).
   * Returns true when the text completed a word and the buffer was consumed.
   */
  setTyped(raw: string): boolean {
    if (this.status !== 'playing') return false;
    this.typed = normalizeTyped(raw);
    const consumed = this.tryCompleteWord();
    this.emitHud();
    return consumed;
  }

  /** Fits the canvas into the available CSS box (call on every resize). */
  resize(availableW: number, availableH: number): void {
    // Fill the available height (portrait phones) up to the tower's height.
    const wanted = availableW > 0 ? (W * availableH) / availableW : WORLD_HEIGHT;
    const newH = Math.round(Math.min(MAX_WORLD_HEIGHT, Math.max(WORLD_HEIGHT, wanted)));
    if (newH !== this.h) this.setWorldHeight(newH);
    this.viewport = fitCanvas(this.canvas, availableW, availableH, W, this.h);
    this.render();
  }

  /**
   * Changes the world height (e.g. the on-screen keyboard opened or closed).
   * Clouds keep their relative position on screen, so the witch and the words
   * she is about to type stay visible; the ground and tower stay at the bottom.
   */
  private setWorldHeight(newH: number): void {
    const ratio = newH / this.h;
    this.h = newH;
    for (const p of this.platforms) p.y *= ratio;
    for (const c of this.bgClouds) c.y *= ratio;
    if (Number.isFinite(this.distSinceLastSpawn)) this.distSinceLastSpawn *= ratio;
    if (this.standing && this.current) this.witchFootY = this.current.y + FOOT_OFFSET;
    else this.witchFootY = this.groundFootY + this.gravity / 3;
    this.spaceY = [0, -newH];
  }

  private get groundFootY(): number {
    return this.h - GROUND_FOOT_FROM_BOTTOM;
  }

  /** For tests/debugging: deterministic random numbers. */
  setRandom(rng: () => number): void {
    this.rng = rng;
  }

  destroy(): void {
    this.loop.stop();
    this.audio.stopMusic();
  }

  // ---------------------------------------------------------------- state

  private reset(): void {
    this.tick = 0;
    this.score = 0;
    this.platforms = [];
    this.typed = '';
    this.current = null;
    this.sky = { r: 135, g: 206, b: 250 };
    this.spaceOpacity = 0;
    this.spaceY = [0, -this.h];
    this.bgClouds = [];
    this.onStarterPosition = true;
    this.revived = false;
    this.standing = false;
    this.idleTicks = 0;
    this.gravity = 1;
    this.downCount = 1;
    this.witchX = W / 2;
    this.witchFootY = this.groundFootY;
    this.animFrame = 0;
    this.puffFrame = -1;
    this.rowCounter = 0;
    this.nextRow = 0;
    this.extraLife = false;
    this.slowTimeTicks = 0;
    this.guard = false;
    this.doubleTicks = 0;
    this.platSpeed = INITIAL_PLAT_SPEED;
    this.distSinceLastSpawn = Infinity;
  }

  private get canTypeAnyRow(): boolean {
    return this.onStarterPosition || this.revived;
  }

  private canType(platform: WordPlatform): boolean {
    return (
      !platform.typed &&
      platform.speed < DISCARDED_PLATFORM_SPEED &&
      this.mode.canType(platform, this.nextRow, this.canTypeAnyRow)
    );
  }

  private tryCompleteWord(): boolean {
    if (!this.typed) return false;
    const target = this.platforms.find((p) => p.text === this.typed && this.canType(p));
    if (!target) return false;

    this.score += POINTS_PER_WORD * (this.doubleTicks > 0 ? 2 : 1);
    this.typed = '';
    target.typed = true;
    // The platform left behind drops away quickly.
    if (this.current) this.current.speed = DISCARDED_PLATFORM_SPEED;
    // Stairs: immediately discard the other clouds of this row so they can't
    // clutter or be matched while falling away.
    if (this.mode.discardRowSiblings) {
      for (const p of this.platforms) {
        if (p.row === target.row && !p.typed) p.speed = DISCARDED_PLATFORM_SPEED;
      }
    }
    this.current = target;
    this.standing = true;
    this.puffFrame = 0;
    this.audio.playMagic();

    let type = target.type;
    if (isHazard(type) && this.guard) {
      // The Guard power-up absorbs the hazard: this cloud becomes a plain one.
      this.guard = false;
      type = 'Normal';
    }

    switch (type) {
      case 'ExtraLife':
        this.extraLife = true;
        break;
      case 'Double':
        this.doubleTicks = DOUBLE_POINTS_TICKS;
        break;
      case 'SlowTime':
        this.slowTimeTicks = SLOW_TIME_TICKS;
        break;
      case 'Guard':
        this.guard = true;
        break;
      case 'Storm':
        // Accelerate the fall moderately: creates urgency while keeping time to type.
        target.speed = Math.min(STORM_MAX_SPEED, Math.max(STORM_MIN_SPEED, target.speed * STORM_SPEED_MULT));
        break;
      case 'Death':
        if (this.extraLife) {
          this.revive();
        } else {
          this.endGame();
          return true;
        }
        break;
      default:
        break;
    }
    this.nextRow = target.row + 1;

    if (type === 'Storm') {
      // Guarantee there is a reachable cloud to type right away so a Storm
      // cloud never leaves the player falling with nothing on screen.
      const hasReachableCloud = this.platforms.some(
        (p) =>
          !p.typed &&
          p.speed < DISCARDED_PLATFORM_SPEED &&
          p.y < this.h - 110 &&
          this.mode.canType(p, this.nextRow, false),
      );
      if (!hasReachableCloud) {
        this.spawnRow();
        this.distSinceLastSpawn = 0;
      }
    }
    return true;
  }

  /** Uses the extra life: back to the bottom on a fresh cloud, any word allowed. */
  private revive(): void {
    this.standing = false;
    this.revived = true;
    this.gravity = 1;
    this.idleTicks = 0;
    this.extraLife = false;
  }

  private endGame(): void {
    this.status = 'over';
    this.typed = '';
    this.audio.stopMusic();
    this.emitHud();
    this.callbacks.onGameOver(this.score);
  }

  // ---------------------------------------------------------------- update

  private update = (): void => {
    if (this.status === 'playing') {
      this.updateBackground();
      this.updatePlatforms();
      this.updatePowerUps();
      this.updateWitch();
      this.tick++;
      this.emitHud();
    } else if (this.status === 'over') {
      // Like gameOverStep: the sky keeps moving behind the game over screen.
      this.updateBackground();
      this.tick++;
    }
  };

  private updateBackground(): void {
    if (this.score >= SPACE_SCORE) {
      // Reaching space: the blue sky slowly fades to black.
      this.sky.r = Math.max(0, this.sky.r - 1);
      this.sky.g = Math.max(0, this.sky.g - 1);
      this.sky.b = Math.max(0, this.sky.b - 1);
    } else if (this.tick % BG_CLOUD_INTERVAL === 0 && !this.onStarterPosition) {
      const fromLeft = this.rng() < 0.5;
      this.bgClouds.push({
        sprite: BG_CLOUD_SPRITES[randomInt(0, 5, this.rng)],
        x: fromLeft ? -256 : W,
        y: 0,
        side: fromLeft ? 1 : -1,
      });
    }

    if (this.sky.r === 0 && this.sky.g === 0 && this.sky.b === 0) {
      this.spaceOpacity = Math.min(1, this.spaceOpacity + 0.01);
      for (let i = 0; i < 2; i++) {
        this.spaceY[i] = this.spaceY[i] >= this.h ? -this.h : this.spaceY[i] + 1 / 5;
      }
    }

    for (const cloud of this.bgClouds) {
      cloud.x += 0.5 * cloud.side;
      cloud.y += randomInt(1, 10, this.rng) / 10;
    }
    this.bgClouds = this.bgClouds.filter((c) => c.y < this.h + 60 && c.x < W + 300 && c.x > -300);
  }

  /** Target vertical separation between consecutive rows (shrinks smoothly with speed). */
  private currentRowGap(): number {
    const span = MAX_PLAT_SPEED - INITIAL_PLAT_SPEED;
    const t = span > 0 ? Math.min(1, Math.max(0, (this.platSpeed - INITIAL_PLAT_SPEED) / span)) : 1;
    return INITIAL_ROW_GAP + (MIN_ROW_GAP - INITIAL_ROW_GAP) * t;
  }

  private updatePlatforms(): void {
    const speedMult = this.slowTimeTicks > 0 ? 0.5 : 1;
    if (this.distSinceLastSpawn >= this.currentRowGap()) {
      this.spawnRow();
      this.distSinceLastSpawn = 0;
    }

    const current = this.current;
    for (const p of this.platforms) {
      p.y += p.speed * speedMult;
      // Stairs: once a cloud of a row is chosen, the others fall away.
      if (this.mode.discardRowSiblings && current && current.row === p.row && !p.typed) {
        p.speed = DISCARDED_PLATFORM_SPEED;
      }
    }
    this.distSinceLastSpawn += (this.platSpeed / 10) * speedMult;
    this.platforms = this.platforms.filter((p) => p.y <= this.h + REMOVE_BELOW_BOTTOM);
  }

  private spawnRow(): void {
    const count = this.mode.rowSize(this.rng);
    const types = rollRowTypes(count, this.rng);
    const rowSpeed = this.platSpeed / 10;
    // Same as the original: start at column 0 or 1, then cycle through the three.
    let column = randomInt(0, 2, this.rng);
    for (const type of types) {
      let text = pick(WORDS, this.rng);
      let label: string | undefined;
      if (type === 'Reverse') text = reverseWord(text);
      else if (type === 'Shuffle') text = shuffleWord(text, this.rng);
      else if (type === 'Fog') label = fogWord(text, FOG_HIDDEN_FRACTION, this.rng);

      this.platforms.push({
        text,
        label,
        type,
        x: COLUMN_CENTERS[column] * W,
        y: 0,
        speed: rowSpeed,
        row: this.rowCounter,
        typed: false,
      });
      column = (column + 1) % COLUMN_CENTERS.length;
    }
    // Each new cloud makes the game a bit faster, keeping all clouds in a row level.
    this.platSpeed = Math.min(MAX_PLAT_SPEED, this.platSpeed + PLAT_SPEED_STEP * count);
    this.rowCounter++;
  }

  private updatePowerUps(): void {
    if (this.slowTimeTicks > 0) this.slowTimeTicks--;
    if (this.doubleTicks > 0) this.doubleTicks--;
  }

  private updateWitch(): void {
    if (this.tick % ANIMATION_TICKS_PER_FRAME === 0) {
      this.animFrame = (this.animFrame + 1) % WITCH_FRAMES;
      if (this.puffFrame >= 0) {
        this.puffFrame++;
        if (this.puffFrame >= 5) this.puffFrame = -1;
      }
    }

    if (this.standing && this.current) {
      this.witchX = this.current.x;
      this.witchFootY = this.current.y + FOOT_OFFSET;
    } else {
      this.idleTicks++;
      this.witchX = W / 2;
      this.witchFootY = this.groundFootY + this.gravity / 3;
    }

    if (this.idleTicks >= IDLE_TICKS_BEFORE_FALL || this.standing) {
      // The world scrolls: ground / revive cloud fall away (taking an idle witch with them).
      this.gravity++;
      this.downCount++;
      const supportVisible = this.groundTop() < this.h + 10;
      if (!(supportVisible && (this.onStarterPosition || this.revived))) {
        this.onStarterPosition = false;
        this.revived = false;
      }
    } else {
      this.gravity = 1;
    }

    if (this.witchFootY > this.h + DEATH_BELOW_BOTTOM) {
      if (this.extraLife) this.revive();
      else this.endGame();
    }
  }

  private groundTop(): number {
    return this.h - 90 + this.gravity / 3;
  }

  // ---------------------------------------------------------------- render

  private wordFontSize(): number {
    // At least ~19 CSS px on small phones, never so big that rows overlap.
    return Math.min(30, Math.max(22, 19 / this.viewport.scale));
  }

  private render = (): void => {
    const { ctx } = this;
    const k = this.viewport.scale * this.viewport.dpr;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.imageSmoothingEnabled = false;

    this.drawBackground();
    if (this.status !== 'over') {
      this.drawPlatformClouds();
      this.drawWitch();
    }
    this.drawSupport();
    if (this.status !== 'over') {
      this.drawPlatformLabels();
    }
  };

  private drawBackground(): void {
    const { ctx, assets } = this;
    ctx.fillStyle = `rgb(${this.sky.r}, ${this.sky.g}, ${this.sky.b})`;
    ctx.fillRect(0, 0, W, this.h);

    if (this.spaceOpacity > 0) {
      ctx.globalAlpha = this.spaceOpacity;
      for (const y of this.spaceY) ctx.drawImage(assets.spaceBg, 0, 0, W, this.h, 0, y, W, this.h);
      ctx.globalAlpha = 1;
    }

    for (const c of this.bgClouds) {
      const [sx, sy, sw, sh] = c.sprite;
      ctx.drawImage(assets.cloudBg, sx, sy, sw, sh, c.x, c.y - 128, 256, 128);
    }

    this.drawTower();
  }

  /**
   * The tower (128x476 sprite drawn at 2x), scrolling down as the witch climbs.
   * Its base sits on the ground and its top starts 482 units above the screen,
   * like in the original 492-unit-tall canvas, so the top shows up after the
   * same climbing time. On taller (portrait) worlds the body is stretched by
   * repeating a middle slice of the sprite.
   */
  private drawTower(): void {
    const { ctx, assets } = this;
    const scroll = this.downCount / 3;
    const x = W / 2 - 128;
    const spriteTop = this.h - 22 - 952 + scroll;
    const towerTop = -(WORLD_HEIGHT - 10) + scroll;
    if (towerTop >= this.h) return;

    if (spriteTop <= towerTop) {
      ctx.drawImage(assets.tower, 0, 0, 128, 476, x, spriteTop, 256, 952);
      return;
    }

    // Taller world: battlements + flag (source rows 0-124) at the top, the
    // lower body and base (rows 124-476) on the ground, and slices of the
    // straight body (rows 124-304) in between.
    const capRows = 124;
    const capH = capRows * 2;
    const baseTop = spriteTop + capH;
    if (baseTop < this.h) ctx.drawImage(assets.tower, 0, capRows, 128, 476 - capRows, x, baseTop, 256, 952 - capH);
    const sliceH = 360;
    for (let y = towerTop + capH; y < baseTop; y += sliceH) {
      const h = Math.min(sliceH, baseTop - y);
      if (y + h > 0 && y < this.h) ctx.drawImage(assets.tower, 0, capRows, 128, h / 2, x, y, 256, h);
    }
    if (towerTop + capH > 0) ctx.drawImage(assets.tower, 0, 0, 128, capRows, x, towerTop, 256, capH);
  }

  private drawPlatformClouds(): void {
    const { ctx, assets } = this;
    for (const p of this.platforms) {
      ctx.drawImage(
        assets.cloudPlatform,
        0,
        0,
        221,
        93,
        p.x - PLATFORM_CLOUD_W / 2,
        p.y,
        PLATFORM_CLOUD_W,
        PLATFORM_CLOUD_H,
      );
    }
  }

  /**
   * Draws word pills in a separate pass above all cloud sprites and the witch,
   * ordered dimmed -> typeable -> matched so upper clouds never hide lower words.
   */
  private drawPlatformLabels(): void {
    const { ctx } = this;
    const baseSize = this.wordFontSize();
    const maxBoxW = W / COLUMN_CENTERS.length - 8;

    const visible = this.platforms.filter((p) => !p.typed && p.speed < DISCARDED_PLATFORM_SPEED);
    const items = visible.map((p) => {
      const typeable = this.canType(p);
      const matched = typeable && this.typed !== '' && p.text.startsWith(this.typed);
      const priority = matched ? 2 : typeable ? 1 : 0;
      return { p, typeable, matched, priority };
    });
    items.sort((a, b) => a.priority - b.priority);

    for (const { p, typeable, matched } of items) {
      // Fog clouds show "?" for some letters; typing the right letters reveals them.
      const shown = p.label ? (matched ? this.typed + p.label.slice(this.typed.length) : p.label) : p.text;

      let size = baseSize;
      let wordFont = font(size);
      ctx.font = wordFont;
      let padX = size * 0.55;
      let textW = ctx.measureText(shown).width;
      let boxW = textW + padX * 2;
      if (boxW > maxBoxW) {
        size = Math.max(15, Math.floor(baseSize * (maxBoxW / boxW)));
        wordFont = font(size);
        ctx.font = wordFont;
        padX = size * 0.5;
        textW = ctx.measureText(shown).width;
        boxW = textW + padX * 2;
      }

      const boxH = size * 1.45;
      const outline = Math.max(3, size * 0.22);
      const boxX = Math.min(Math.max(p.x - boxW / 2, 3), W - 3 - boxW);
      // The label normally sits on top of its cloud, clamped inside the canvas
      // so a word is always fully readable at the top and bottom edges.
      const naturalY = p.y + 6 - boxH;
      const boxY = Math.min(Math.max(naturalY, LABEL_MARGIN), this.h - LABEL_MARGIN - boxH);
      const midY = boxY + boxH / 2 + size * 0.04;
      const textX = boxX + padX;

      ctx.globalAlpha = typeable ? 1 : 0.45;
      drawPanel(ctx, boxX, boxY, boxW, boxH, {
        fill: '#ffffff',
        stroke: '#000000',
        lineWidth: 3,
        radius: boxH / 2,
      });

      if (matched) {
        const prefixW = ctx.measureText(this.typed).width;
        ctx.fillStyle = '#1b7f3b';
        ctx.beginPath();
        ctx.roundRect(textX - 3, boxY + 4, prefixW + 6, boxH - 8, 6);
        ctx.fill();
      }

      drawOutlinedText(ctx, shown, textX, midY, {
        font: wordFont,
        fill: PLATFORM_STYLES[p.type].textColor,
        lineWidth: outline,
        align: 'left',
      });
      if (matched) {
        drawOutlinedText(ctx, this.typed, textX, midY, {
          font: wordFont,
          fill: '#ffffff',
          lineWidth: outline,
          align: 'left',
        });
      }
      ctx.globalAlpha = 1;
    }
  }

  private drawWitch(): void {
    const { ctx, assets } = this;
    const casting = this.typed !== '' && this.status === 'playing';
    const left = this.witchX - WITCH_DRAW_W / 2;
    const top = this.witchFootY - WITCH_DRAW_H;
    if (casting) {
      // The charge sheet has square 48x48 frames: draw it wider so it isn't squashed.
      ctx.drawImage(
        assets.witchCharge,
        0,
        this.animFrame * WITCH_CHARGE_FRAME,
        WITCH_CHARGE_FRAME,
        WITCH_CHARGE_FRAME,
        left - 20,
        top - 5,
        WITCH_DRAW_W * 1.5,
        WITCH_DRAW_H,
      );
    } else {
      ctx.drawImage(
        assets.witchIdle,
        0,
        this.animFrame * WITCH_FRAME_H,
        WITCH_FRAME_W,
        WITCH_FRAME_H,
        left,
        top,
        WITCH_DRAW_W,
        WITCH_DRAW_H,
      );
    }
    if (this.puffFrame >= 0) {
      ctx.drawImage(assets.puff, this.puffFrame * 32, 0, 32, 32, this.witchX - 64, this.witchFootY - 125, 128, 128);
    }
  }

  /** The starting ground or the revive cloud (drawn over the witch's feet, like the original). */
  private drawSupport(): void {
    const { ctx, assets } = this;
    const top = this.groundTop();
    if (top >= this.h + 10) return;
    if (this.onStarterPosition) {
      ctx.drawImage(assets.ground, 0, 0, 600, 90, -20, top, W + 80, 90);
    } else if (this.revived && this.status !== 'over') {
      const cloudTop = this.groundFootY + this.gravity / 3 - FOOT_OFFSET;
      ctx.drawImage(
        assets.cloudPlatform,
        0,
        0,
        221,
        93,
        W / 2 - PLATFORM_CLOUD_W / 2,
        cloudTop,
        PLATFORM_CLOUD_W,
        PLATFORM_CLOUD_H,
      );
    }
  }

  // ---------------------------------------------------------------- HUD

  private emitHud(): void {
    const waiting = this.status === 'playing' && !this.standing;
    const typedMatches =
      this.typed === '' || this.platforms.some((p) => this.canType(p) && p.text.startsWith(this.typed));
    const state: HudState = {
      status: this.status,
      score: this.score,
      extraLife: this.extraLife,
      slowTime: Math.ceil((this.slowTimeTicks / SLOW_TIME_TICKS) * 40) / 40,
      guard: this.guard,
      double: Math.ceil((this.doubleTicks / DOUBLE_POINTS_TICKS) * 40) / 40,
      typed: this.typed,
      typedMatches,
      fallCountdown: waiting
        ? Math.max(0, Math.ceil((IDLE_TICKS_BEFORE_FALL - this.idleTicks) / TICKS_PER_SECOND))
        : null,
      inSpace: this.score >= SPACE_SCORE,
    };
    const key = JSON.stringify(state);
    if (key === this.lastHud) return;
    this.lastHud = key;
    this.callbacks.onHud(state);
  }
}
