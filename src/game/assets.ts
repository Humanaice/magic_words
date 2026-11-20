import cloudBgUrl from '../assets/sprites/CloudBG.png';
import cloudPlatformUrl from '../assets/sprites/CloudSprite.png';
import groundUrl from '../assets/sprites/Ground.png';
import spaceBgUrl from '../assets/sprites/SpaceBg.png';
import witchIdleUrl from '../assets/sprites/SpriteWitchIdle.png';
import witchChargeUrl from '../assets/sprites/SpriteWitchCharge.png';
import towerUrl from '../assets/sprites/Tower.png';
import puffUrl from '../assets/sprites/puff_5.png';
import { TITLE_FONT_FAMILY, WORD_FONT_FAMILY } from './engine/text';

export interface GameAssets {
  cloudBg: HTMLImageElement;
  cloudPlatform: HTMLImageElement;
  ground: HTMLImageElement;
  spaceBg: HTMLImageElement;
  witchIdle: HTMLImageElement;
  witchCharge: HTMLImageElement;
  tower: HTMLImageElement;
  puff: HTMLImageElement;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image ${src}`));
    img.src = src;
  });
}

let cached: Promise<GameAssets> | null = null;

/** Loads every sprite (once) and waits for the canvas fonts. */
export function loadGameAssets(): Promise<GameAssets> {
  cached ??= (async () => {
    const [cloudBg, cloudPlatform, ground, spaceBg, witchIdle, witchCharge, tower, puff] = await Promise.all([
      loadImage(cloudBgUrl),
      loadImage(cloudPlatformUrl),
      loadImage(groundUrl),
      loadImage(spaceBgUrl),
      loadImage(witchIdleUrl),
      loadImage(witchChargeUrl),
      loadImage(towerUrl),
      loadImage(puffUrl),
      // Canvas text uses web fonts; measure only after they're ready.
      document.fonts.load(`700 24px ${WORD_FONT_FAMILY}`).catch(() => undefined),
      document.fonts.load(`400 24px ${TITLE_FONT_FAMILY}`).catch(() => undefined),
    ]);
    return { cloudBg, cloudPlatform, ground, spaceBg, witchIdle, witchCharge, tower, puff };
  })();
  cached.catch(() => {
    cached = null;
  });
  return cached;
}
