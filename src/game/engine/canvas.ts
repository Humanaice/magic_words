export interface Viewport {
  /** CSS pixels per world unit. */
  scale: number;
  /** Device pixels per CSS pixel. */
  dpr: number;
}

/**
 * Sizes a canvas so the world (worldW x worldH) fits inside the available CSS
 * box while keeping its aspect ratio, and backs it with devicePixelRatio
 * pixels so text and sprites stay crisp on high-density screens.
 */
export function fitCanvas(
  canvas: HTMLCanvasElement,
  availableW: number,
  availableH: number,
  worldW: number,
  worldH: number,
): Viewport {
  const scale = Math.max(0.1, Math.min(availableW / worldW, availableH / worldH));
  const cssW = Math.floor(worldW * scale);
  const cssH = Math.floor(worldH * scale);
  // Cap the backing store so huge 4K screens don't allocate giant canvases.
  const dpr = Math.min(window.devicePixelRatio || 1, 3);

  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  const pixelW = Math.round(cssW * dpr);
  const pixelH = Math.round(cssH * dpr);
  if (canvas.width !== pixelW) canvas.width = pixelW;
  if (canvas.height !== pixelH) canvas.height = pixelH;

  return { scale: cssW / worldW, dpr };
}
