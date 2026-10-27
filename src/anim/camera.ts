/**
 * Deterministic camera motion helper.
 * Produces subtle cinematic zoom (1.00 -> 1.05) and slow parallax drift computed from t.
 */

export interface CameraState {
  scale: number;
  panX: number;
  panY: number;
  tiltX: number;
  tiltY: number;
  transform: string;
}

export function getCameraTransform(t: number, duration: number): CameraState {
  const normT = duration > 0 ? Math.min(1, Math.max(0, t / duration)) : 0;

  // Gentle, continuous zoom from 1.00 to 1.05
  const scale = 1.0 + 0.05 * normT;

  // Smooth sinusoidal drift in pan (within +/- 8px)
  const panX = Math.sin(normT * Math.PI * 1.5) * 8;
  const panY = Math.cos(normT * Math.PI * 1.2) * 5;

  // Subtle global stage tilt (+/- 1.5 deg)
  const tiltX = Math.sin(normT * Math.PI * 2) * 1.2;
  const tiltY = Math.cos(normT * Math.PI * 2) * 1.5;

  return {
    scale,
    panX,
    panY,
    tiltX,
    tiltY,
    transform: `translate3d(${panX.toFixed(2)}px, ${panY.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`,
  };
}
