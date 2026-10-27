import { clamp01 } from './ease';
export { clamp01 };

/**
 * Returns clamped progress 0..1 for time t between start and end (in ms).
 */
export function prog(t: number, start: number, end: number): number {
  if (end <= start) return t >= end ? 1 : 0;
  return clamp01((t - start) / (end - start));
}

/**
 * Standard linear interpolation.
 */
export function lerp(a: number, b: number, p: number): number {
  return a + (b - a) * p;
}

/**
 * Computes progress for item index i with staggered delay and duration.
 */
export function stagger(t: number, i: number, delayMs: number, durationMs: number): number {
  const start = i * delayMs;
  return prog(t, start, start + durationMs);
}

/**
 * Deterministic pseudo-random generator (Mulberry32).
 * Returns a generator function that produces numbers between 0 and 1.
 */
export function seeded(seed: number): () => number {
  let s = Math.floor(seed) | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Progressive letter-by-letter or line-by-line typewriter reveal.
 */
export function typewriter(text: string, p: number): string {
  if (!text) return '';
  const count = Math.round(clamp01(p) * text.length);
  return text.slice(0, count);
}

/**
 * Simple pseudo-hash from string to number for deterministic particle/layout seeds.
 */
export function stringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
