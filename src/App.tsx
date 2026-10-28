import React, { useState, useEffect } from 'react';
import type { Lesson } from './types/lesson';
import { fetchLessonWithTiming } from './utils/loader';
import { apiGetLesson } from './api/lessonApi';
import { PlayerShell } from './player/PlayerShell';
import { InputPage } from './pages/InputPage';
import { LibraryPage } from './pages/LibraryPage';
import { StudyPlanPage } from './pages/StudyPlanPage';
import { Navbar } from './components/Navbar';

export const App: React.FC = () => {
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [view, setView] = useState<'player' | 'input' | 'library' | 'study_plan'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('view') === 'player' || p.get('capture') === '1') return 'player';
      if (p.get('view') === 'library') return 'library';
      if (p.get('view') === 'study') return 'study_plan';
    }
    return 'input';
  });
  const [statusBadge, setStatusBadge] = useState<string>('Offline Sample');
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('view') === 'player' || p.get('capture') === '1') return true;
    }
    return false;
  });
  const [error, setError] = useState<string | null>(null);

  // Topic & duration passed from Study Plan into Input Page
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(120);

  // Initialize with sample lesson only if player/capture is explicitly requested
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedView = params.get('view');
    const isCapture = params.get('capture') === '1';
    const lang = params.get('lang') || 'en';
    const lessonId = params.get('lesson_id');

    if (requestedView !== 'player' && !isCapture) {
      setLoading(false);
      return;
    }

    const loadInitialLesson = async () => {
      try {
        setLoading(true);
        let lesson: Lesson;
        if (lessonId && lessonId !== 'sample' && !lessonId.startsWith('sample')) {
          lesson = await apiGetLesson(lessonId, lang);
          setStatusBadge(`Lesson: ${lesson.title}`);
        } else {
          lesson = await fetchLessonWithTiming(lang);
          setStatusBadge(`Offline Sample (${lesson.language.toUpperCase()})`);
        }
        setCurrentLesson(lesson);
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

  const handleSelectFromStudyPlan = (topic: string, duration: number) => {
    setSelectedTopic(topic);
    setSelectedDuration(duration);
    setView('input');
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
          background: 'var(--bg-gradient, #0e1c3a)',
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
          background: 'var(--bg-gradient, #0e1c3a)',
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

  if (view === 'library') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar currentView="library" onNavigate={setView} statusBadge={statusBadge} />
        <LibraryPage
          onWatchLesson={(lesson) => {
            setCurrentLesson(lesson);
            setStatusBadge('Saved Lesson');
            setView('player');
          }}
          onBack={() => setView('input')}
        />
      </div>
    );
  }

  if (view === 'study_plan') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar currentView="study_plan" onNavigate={setView} statusBadge={statusBadge} />
        <StudyPlanPage
          onSelectTopic={handleSelectFromStudyPlan}
          onBack={() => setView('input')}
        />
      </div>
    );
  }

  if (view === 'input' || !currentLesson) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar currentView="input" onNavigate={setView} statusBadge={statusBadge} />
        <InputPage
          onLessonReady={handleLessonReady}
          onOpenLibrary={() => setView('library')}
          onOpenStudyPlan={() => setView('study_plan')}
          initialTopic={selectedTopic}
          initialDuration={selectedDuration}
        />
      </div>
    );
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
