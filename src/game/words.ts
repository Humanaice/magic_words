/** Word list from the original game (Portuguese, no accents so any keyboard can type them). */
export const WORDS: readonly string[] = [
  'abacaxi',
  'bala',
  'carro',
  'dedo',
  'elefante',
  'faca',
  'gato',
  'hamburguer',
  'igreja',
  'jornal',
  'kilo',
  'limao',
  'maca',
  'nave',
  'oculos',
  'pato',
  'queijo',
  'rato',
  'sapato',
  'tijolo',
  'uva',
  'vela',
  'waffle',
  'xadrez',
  'yoga',
  'zebra',
  'amigo',
  'bolo',
  'cavalo',
  'dente',
  'eletrico',
  'foguete',
  'garfo',
  'hotel',
  'jacare',
  'kiwi',
  'lampada',
  'mochila',
  'navio',
  'orquidea',
];

/** Reverses a word ("pato" -> "otap"). */
export function reverseWord(word: string): string {
  return [...word].reverse().join('');
}

/**
 * Shuffles the letters of a word (Fisher–Yates). Tries a few times to return
 * something different from the input when that is possible.
 */
export function shuffleWord(word: string, rng: () => number = Math.random): string {
  const letters = [...word];
  if (new Set(letters).size < 2) return word;
  for (let attempt = 0; attempt < 5; attempt++) {
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    const result = letters.join('');
    if (result !== word) return result;
  }
  return letters.join('');
}

/**
 * Normalizes what the player typed: lower case, accents removed (mobile
 * keyboards sometimes insert "ç"/"ã"), only letters a–z kept.
 */
export function normalizeTyped(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');
}

/**
 * Fog: hides some letters with "?" (never the first one, at least one hidden).
 * Returns the label to show; the player still types the real word.
 */
export function fogWord(word: string, fraction: number, rng: () => number = Math.random): string {
  const letters = [...word];
  if (letters.length < 2) return word;
  const positions = letters.map((_, i) => i).slice(1);
  const hide = Math.max(1, Math.round(letters.length * fraction));
  for (let i = 0; i < hide && positions.length > 0; i++) {
    const [index] = positions.splice(Math.floor(rng() * positions.length), 1);
    letters[index] = '?';
  }
  return letters.join('');
}
