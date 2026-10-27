import React, { useState } from 'react';
import type { Level } from '../types/lesson';

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
    level: Level;
  }>;
}

const TRACKS: SyllabusTrack[] = [
  {
    id: 'python-core',
    name: 'Python Programming Essentials',
    icon: '🐍',
    description: 'Master the fundamental building blocks of Python step-by-step with visual blackboard cuts.',
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
  {
    id: 'advanced-systems',
    name: 'Advanced Systems & Engineering',
    icon: '🚀',
    description: 'High-rigor deep dive into runtime internals, performance optimization, and concurrency.',
    modules: [
      { id: 'a1', title: 'Python Generators & Memory Streams', description: 'Yield expressions, lazy evaluation, and pipeline streaming.', duration: 120, level: 'advanced' },
      { id: 'a2', title: 'Decorators & Function Wrappers', description: 'Higher-order functions, closures, and wrapping execution.', duration: 120, level: 'advanced' },
      { id: 'a3', title: 'CPython GIL & Multithreading Limits', description: 'Global interpreter lock, CPU vs I/O bound concurrency.', duration: 120, level: 'advanced' },
      { id: 'a4', title: 'AsyncIO & Event Loop Architecture', description: 'Coroutines, tasks, and non-blocking asynchronous execution.', duration: 120, level: 'advanced' },
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
        background: 'radial-gradient(ellipse at 50% 15%, #142018 0%, #0d1711 50%, #060b08 100%)',
        color: '#f8fafc',
        fontFamily: '"Outfit", sans-serif',
        padding: '32px 24px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        {/* Navigation Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px dashed rgba(254, 240, 138, 0.4)',
              color: '#fef08a',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ← Back to Blackboard Studio
          </button>

          <span style={{ fontSize: '13px', color: '#86efac', fontFamily: '"Kalam", cursive' }}>
            Curriculum Progress: <strong style={{ color: '#fef08a' }}>{completedCount}/{currentTrack.modules.length} Completed ({progressPct}%)</strong>
          </span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 800,
              margin: '0 0 6px 0',
              color: '#ffffff',
              fontFamily: '"Kalam", cursive',
              textShadow: '0 0 15px rgba(255, 255, 255, 0.2)',
            }}
          >
            📋 Student Blackboard Curriculum
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>
            Structured learning pathways from beginner to advanced. Click any module to generate its visual lesson!
          </p>
        </div>

        {/* Syllabus Track Selector */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
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
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: isSelected ? 'rgba(52, 211, 153, 0.15)' : 'rgba(14, 24, 18, 0.7)',
                  border: isSelected ? '2px solid #34d399' : '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: isSelected ? '0 0 20px rgba(52, 211, 153, 0.25)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '20px' }}>{t.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>{t.name}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>{t.description}</div>
              </button>
            );
          })}
        </div>

        {/* Modules List inside Chalkboard Frame */}
        <div
          style={{
            border: '8px solid #2e1c0c',
            borderRadius: '16px',
            background: '#0d1711',
            boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.9), 0 20px 40px rgba(0, 0, 0, 0.8)',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {currentTrack.modules.map((m, idx) => {
              const isDone = !!completed[m.id];
              let levelColor = '#86efac';
              if (m.level === 'intermediate') levelColor = '#fef08a';
              if (m.level === 'advanced') levelColor = '#c084fc';

              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderRadius: '10px',
                    background: isDone ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                    border: isDone ? '1px solid #10b981' : '1px dashed rgba(255, 255, 255, 0.15)',
                    gap: '16px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                    <button
                      type="button"
                      onClick={() => toggleComplete(m.id)}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        border: isDone ? 'none' : '2px solid rgba(255, 255, 255, 0.3)',
                        background: isDone ? '#10b981' : 'transparent',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '14px',
                        flexShrink: 0,
                      }}
                      title={isDone ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {isDone ? '✓' : ''}
                    </button>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontSize: '12px', color: '#6ee7b7', fontWeight: 700 }}>
                          #{idx + 1}
                        </span>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '15px',
                            color: isDone ? '#94a3b8' : '#ffffff',
                            textDecoration: isDone ? 'line-through' : 'none',
                          }}
                        >
                          {m.title}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: `${levelColor}22`,
                            color: levelColor,
                            border: `1px solid ${levelColor}44`,
                            textTransform: 'uppercase',
                          }}
                        >
                          {m.level}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#94a3b8' }}>{m.description}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectTopic(m.title, m.duration)}
                    style={{
                      padding: '9px 18px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      border: '1px solid #34d399',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 0 15px rgba(52, 211, 153, 0.25)',
                    }}
                  >
                    <span>▶</span>
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
