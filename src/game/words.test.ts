import { describe, expect, it } from 'vitest';
import { WORDS, normalizeTyped, reverseWord, shuffleWord } from './words';

describe('words', () => {
  it('only contains plain a-z words (typeable on any keyboard)', () => {
    for (const word of WORDS) expect(word).toMatch(/^[a-z]+$/);
  });

  it('reverses a word', () => {
    expect(reverseWord('pato')).toBe('otap');
  });

  it('shuffles letters into something different when possible', () => {
    for (const word of WORDS) {
      const shuffled = shuffleWord(word);
      expect([...shuffled].sort().join('')).toBe([...word].sort().join(''));
      expect(shuffled).not.toBe(word);
    }
  });

  it('normalizes typed text from mobile keyboards', () => {
    expect(normalizeTyped('Limão')).toBe('limao');
    expect(normalizeTyped('MAÇÃ')).toBe('maca');
    expect(normalizeTyped('ga to1')).toBe('gato');
  });
});
