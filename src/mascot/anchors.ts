import type { Scene } from '../types/lesson';

export interface AnchorPoint {
  x: number;
  y: number;
}

/**
 * Pure function returning the stage coordinates {x, y} (on 1280x720 canvas)
 * of the currently active visual element that Blu should point at, or null if resting.
 */
export function getAnchor(scene: Scene, t: number, duration: number): AnchorPoint | null {
  if (!scene) return null;

  switch (scene.type) {
    case 'code_walkthrough': {
      const steps = scene.highlight_lines?.length > 0 ? scene.highlight_lines : [1];
      const slotDuration = duration / Math.max(1, steps.length);
      const currentStep = Math.min(steps.length - 1, Math.max(0, Math.floor(t / slotDuration)));
      const activeLine = steps[currentStep] || 1;

      // Code panel bounds: code lines start at y ~ 200, lineHeight = 46px
      // Blu is located at bottom-right (x ~ 1080, y ~ 530)
      const targetY = Math.min(500, Math.max(180, 200 + (activeLine - 1) * 46 + 23));
      return { x: 580, y: targetY };
    }

    case 'diagram': {
      const items = scene.items || [];
      const N = items.length;
      if (N === 0) return null;

      const slotDuration = duration / Math.max(1, N);
      const activeIdx = Math.min(N - 1, Math.max(0, Math.floor(t / slotDuration)));

      // Diagram geometry on 1280x720
      const boxWidth = Math.min(280, Math.max(220, 920 / Math.max(1, N)));
      const totalBoxesWidth = N * boxWidth;
      const gap = N > 1 ? Math.min(130, (1000 - totalBoxesWidth) / (N - 1)) : 0;
      const totalSpan = totalBoxesWidth + (N - 1) * gap;
      const startX = (1280 - totalSpan) / 2;

      const boxX = startX + activeIdx * (boxWidth + gap) + boxWidth / 2;
      const boxY = 270 + 105; // center of 210px height box
      return { x: boxX, y: boxY };
    }

    case 'title_card': {
      // Point at the animated underline / central heading during mid-scene
      if (t > 600 && t < duration - 800) {
        return { x: 640, y: 390 };
      }
      return null;
    }

    default:
      return null;
  }
}
