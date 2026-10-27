import React, { useState } from 'react';

interface StudyPlanPageProps {
  onSelectTopic: (topic: string, lengthSeconds: number) => void;
  onBack: () => void;
}

interface SyllabusTrack {
  id: string;
  name: string;
  icon: string;
  description: string;
  modules: Array<{
    id: string;
    title: string;
    description: string;
    duration: number; // 45 or 120
    level: 'beginner' | 'intermediate';
  }>;
}

const TRACKS: SyllabusTrack[] = [
  {
    id: 'python-core',
    name: 'Python Programming Essentials',
    icon: '🐍',
    description: 'Master the fundamental building blocks of Python step-by-step with visual cuts.',
    modules: [
      { id: 'm1', title: 'Variables and Memory in Python', description: 'Understand how values are stored in memory addresses.', duration: 45, level: 'beginner' },
      { id: 'm2', title: 'If-Else Conditional Logic', description: 'Branching decisions, booleans, and comparison operators.', duration: 45, level: 'beginner' },
      { id: 'm3', title: 'Python For Loops and Iteration', description: 'Looping over lists, strings, and range sequences cleanly.', duration: 120, level: 'beginner' },
      { id: 'm4', title: 'While Loops and Termination Conditions', description: 'Managing stateful loops, break statements, and counters.', duration: 45, level: 'beginner' },
      { id: 'm5', title: 'Functions and Return Values', description: 'Writing reusable code blocks, parameters, and scope.', duration: 120, level: 'intermediate' },
    ],
  },
  {
    id: 'dsa',
    name: 'Data Structures & Algorithms',
    icon: '⚡',
    description: 'Visual conceptual walkthroughs of key algorithms tested in tech interviews.',
    modules: [
      { id: 'd1', title: 'Array Indexing and Slicing', description: 'Contiguous memory layout and accessing elements by index.', duration: 45, level: 'beginner' },
      { id: 'd2', title: 'Linear Search vs Binary Search', description: 'Why sorted data enables logarithmic search time.', duration: 120, level: 'beginner' },
      { id: 'd3', title: 'Bubble Sort and Swapping Logic', description: 'Visualizing element comparisons and bubble progression.', duration: 120, level: 'beginner' },
      { id: 'd4', title: 'Recursion and Call Stacks', description: 'Base cases, recursive unwinding, and stack memory frames.', duration: 120, level: 'intermediate' },
      { id: 'd5', title: 'Hash Tables and Collision Handling', description: 'Key-value mapping, hash functions, and O(1) lookups.', duration: 120, level: 'intermediate' },
    ],
  },
];

export const StudyPlanPage: React.FC<StudyPlanPageProps> = ({ onSelectTopic, onBack }) => {
  const [selectedTrackId, setSelectedTrackId] = useState('python-core');
  const [completed, setCompleted] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('unlox_study_completed');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleComplete = (id: string) => {
    setCompleted((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem('unlox_study_completed', JSON.stringify(next));
      return next;
    });
  };

  const currentTrack = TRACKS.find((t) => t.id === selectedTrackId) || TRACKS[0];
  const completedCount = currentTrack.modules.filter((m) => completed[m.id]).length;
  const progressPct = Math.round((completedCount / currentTrack.modules.length) * 100);

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'radial-gradient(ellipse at 50% 10%, #0c1836 0%, #050813 70%, #020409 100%)',
        color: '#f8fafc',
        fontFamily: '"Noto Sans", sans-serif',
        padding: '30px 24px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        {/* Navigation Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid #334155',
              color: '#93c5fd',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ← Back to Generator
          </button>

          <span style={{ fontSize: '14px', color: '#64748b' }}>
            Course Progress: <strong style={{ color: '#4ade80' }}>{completedCount}/{currentTrack.modules.length} Completed ({progressPct}%)</strong>
          </span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 8px 0', color: '#ffffff' }}>
            🗺️ Student Visual Study Plan
          </h1>
          <p style={{ margin: 0, fontSize: '15px', color: '#94a3b8' }}>
            Follow structured curriculum paths. Click any topic to generate an on-demand animated video lesson!
          </p>
        </div>

        {/* Track Tabs */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '28px' }}>
          {TRACKS.map((track) => (
            <button
              key={track.id}
              type="button"
              onClick={() => setSelectedTrackId(track.id)}
              style={{
                flex: 1,
                padding: '16px 20px',
                borderRadius: '14px',
                background: selectedTrackId === track.id ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                border: selectedTrackId === track.id ? '2px solid #38bdf8' : '1px solid #334155',
                color: '#ffffff',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>{track.icon}</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: selectedTrackId === track.id ? '#38bdf8' : '#f8fafc' }}>
                {track.name}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                {track.modules.length} Lessons
              </div>
            </button>
          ))}
        </div>

        {/* Track Roadmap Modules */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {currentTrack.modules.map((mod, idx) => {
            const isDone = !!completed[mod.id];
            return (
              <div
                key={mod.id}
                style={{
                  background: isDone ? 'rgba(34, 197, 94, 0.08)' : 'rgba(15, 23, 42, 0.8)',
                  border: isDone ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid rgba(56, 189, 248, 0.2)',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <button
                    type="button"
                    onClick={() => toggleComplete(mod.id)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isDone ? '#22c55e' : '#1e293b',
                      border: isDone ? 'none' : '2px solid #475569',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      marginTop: '2px',
                    }}
                    title={isDone ? 'Mark uncompleted' : 'Mark completed'}
                  >
                    {isDone ? '✓' : ''}
                  </button>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
                        Lesson {idx + 1}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: mod.duration >= 100 ? 'rgba(168, 85, 247, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                          color: mod.duration >= 100 ? '#c084fc' : '#7dd3fc',
                          fontWeight: 700,
                        }}
                      >
                        {mod.duration >= 100 ? '⏱️ 2 min deep-dive' : '⚡ 45s fast overview'}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 4px 0', color: isDone ? '#cbd5e1' : '#ffffff' }}>
                      {mod.title}
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                      {mod.description}
                    </p>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => onSelectTopic(mod.title, mod.duration)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      border: '1px solid #38bdf8',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>⚡ Generate Video</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
