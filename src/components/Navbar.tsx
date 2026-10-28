import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/useSettings';

interface NavbarProps {
  currentView: 'input' | 'library' | 'study_plan' | 'player';
  onNavigate: (view: 'input' | 'library' | 'study_plan') => void;
  statusBadge?: string;
}

const THEMES: Array<{ id: 'light' | 'warm' | 'mint' | 'lavender' | 'navy'; label: string; icon: string }> = [
  { id: 'light', label: 'Sky Porcelain', icon: '☀️' },
  { id: 'warm', label: 'Warm Pearl', icon: '🌸' },
  { id: 'mint', label: 'Mint Sage', icon: '🌿' },
  { id: 'lavender', label: 'Lavender Mist', icon: '🫐' },
  { id: 'navy', label: 'Cosmic Navy', icon: '🌌' },
];

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { settings, setDyslexia } = useSettings();
  const [streak] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('unlox_user_streak');
      return saved ? parseInt(saved, 10) : 3;
    } catch {
      return 3;
    }
  });

  const [theme, setTheme] = useState<'light' | 'warm' | 'mint' | 'lavender' | 'navy'>(() => {
    try {
      const saved = localStorage.getItem('unlox_theme') as 'light' | 'warm' | 'mint' | 'lavender' | 'navy';
      return saved && ['light', 'warm', 'mint', 'lavender', 'navy'].includes(saved) ? saved : 'light';
    } catch {
      return 'light';
    }
  });

  const cycleTheme = () => {
    const ids: Array<'light' | 'warm' | 'mint' | 'lavender' | 'navy'> = ['light', 'warm', 'mint', 'lavender', 'navy'];
    const nextIdx = (ids.indexOf(theme) + 1) % ids.length;
    const next = ids[nextIdx];
    setTheme(next);
    try {
      localStorage.setItem('unlox_theme', next);
    } catch {
      // ignore
    }
    document.documentElement.setAttribute('data-theme', next);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('unlox_user_streak', streak.toString());
    } catch {
      // ignore
    }
  }, [streak]);

  const activeThemeObj = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        width: '100%',
        height: '64px',
        background: 'var(--navbar-bg, rgba(255, 255, 255, 0.92))',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--panel-border, #e2e8f0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        boxSizing: 'border-box',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
      }}
    >

      {/* Left: Brand Identity */}
      <div
        onClick={() => onNavigate('input')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Animated Blu Mascot Mini Avatar */}
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 12px rgba(2, 132, 199, 0.35)',
            position: 'relative',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            {/* Blu stylized face */}
            <circle cx="12" cy="12" r="9" fill="#0f172a" />
            <circle cx="9" cy="11" r="2.5" fill="#38bdf8" />
            <circle cx="15" cy="11" r="2.5" fill="#38bdf8" />
            <circle cx="9.6" cy="10.6" r="0.8" fill="#ffffff" />
            <circle cx="15.6" cy="10.6" r="0.8" fill="#ffffff" />
            <path d="M10 15 Q12 17.5 14 15" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span
            style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10b981',
              border: '2px solid #ffffff',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '18px',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--text-main, #0f172a)',
              }}
            >
              UNLOX
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(2, 132, 199, 0.1)',
                color: '#0284c7',
                border: '1px solid rgba(2, 132, 199, 0.25)',
              }}
            >
              Visual Teacher
            </span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
            Offline AI Code & Concept Animator
          </span>
        </div>
      </div>

      {/* Middle: Navigation Links */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(241, 245, 249, 0.85)',
          padding: '4px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
        }}
      >
        <button
          type="button"
          onClick={() => onNavigate('input')}
          style={{
            padding: '7px 14px',
            borderRadius: '8px',
            border: currentView === 'input' ? '1px solid #e2e8f0' : '1px solid transparent',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: currentView === 'input' ? '#ffffff' : 'transparent',
            color: currentView === 'input' ? '#0284c7' : '#64748b',
            boxShadow: currentView === 'input' ? '0 2px 6px rgba(15, 23, 42, 0.08)' : 'none',
          }}
        >
          <span>✨</span>
          <span>Create Studio</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('study_plan')}
          style={{
            padding: '7px 14px',
            borderRadius: '8px',
            border: currentView === 'study_plan' ? '1px solid #e2e8f0' : '1px solid transparent',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: currentView === 'study_plan' ? '#ffffff' : 'transparent',
            color: currentView === 'study_plan' ? '#0284c7' : '#64748b',
            boxShadow: currentView === 'study_plan' ? '0 2px 6px rgba(15, 23, 42, 0.08)' : 'none',
          }}
        >
          <span>🗺️</span>
          <span>Study Tracks</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('library')}
          style={{
            padding: '7px 14px',
            borderRadius: '8px',
            border: currentView === 'library' ? '1px solid #e2e8f0' : '1px solid transparent',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: currentView === 'library' ? '#ffffff' : 'transparent',
            color: currentView === 'library' ? '#0284c7' : '#64748b',
            boxShadow: currentView === 'library' ? '0 2px 6px rgba(15, 23, 42, 0.08)' : 'none',
          }}
        >
          <span>📚</span>
          <span>Library</span>
        </button>
      </nav>

      {/* Right: Gamified Streak, Theme Switcher & Utility Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Background Color Theme Switcher */}
        <button
          type="button"
          onClick={cycleTheme}
          title={`Click to switch background theme (Current: ${activeThemeObj.label})`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 11px',
            borderRadius: '8px',
            background: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--panel-border, #cbd5e1)',
            color: 'var(--text-main, #334155)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
          }}
        >
          <span>{activeThemeObj.icon}</span>
          <span>{activeThemeObj.label}</span>
        </button>

        {/* Streak Counter */}
        <div
          title="Daily Study Streak — Keep generating lessons to grow your streak!"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 10px',
            borderRadius: '8px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#b45309',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'default',
          }}
        >
          <span>🔥</span>
          <span>{streak}d Streak</span>
        </div>


        {/* Dyslexia Mode Fast Switch */}
        <button
          type="button"
          onClick={() => setDyslexia(!settings.dyslexia)}
          title="Toggle Dyslexia-Friendly Typography (OpenDyslexic & enhanced contrast)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 11px',
            borderRadius: '8px',
            background: settings.dyslexia ? '#fef3c7' : 'var(--card-bg, #ffffff)',
            border: `1px solid ${settings.dyslexia ? '#f59e0b' : 'var(--panel-border, #cbd5e1)'}`,
            color: settings.dyslexia ? '#78350f' : 'var(--text-main, #334155)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
          }}
        >
          <span>📖</span>
          <span>Dyslexia: {settings.dyslexia ? 'ON' : 'OFF'}</span>
        </button>

        {/* Offline Ready Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            borderRadius: '8px',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#059669',
            fontSize: '11px',
            fontWeight: 700,
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 6px #10b981',
            }}
          />
          <span>Offline Ready</span>
        </div>
      </div>
    </header>
  );
};
