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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: '#64748b' }}>
              Saved Lessons: <strong style={{ color: '#38bdf8' }}>{entries.length}</strong>
            </span>
          </div>
        </div>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 8px 0', color: '#ffffff' }}>
            📚 Topic-wise Video Library
          </h1>
          <p style={{ margin: 0, fontSize: '15px', color: '#94a3b8' }}>
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
              background: '#090d16',
              border: '1px solid #334155',
              color: '#f8fafc',
              fontSize: '14px',
              outline: 'none',
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
                  background: selectedTag === tag ? '#0284c7' : 'rgba(30, 41, 59, 0.6)',
                  border: selectedTag === tag ? '1px solid #38bdf8' : '1px solid #334155',
                  color: selectedTag === tag ? '#ffffff' : '#94a3b8',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
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
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px dashed #334155',
              borderRadius: '16px',
              color: '#64748b',
            }}
          >
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎬</div>
            <p style={{ fontSize: '16px', margin: '0 0 6px 0', color: '#94a3b8' }}>No saved lessons found</p>
            <span style={{ fontSize: '13px' }}>Generate a lesson from the creator to see it stored here automatically!</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {filtered.map((entry) => (
              <div
                key={entry.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}
                    >
                      {entry.scene_count} Scenes • {formatDuration(entry.duration_seconds)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '14px' }}
                      title="Delete lesson"
                    >
                      🗑️
                    </button>
                  </div>

                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px 0', color: '#f8fafc', lineHeight: 1.3 }}>
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
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      border: '1px solid #38bdf8',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
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
