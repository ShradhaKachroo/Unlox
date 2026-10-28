import React, { useState } from 'react';
import type { Level } from '../types/lesson';

interface StudyPlanPageProps {
  onSelectTopic: (topic: string, lengthSeconds: number) => void;
  onBack: () => void;
}

interface SyllabusTrack {
  id: string;
  name: string;
  category: string;
  description: string;
  modules: Array<{
    id: string;
    title: string;
    description: string;
    duration: number;
    level: Level;
  }>;
}

const TRACKS: SyllabusTrack[] = [
  {
    id: 'python-core',
    name: 'Python Programming Essentials',
    category: 'Foundations',
    description: 'Master the core building blocks of Python step-by-step with clean visual execution traces.',
    modules: [
      { id: 'm1', title: 'Variables and Memory in Python', description: 'Understand how values and references are stored in memory addresses.', duration: 45, level: 'beginner' },
      { id: 'm2', title: 'If-Else Conditional Logic', description: 'Branching decisions, boolean expressions, and comparison operators.', duration: 45, level: 'beginner' },
      { id: 'm3', title: 'Python For Loops and Iteration', description: 'Iterating over lists, strings, and range sequences cleanly.', duration: 120, level: 'beginner' },
      { id: 'm4', title: 'While Loops and State Termination', description: 'Managing stateful loops, break statements, and loop guards.', duration: 45, level: 'beginner' },
      { id: 'm5', title: 'Functions and Return Values', description: 'Writing modular code blocks, parameter passing, and scope frames.', duration: 120, level: 'intermediate' },
    ],
  },
  {
    id: 'dsa',
    name: 'Data Structures & Algorithms',
    category: 'Algorithms',
    description: 'Visual conceptual walkthroughs of key algorithms with asymptotic complexity analysis.',
    modules: [
      { id: 'd1', title: 'Array Indexing and Slicing', description: 'Contiguous memory layout and constant-time element lookup.', duration: 45, level: 'beginner' },
      { id: 'd2', title: 'Linear Search vs Binary Search', description: 'Why sorted data enables logarithmic O(log n) search time.', duration: 120, level: 'beginner' },
      { id: 'd3', title: 'Bubble Sort and Swapping Logic', description: 'Visualizing element comparisons and bubble progression.', duration: 120, level: 'beginner' },
      { id: 'd4', title: 'Recursion and Call Stacks', description: 'Base cases, recursive unwinding, and stack memory frames.', duration: 120, level: 'intermediate' },
      { id: 'd5', title: 'Hash Tables and Collision Handling', description: 'Key-value mapping, hash functions, and amortized O(1) lookups.', duration: 120, level: 'intermediate' },
    ],
  },
  {
    id: 'advanced-systems',
    name: 'Advanced Systems & Internals',
    category: 'Systems',
    description: 'High-rigor deep dive into runtime internals, performance optimization, and concurrency.',
    modules: [
      { id: 'a1', title: 'Python Generators & Memory Streams', description: 'Yield expressions, lazy evaluation, and pipeline streaming.', duration: 120, level: 'advanced' },
      { id: 'a2', title: 'Decorators & Function Wrappers', description: 'Higher-order functions, closures, and wrapping execution.', duration: 120, level: 'advanced' },
      { id: 'a3', title: 'CPython GIL & Multithreading Limits', description: 'Global interpreter lock, CPU vs I/O bound concurrency.', duration: 120, level: 'advanced' },
      { id: 'a4', title: 'AsyncIO & Event Loop Architecture', description: 'Coroutines, event queues, and non-blocking asynchronous execution.', duration: 120, level: 'advanced' },
      { id: 'a5', title: 'Memory Management & Garbage Collection', description: 'Reference counting, cyclic GC, and object deallocation.', duration: 120, level: 'advanced' },
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
        background: 'transparent',
        color: 'var(--text-main, #0f172a)',
        fontFamily: '"Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '36px 24px 60px',
        boxSizing: 'border-box',
      }}
    >

      <div style={{ maxWidth: '880px', margin: '0 auto' }}>
        {/* Navigation Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0284c7',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Back to Studio</span>
          </button>

          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Progress: <strong style={{ color: '#059669' }}>{completedCount}/{currentTrack.modules.length} Completed ({progressPct}%)</strong>
          </span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 700,
              margin: '0 0 6px 0',
              color: '#0f172a',
              letterSpacing: '-0.01em',
            }}
          >
            Curriculum Pathways
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>
            Structured learning tracks. Select any module to generate its visual lesson.
          </p>
        </div>

        {/* Track Selector */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {TRACKS.map((t) => {
            const isSelected = t.id === selectedTrackId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTrackId(t.id)}
                style={{
                  flex: 1,
                  minWidth: '220px',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: isSelected ? '#ecfdf5' : '#ffffff',
                  border: isSelected ? '2px solid #059669' : '1px solid #e2e8f0',
                  color: '#0f172a',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 4px 12px rgba(5, 150, 105, 0.08)' : '0 1px 3px rgba(15, 23, 42, 0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: isSelected ? '#059669' : '#0f172a' }}>
                    {t.name}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: '#f1f5f9',
                      color: '#64748b',
                      fontWeight: 600,
                    }}
                  >
                    {t.category}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.35 }}>{t.description}</div>
              </button>
            );
          })}
        </div>

        {/* Modules List */}
        <div
          style={{
            borderRadius: '12px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            padding: '18px',
            boxSizing: 'border-box',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {currentTrack.modules.map((m, idx) => {
              const isDone = !!completed[m.id];
              let levelColor = '#059669';
              if (m.level === 'intermediate') levelColor = '#0284c7';
              if (m.level === 'advanced') levelColor = '#7c3aed';

              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: '8px',
                    background: isDone ? '#f8fafc' : '#ffffff',
                    border: isDone ? '1px solid #e2e8f0' : '1px solid #f1f5f9',
                    gap: '16px',
                    transition: 'all 0.12s ease',
                    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.02)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <button
                      type="button"
                      onClick={() => toggleComplete(m.id)}
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '4px',
                        border: isDone ? 'none' : '1.5px solid #cbd5e1',
                        background: isDone ? '#10b981' : '#ffffff',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '12px',
                        flexShrink: 0,
                      }}
                      title={isDone ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {isDone ? '✓' : ''}
                    </button>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                          #{idx + 1}
                        </span>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '14px',
                            color: isDone ? '#94a3b8' : '#0f172a',
                            textDecoration: isDone ? 'line-through' : 'none',
                          }}
                        >
                          {m.title}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: `${levelColor}15`,
                            color: levelColor,
                            border: `1px solid ${levelColor}33`,
                            textTransform: 'uppercase',
                          }}
                        >
                          {m.level}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{m.description}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectTopic(m.title, m.duration)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '6px',
                      background: '#e0f2fe',
                      border: '1px solid #bae6fd',
                      color: '#0284c7',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    <span>Generate ({m.duration}s)</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
