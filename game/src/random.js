// A tiny seeded random number generator (mulberry32).
// The live game seeds it from the clock; screenshot mode seeds it from the
// URL so a staged scene renders the same way every time.

export function makeRandom(seed) {
  let state = (seed >>> 0) || 1;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function range(random, min, max) {
  return min + random() * (max - min);
}

export function pick(random, items) {
  return items[Math.floor(random() * items.length) % items.length];
}
