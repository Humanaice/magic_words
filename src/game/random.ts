/** Random integer in [min, max) — same contract as the original getRandomInt. */
export function randomInt(min: number, max: number, rng: () => number = Math.random): number {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(rng() * (hi - lo) + lo);
}

/** Picks a random element of a non-empty array. */
export function pick<T>(items: readonly T[], rng: () => number = Math.random): T {
  return items[randomInt(0, items.length, rng)];
}
