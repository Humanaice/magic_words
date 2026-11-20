/** Canvas text helpers focused on legibility over any background. */

export const WORD_FONT_FAMILY = '"Blinker", "Trebuchet MS", sans-serif';
export const TITLE_FONT_FAMILY = '"Fugaz One", "Trebuchet MS", sans-serif';

export function font(sizePx: number, family = WORD_FONT_FAMILY, weight = 700): string {
  return `${weight} ${sizePx}px ${family}`;
}

/**
 * Text with a thick dark outline under a solid fill: readable on light sky,
 * the purple tower and the black space background alike.
 */
export function drawOutlinedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: { font: string; fill: string; stroke?: string; lineWidth: number; align?: CanvasTextAlign },
): void {
  ctx.save();
  ctx.font = options.font;
  ctx.textAlign = options.align ?? 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeStyle = options.stroke ?? '#000';
  ctx.lineWidth = options.lineWidth;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = options.fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** Rounded rectangle with a solid fill and a dark border (the word "label"). */
export function drawPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  options: { fill: string; stroke: string; lineWidth: number; radius: number },
): void {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, options.radius);
  ctx.fillStyle = options.fill;
  ctx.fill();
  ctx.lineWidth = options.lineWidth;
  ctx.strokeStyle = options.stroke;
  ctx.stroke();
  ctx.restore();
}
