import React, { useState, useEffect } from 'react';
import type { Lesson } from './types/lesson';
import { fetchLessonWithTiming } from './utils/loader';
import { PlayerShell } from './player/PlayerShell';
import { InputPage } from './pages/InputPage';

export const App: React.FC = () => {
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [view, setView] = useState<'player' | 'input'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('view') === 'input') return 'input';
    }
    return 'player';
  });
  const [statusBadge, setStatusBadge] = useState<string>('Offline Sample');
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('view') === 'input') return false;
    }
    return true;
  });
  const [error, setError] = useState<string | null>(null);

  // Initialize with sample lesson so player and window.renderAt are available immediately
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedView = params.get('view');
    const lang = params.get('lang') || 'en';

    if (requestedView === 'input') {
      return;
    }

    const loadInitialLesson = async () => {
      try {
        setLoading(true);
        const lesson = await fetchLessonWithTiming(lang);
        setCurrentLesson(lesson);
        setStatusBadge(`Offline Sample (${lesson.language.toUpperCase()})`);
        setView('player');
      } catch (err) {
        setError(`Failed to load initial lesson: ${(err as Error).message}`);
      } finally {
        setLoading(false);
      }
    };

    loadInitialLesson();
  }, []);

  const handleLessonReady = (lesson: Lesson, badge: string) => {
    setCurrentLesson(lesson);
    setStatusBadge(badge);
    setView('player');
  };

  if (loading) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#040711',
          color: '#38bdf8',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '3px solid #1e293b',
            borderTopColor: '#38bdf8',
            transform: 'rotate(45deg)',
          }}
        />
        <span style={{ fontSize: '15px', fontWeight: 600, color: '#94a3b8' }}>
          Initializing Blu Visual Teacher...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#040711',
          color: '#f87171',
          gap: '16px',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: '20px', fontWeight: 700 }}>Initialization Error</span>
        <span style={{ color: '#cbd5e1', maxWidth: '500px' }}>{error}</span>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            background: '#1e293b',
            border: '1px solid #475569',
            color: '#ffffff',
            cursor: 'pointer',
          }}
        >
          Reload App
        </button>
      </div>
    );
  }

  if (view === 'input' || !currentLesson) {
    return <InputPage onLessonReady={handleLessonReady} />;
  }

  return (
    <PlayerShell
      lesson={currentLesson}
      onBackToInput={() => setView('input')}
      onLessonChange={setCurrentLesson}
      statusBadge={statusBadge}
    />
  );
};

export default App;
