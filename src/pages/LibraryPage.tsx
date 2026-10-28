import React, { useState, useEffect } from 'react';
import type { Lesson } from '../types/lesson';
import { getLibrary, deleteFromLibrary, formatDuration, type LibraryEntry } from '../utils/library';

interface LibraryPageProps {
  onWatchLesson: (lesson: Lesson) => void;
  onBack: () => void;
}

export const LibraryPage: React.FC<LibraryPageProps> = ({ onWatchLesson, onBack }) => {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All');

  useEffect(() => {
    setEntries(getLibrary());
  }, []);

  const handleDelete = (id: string) => {
    deleteFromLibrary(id);
    setEntries(getLibrary());
  };

  const tags = ['All', 'Python', 'Algorithms', 'Basics', 'Data Structures'];

  const filtered = entries.filter((e) => {
    const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase()) || e.topic.toLowerCase().includes(search.toLowerCase());
    if (selectedTag === 'All') return matchesSearch;
    return matchesSearch && (e.title.toLowerCase().includes(selectedTag.toLowerCase()) || e.topic.toLowerCase().includes(selectedTag.toLowerCase()));
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'transparent',
        color: 'var(--text-main, #0f172a)',
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
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0284c7',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            }}
          >
            ← Back to Generator
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: '#64748b' }}>
              Saved Lessons: <strong style={{ color: '#0284c7' }}>{entries.length}</strong>
            </span>
          </div>
        </div>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a' }}>
            📚 Topic-wise Video Library
          </h1>
          <p style={{ margin: 0, fontSize: '15px', color: '#475569' }}>
            Instant offline replay of all your generated lessons. No loading or generation delay.
          </p>
        </div>

        {/* Search & Tag Filter Bar */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved lessons by topic or keyword..."
            style={{
              flex: 1,
              minWidth: '240px',
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'var(--input-bg, #ffffff)',
              border: '1px solid var(--input-border, #cbd5e1)',
              color: 'var(--input-text, #0f172a)',
              fontSize: '14px',
              outline: 'none',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            }}

          />

          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: selectedTag === tag ? '#0284c7' : '#ffffff',
                  border: selectedTag === tag ? '1px solid #0284c7' : '1px solid #e2e8f0',
                  color: selectedTag === tag ? '#ffffff' : '#475569',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: selectedTag === tag ? '0 2px 6px rgba(2, 132, 199, 0.25)' : 'none',
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Video Cards Grid */}
        {filtered.length === 0 ? (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              background: '#ffffff',
              border: '1px dashed #cbd5e1',
              borderRadius: '16px',
              color: '#64748b',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)',
            }}
          >
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎬</div>
            <p style={{ fontSize: '16px', margin: '0 0 6px 0', color: '#0f172a', fontWeight: 600 }}>No saved lessons found</p>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Generate a lesson from the creator to see it stored here automatically!</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {filtered.map((entry) => (
              <div
                key={entry.id}
                style={{
                  background: 'var(--card-bg, #ffffff)',
                  border: '1px solid var(--panel-border, #e2e8f0)',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: '#e0f2fe',
                        color: '#0284c7',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        border: '1px solid #bae6fd',
                      }}
                    >
                      {entry.scene_count} Scenes • {formatDuration(entry.duration_seconds)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}
                      title="Delete lesson"
                    >
                      🗑️
                    </button>
                  </div>

                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a', lineHeight: 1.3 }}>
                    {entry.title}
                  </h3>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <button
                    type="button"
                    onClick={() => onWatchLesson(entry.lesson)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                    }}
                  >
                    <span>▶ Play Lesson</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
