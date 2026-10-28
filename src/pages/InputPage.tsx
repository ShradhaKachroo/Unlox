import React, { useState, useEffect, useRef } from 'react';
import type { Lesson, Level } from '../types/lesson';
import { LANGUAGE_LABELS } from '../utils/fonts';
import { useSettings } from '../context/useSettings';
import { apiGenerateLesson, apiOcrImage } from '../api/lessonApi';
import { GeneratingLoader } from '../components/GeneratingLoader';
import { saveToLibrary } from '../utils/library';

interface InputPageProps {
  onLessonReady: (lesson: Lesson, sourceBadge: string) => void;
  onOpenLibrary?: () => void;
  onOpenStudyPlan?: () => void;
  initialTopic?: string;
  initialDuration?: number;
}

const TOPIC_PRESETS: Array<{ label: string; topic: string; category: string; sec: number; level: Level }> = [
  { label: 'Python For Loops', topic: 'Python For Loops and Iteration', category: 'Python', sec: 90, level: 'beginner' },
  { label: 'Binary Search', topic: 'Binary Search in Arrays', category: 'DSA', sec: 120, level: 'beginner' },
  { label: 'Variables & Memory', topic: 'Variables and Memory in Python', category: 'Python', sec: 45, level: 'beginner' },
  { label: 'Recursion Stacks', topic: 'Recursion and Call Stacks', category: 'DSA', sec: 120, level: 'intermediate' },
  { label: 'AsyncIO & Event Loop', topic: 'AsyncIO and Event Loop Architecture', category: 'Internals', sec: 120, level: 'advanced' },
  { label: 'Bubble Sort Swapping', topic: 'Bubble Sort and Swapping Logic', category: 'DSA', sec: 90, level: 'beginner' },
];

const DURATION_PRESETS = [
  { sec: 45, label: '45s', desc: 'Fast Overview' },
  { sec: 90, label: '90s', desc: 'Standard Lesson' },
  { sec: 105, label: '105s', desc: 'In-Depth' },
  { sec: 120, label: '120s', desc: 'Full Deep Dive' },
];

export const InputPage: React.FC<InputPageProps> = ({
  onLessonReady,
  onOpenLibrary,
  onOpenStudyPlan,
  initialTopic = '',
  initialDuration = 90,
}) => {
  const { settings, setVoice } = useSettings();
  const [topic, setTopic] = useState(initialTopic);
  const [level, setLevel] = useState<Level>('beginner');
  const [language, setLanguage] = useState('en');
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>(settings.voice || 'female');
  const [targetLength, setTargetLength] = useState(initialDuration);
  const [localContext] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);


  // Drag and Drop OCR state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPreview, setOcrPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Python' | 'DSA' | 'Internals'>('All');

  const handleOcrFile = async (file: File) => {
    if (!file) return;
    setOcrLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiOcrImage(file);
      if (res.topic) {
        setTopic(res.topic);
      }
      setOcrPreview(res.text || res.topic);
    } catch (err) {
      console.error('OCR Error:', err);
      setErrorMessage(`Offline OCR scan failed: ${(err as Error).message}`);
    } finally {
      setOcrLoading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleOcrFile(e.dataTransfer.files[0]);
    }
  };

  useEffect(() => {
    if (initialTopic) setTopic(initialTopic);
    if (initialDuration) setTargetLength(initialDuration);
  }, [initialTopic, initialDuration]);

  const handleVoiceChange = (gender: 'female' | 'male') => {
    setVoiceGender(gender);
    setVoice(gender);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const generatedLesson = await apiGenerateLesson({
        topic: topic.trim(),
        level,
        language,
        target_seconds: targetLength,
        voice: voiceGender,
        local_context: localContext,
      });

      saveToLibrary(generatedLesson, targetLength);
      onLessonReady(generatedLesson, `Blu Studio Lesson (${level.toUpperCase()})`);
    } catch (err) {
      console.error('Generation failed:', err);
      setErrorMessage(`Generation failed: ${(err as Error).message}. Please ensure the backend server is running on http://127.0.0.1:8000.`);
      setLoading(false);
    }
  };

  if (loading) {
    return <GeneratingLoader topic={topic || 'Lesson'} targetSeconds={targetLength} />;
  }

  const filteredPresets = categoryFilter === 'All' 
    ? TOPIC_PRESETS 
    : TOPIC_PRESETS.filter((p) => p.category === categoryFilter);

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 20px 64px',
        boxSizing: 'border-box',
        background: 'transparent',
        color: '#f8fafc',
        fontFamily: '"Noto Sans", system-ui, -apple-system, sans-serif',
      }}

    >
      {/* Studio Hero Header */}
      <div style={{ textAlign: 'center', maxWidth: '720px', marginBottom: '32px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '20px',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            marginBottom: '16px',
          }}
        >
          <span style={{ fontSize: '13px' }}>⚡</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Offline AI Teacher & Visual Generator
          </span>
        </div>

        <h1
          style={{
            margin: '0 0 12px 0',
            fontSize: '36px',
            fontWeight: 800,
            letterSpacing: '-0.025em',
            lineHeight: 1.2,
            background: 'linear-gradient(135deg, #ffffff 0%, #bae6fd 60%, #7dd3fc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Turn Tricky Concepts Into Interactive Visual Lessons
        </h1>
        <p style={{ margin: 0, fontSize: '15px', color: '#94a3b8', lineHeight: 1.6 }}>
          Generate step-by-step animated code walkthroughs, conceptual diagrams, and voice-narrated lessons with our offline AI mascot, Blu.
        </p>
      </div>

      {/* Main Studio Grid: Left Form + Right Blueprint Preview */}
      <div
        style={{
          width: '100%',
          maxWidth: '1040px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.45fr) minmax(300px, 1fr)',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Studio Form */}
        <div
          className="glass-panel"
          style={{
            borderRadius: '16px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.2) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8',
                  fontSize: '14px',
                }}
              >
                🪄
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
                  Lesson Parameters
                </h2>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Configure curriculum depth and narration</span>
              </div>
            </div>

            <span
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                fontWeight: 600,
              }}
            >
              Deterministic AI
            </span>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* 1. Topic Input & OCR Dropzone */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label
                  htmlFor="topic-input"
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#cbd5e1',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  1. Topic or Concept
                </label>

                {/* Quick OCR Trigger */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={ocrLoading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: ocrLoading ? 'rgba(56, 189, 248, 0.25)' : 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    color: '#38bdf8',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: ocrLoading ? 'wait' : 'pointer',
                  }}
                >
                  <span>📷</span>
                  <span>{ocrLoading ? 'Scanning...' : 'Scan Image OCR'}</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleOcrFile(file);
                      e.target.value = '';
                    }
                  }}
                />
              </div>

              {/* Main Topic Input Field */}
              <div style={{ position: 'relative' }}>
                <input
                  id="topic-input"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Python For Loops, Binary Search, Variables in Memory..."
                  style={{
                    width: '100%',
                    padding: '13px 16px',
                    borderRadius: '10px',
                    background: 'var(--input-bg, rgba(16, 32, 64, 0.88))',
                    border: '1px solid var(--input-border, rgba(148, 163, 184, 0.28))',
                    color: '#ffffff',
                    fontSize: '15px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'all 0.18s ease',
                  }}
                  required
                />
              </div>

              {/* Drag and Drop OCR Dropzone Box */}
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  marginTop: '10px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: isDragging ? '2px dashed #38bdf8' : '1px dashed var(--input-border, rgba(148, 163, 184, 0.28))',
                  background: isDragging ? 'rgba(56, 189, 248, 0.12)' : 'var(--input-bg, rgba(16, 32, 64, 0.5))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >

                <span style={{ fontSize: '18px' }}>📄</span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {isDragging ? 'Drop image here to scan' : 'Drag & drop study notes or code screenshot to extract topic'}
                </span>
              </div>

              {/* OCR Scanned Result Pill */}
              {ocrPreview && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8' }}>OCR Extracted:</span>
                    <span style={{ fontSize: '12px', color: '#cbd5e1' }}>{ocrPreview.slice(0, 48)}...</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOcrPreview(null)}
                    style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '12px', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Topic Category Filter & Presets */}
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Quick Topics:</span>
                  {(['All', 'Python', 'DSA', 'Internals'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        background: categoryFilter === cat ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                        color: categoryFilter === cat ? '#38bdf8' : '#64748b',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {filteredPresets.map((preset) => (
                    <button
                      type="button"
                      key={preset.label}
                      onClick={() => {
                        setTopic(preset.topic);
                        setTargetLength(preset.sec);
                        setLevel(preset.level);
                      }}
                      style={{
                        background: topic === preset.topic ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                        border: topic === preset.topic ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                        color: topic === preset.topic ? '#38bdf8' : '#94a3b8',
                        padding: '5px 11px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Experience Level */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#cbd5e1',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '8px',
                }}
              >
                2. Student Experience Level
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  {
                    val: 'beginner' as Level,
                    title: 'Beginner',
                    badge: 'Foundations',
                    desc: 'Intuition-first, simple real-world analogies',
                    color: '#34d399',
                  },
                  {
                    val: 'intermediate' as Level,
                    title: 'Intermediate',
                    badge: 'Standard',
                    desc: 'Control flow, complexity, and common traps',
                    color: '#38bdf8',
                  },
                  {
                    val: 'advanced' as Level,
                    title: 'Advanced',
                    badge: 'Deep Dive',
                    desc: 'Memory pointers, internals, and Big-O bounds',
                    color: '#a78bfa',
                  },
                ].map((lvl) => {
                  const isSelected = level === lvl.val;
                  return (
                    <button
                      key={lvl.val}
                      type="button"
                      onClick={() => setLevel(lvl.val)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: isSelected ? 'rgba(30, 41, 59, 0.65)' : 'rgba(15, 23, 42, 0.4)',
                        border: isSelected ? `1.5px solid ${lvl.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                        color: '#f8fafc',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: isSelected ? lvl.color : '#e2e8f0' }}>
                          {lvl.title}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: isSelected ? `${lvl.color}22` : 'rgba(255,255,255,0.05)',
                            color: isSelected ? lvl.color : '#64748b',
                            fontWeight: 600,
                          }}
                        >
                          {lvl.badge}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.35 }}>
                        {lvl.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Duration Selector */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label
                  htmlFor="length-slider"
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#cbd5e1',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  3. Lesson Runtime Duration
                </label>
                <span
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '12px',
                    color: '#38bdf8',
                    fontWeight: 700,
                  }}
                >
                  {targetLength}s ({Math.floor(targetLength / 60)}m {targetLength % 60}s)
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {DURATION_PRESETS.map(({ sec, label, desc }) => {
                  const isSelected = targetLength === sec;
                  return (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setTargetLength(sec)}
                      style={{
                        padding: '10px 10px',
                        borderRadius: '8px',
                        background: isSelected ? 'rgba(56, 189, 248, 0.16)' : 'rgba(15, 23, 42, 0.4)',
                        border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                        color: isSelected ? '#38bdf8' : '#94a3b8',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>{label}</div>
                      <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Language & Voice Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label
                  htmlFor="language-select"
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#cbd5e1',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '6px',
                  }}
                >
                  4. Primary Language
                </label>
                <select
                  id="language-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 12px',
                    borderRadius: '8px',
                    background: 'rgba(9, 13, 22, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    color: '#f8fafc',
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                    <option key={code} value={code} style={{ background: '#090d16', color: '#ffffff' }}>
                      {label.name} ({label.nativeName}) — {code.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#cbd5e1',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '6px',
                  }}
                >
                  5. Narrator Persona
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { val: 'female' as const, label: 'Female', sub: 'Academic' },
                    { val: 'male' as const, label: 'Male', sub: 'Technical' },
                  ].map((v) => {
                    const isSelected = voiceGender === v.val;
                    return (
                      <button
                        key={v.val}
                        type="button"
                        onClick={() => handleVoiceChange(v.val)}
                        style={{
                          padding: '9px 10px',
                          borderRadius: '8px',
                          background: isSelected ? 'rgba(56, 189, 248, 0.16)' : 'rgba(15, 23, 42, 0.4)',
                          border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                          color: isSelected ? '#38bdf8' : '#94a3b8',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {v.label} ({v.sub})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#fca5a5',
                  fontSize: '13px',
                }}
              >
                {errorMessage}
              </div>
            )}

            {/* Primary Submit Button */}
            <button
              type="submit"
              id="btn-generate-lesson"
              className="btn-hover-lift"
              style={{
                width: '100%',
                padding: '15px 24px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 50%, #38bdf8 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 8px 24px rgba(2, 132, 199, 0.35)',
              }}
            >
              <span>✨</span>
              <span>Generate Interactive Visual Lesson ({targetLength}s)</span>
            </button>
          </form>
        </div>

        {/* Right Column: Live Lesson Blueprint Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Blueprint Card */}
          <div
            className="glass-panel"
            style={{
              borderRadius: '16px',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>📋</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>Lesson Blueprint</span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  color: '#38bdf8',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: 'rgba(56, 189, 248, 0.1)',
                  fontWeight: 600,
                }}
              >
                Live Preview
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Topic Concept</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', textAlign: 'right', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {topic.trim() || 'Custom Prompt'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Target Runtime</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
                  {targetLength} seconds
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Target Scenes</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>
                  {targetLength <= 45 ? '3-4 Scenes' : targetLength <= 90 ? '4-5 Scenes' : '5-6 Scenes'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Interactive Checkpoint</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#34d399' }}>
                  Interactive Quiz Scene
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Mascot Expression</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#fbbf24' }}>
                  Blu (Phoneme Lip-Sync)
                </span>
              </div>
            </div>

            {/* Quick Track Switcher & Library Links */}
            {(onOpenStudyPlan || onOpenLibrary) && (
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {onOpenStudyPlan && (
                  <button
                    type="button"
                    onClick={onOpenStudyPlan}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#cbd5e1',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>🗺️</span>
                    <span>Select from Curated Study Tracks</span>
                  </button>
                )}
                {onOpenLibrary && (
                  <button
                    type="button"
                    onClick={onOpenLibrary}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(56, 189, 248, 0.06)',
                      border: '1px solid rgba(56, 189, 248, 0.2)',
                      color: '#38bdf8',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>📚</span>
                    <span>Browse Saved Lessons Library</span>
                  </button>
                )}
              </div>
            )}

          </div>

          {/* Offline Capability Card */}
          <div
            className="glass-panel"
            style={{
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(15, 23, 42, 0.4) 100%)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '16px' }}>🛡️</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#34d399' }}>100% Offline Resilience</span>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
              All typography (@fontsource), mascots, TTS wavs, OCR engines, and deterministic lessons run locally without internet dependency.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
