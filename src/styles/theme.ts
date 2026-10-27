export const PALETTE = {
  // Deep stage background
  bgStart: '#111b33',
  bgMid: '#0a0f1d',
  bgEnd: '#04060c',

  // Core semantic accents
  cyan: '#38bdf8',     // primary info, code flow, wire
  violet: '#a855f7',   // concepts, operations, functions
  amber: '#f59e0b',    // active current pointer / variable value
  emerald: '#10b981',  // finished items, checkmarks, success
  rose: '#f43f5e',     // alerts, branches, highlights

  // Neutrals
  slate50: '#f8fafc',
  slate200: '#e2e8f0',
  slate400: '#94a3b8',
  slate700: '#334155',
  slate800: '#1e293b',
  slate900: '#0f172a',
};

export interface GlassCardOptions {
  glowColor?: string;
  glowOpacity?: number;
  borderRadius?: number;
  lowQuality?: boolean;
}

export function getGlassStyle(options: GlassCardOptions = {}): React.CSSProperties {
  const {
    glowColor = PALETTE.cyan,
    glowOpacity = 0.25,
    borderRadius = 20,
    lowQuality = false,
  } = options;

  if (lowQuality) {
    return {
      background: '#0d1527',
      borderRadius: `${borderRadius}px`,
      border: '1.5px solid rgba(56, 189, 248, 0.35)',
      boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
    };
  }

  return {
    background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.78) 0%, rgba(9, 14, 26, 0.9) 100%)',
    borderRadius: `${borderRadius}px`,
    border: '1.5px solid rgba(255, 255, 255, 0.12)',
    boxShadow: `0 20px 45px -10px rgba(0, 0, 0, 0.75), 0 0 35px ${glowColor}${Math.round(glowOpacity * 255).toString(16).padStart(2, '0')}`,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
  };
}
