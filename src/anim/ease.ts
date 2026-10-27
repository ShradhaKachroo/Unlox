/**
 * Pure mathematical easing functions for deterministic frame rendering.
 * Every function takes t in [0, 1] and returns an eased value.
 */

export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

export function easeOutCubic(t: number): number {
  const c = clamp01(t);
  return 1 - Math.pow(1 - c, 3);
}

export function easeInOutCubic(t: number): number {
  const c = clamp01(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

export function easeOutBack(t: number, s = 1.70158): number {
  const c = clamp01(t);
  const p = c - 1;
  return p * p * ((s + 1) * p + s) + 1;
}

export function easeOutElastic(t: number): number {
  const c = clamp01(t);
  if (c === 0) return 0;
  if (c === 1) return 1;
  const p = 0.3;
  return Math.pow(2, -10 * c) * Math.sin(((c - p / 4) * (2 * Math.PI)) / p) + 1;
}

/**
 * Analytic damped harmonic spring function (closed form, zero simulation state).
 * Returns position from 0 to 1 with natural overshoot and settling.
 * @param t Progress 0 to 1
 * @param omega Natural frequency (e.g. 10..14)
 * @param zeta Damping ratio (0.5..0.7 for lively bounce without endless oscillation)
 */
export function dampedSpring(t: number, omega = 12, zeta = 0.6): number {
  const c = clamp01(t);
  if (c <= 0) return 0;
  if (c >= 1) return 1;
  // Natural damped oscillator step response: 1 - e^(-zeta * omega * t) * (cos(omega_d * t) + (zeta/sqrt(1-zeta^2))*sin(omega_d * t))
  const omegaD = omega * Math.sqrt(Math.max(0.001, 1 - zeta * zeta));
  const decay = Math.exp(-zeta * omega * c);
  const val = 1 - decay * (Math.cos(omegaD * c) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(omegaD * c));
  return val;
}
