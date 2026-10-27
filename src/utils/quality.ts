export type QualityMode = 'high' | 'low';

export function getInitialQuality(): QualityMode {
  if (typeof window === 'undefined') return 'high';

  const params = new URLSearchParams(window.location.search);
  const qParam = params.get('quality');
  if (qParam === 'low') return 'low';
  if (qParam === 'high') return 'high';

  // Auto-enable low quality on small screens (e.g. mobile phones) for smooth 60fps
  if (window.innerWidth <= 640) {
    return 'low';
  }

  return 'high';
}
