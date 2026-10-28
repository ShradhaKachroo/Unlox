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
  { label: 'Binary Search', topic: 'Binary Search in Arrays', category: 'DSA', sec: 90, level: 'beginner' },
  { label: 'Variables & Memory', topic: 'Variables and Memory in Python', category: 'Python', sec: 45, level: 'beginner' },
  { label: 'Recursion Stacks', topic: 'Recursion and Call Stacks', category: 'DSA', sec: 90, level: 'intermediate' },
  { label: 'AsyncIO & Event Loop', topic: 'AsyncIO and Event Loop Architecture', category: 'Internals', sec: 90, level: 'advanced' },
  { label: 'Bubble Sort Swapping', topic: 'Bubble Sort and Swapping Logic', category: 'DSA', sec: 90, level: 'beginner' },
];

const DURATION_PRESETS = [
  { sec: 45, label: '45s', desc: 'Fast (4 Slides)' },
  { sec: 90, label: '90s', desc: 'Standard (6 Slides)' },
  { sec: 120, label: '120s', desc: 'Detailed (7 Slides)' },
  { sec: 150, label: '150s', desc: 'In-Depth (8 Slides)' },
  { sec: 180, label: '180s', desc: 'Masterclass (9 Slides)' },
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
        color: 'var(--text-main, #0f172a)',
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
            background: 'rgba(2, 132, 199, 0.08)',
            border: '1px solid rgba(2, 132, 199, 0.22)',
            marginBottom: '16px',
          }}
        >
          <span style={{ fontSize: '13px' }}>⚡</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
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
            background: 'linear-gradient(135deg, #0f172a 0%, #0369a1 60%, #0284c7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Turn Tricky Concepts Into Interactive Visual Lessons
        </h1>
        <p style={{ margin: 0, fontSize: '15px', color: '#475569', lineHeight: 1.6 }}>
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
              borderBottom: '1px solid #e2e8f0',
              background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
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
                  background: 'rgba(2, 132, 199, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0284c7',
                  fontSize: '14px',
                }}
              >
                🪄
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
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
                background: '#ecfdf5',
                color: '#059669',
                border: '1px solid #a7f3d0',
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
                    color: '#334155',
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
                    background: ocrLoading ? 'rgba(2, 132, 199, 0.2)' : 'rgba(2, 132, 199, 0.08)',
                    border: '1px solid rgba(2, 132, 199, 0.3)',
                    color: '#0284c7',
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
                    background: 'var(--input-bg, #ffffff)',
                    border: '1px solid var(--input-border, #cbd5e1)',
                    color: 'var(--input-text, #0f172a)',
                    fontSize: '15px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'all 0.18s ease',
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
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
                  border: isDragging ? '2px dashed #0284c7' : '1px dashed #cbd5e1',
                  background: isDragging ? 'rgba(2, 132, 199, 0.08)' : '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >

                <span style={{ fontSize: '18px' }}>📄</span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
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
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7' }}>OCR Extracted:</span>
                    <span style={{ fontSize: '12px', color: '#1e293b' }}>{ocrPreview.slice(0, 48)}...</span>
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
                        background: categoryFilter === cat ? '#e0f2fe' : 'transparent',
                        color: categoryFilter === cat ? '#0284c7' : '#64748b',
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
                        background: topic === preset.topic ? '#e0f2fe' : '#ffffff',
                        border: topic === preset.topic ? '1px solid #0284c7' : '1px solid #e2e8f0',
                        color: topic === preset.topic ? '#0284c7' : '#475569',
                        padding: '5px 11px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
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
                  color: '#334155',
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
                    color: '#059669',
                  },
                  {
                    val: 'intermediate' as Level,
                    title: 'Intermediate',
                    badge: 'Standard',
                    desc: 'Control flow, complexity, and common traps',
                    color: '#0284c7',
                  },
                  {
                    val: 'advanced' as Level,
                    title: 'Advanced',
                    badge: 'Deep Dive',
                    desc: 'Memory pointers, internals, and Big-O bounds',
                    color: '#7c3aed',
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
                        background: isSelected ? '#ffffff' : '#f8fafc',
                        border: isSelected ? `2px solid ${lvl.color}` : '1px solid #e2e8f0',
                        color: '#0f172a',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 4px 12px rgba(15, 23, 42, 0.06)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: isSelected ? lvl.color : '#0f172a' }}>
                          {lvl.title}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: isSelected ? `${lvl.color}15` : '#f1f5f9',
                            color: isSelected ? lvl.color : '#64748b',
                            fontWeight: 600,
                          }}
                        >
                          {lvl.badge}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.35 }}>
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
                    color: '#334155',
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
                    color: '#0284c7',
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
                        background: isSelected ? '#e0f2fe' : '#ffffff',
                        border: isSelected ? '1px solid #0284c7' : '1px solid #e2e8f0',
                        color: isSelected ? '#0284c7' : '#475569',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.12s ease',
                        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
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
                    color: '#334155',
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
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                  }}
                >
                  {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                    <option key={code} value={code} style={{ background: '#ffffff', color: '#0f172a' }}>
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
                    color: '#334155',
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
                          background: isSelected ? '#e0f2fe' : '#ffffff',
                          border: isSelected ? '1px solid #0284c7' : '1px solid #e2e8f0',
                          color: isSelected ? '#0284c7' : '#475569',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
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
                background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 8px 24px rgba(2, 132, 199, 0.28)',
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
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Lesson Blueprint</span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  color: '#0284c7',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: '#e0f2fe',
                  border: '1px solid #bae6fd',
                  fontWeight: 600,
                }}
              >
                Live Preview
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Topic Concept</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', textAlign: 'right', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {topic.trim() || 'Custom Prompt'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Target Runtime</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7' }}>
                  {targetLength} seconds
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Target Scenes</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                  {targetLength <= 45 ? '3-4 Scenes' : targetLength <= 90 ? '4-5 Scenes' : '5-6 Scenes'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Interactive Checkpoint</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669' }}>
                  Interactive Quiz Scene
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Mascot Expression</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#d97706' }}>
                  Blu (Phoneme Lip-Sync)
                </span>
              </div>
            </div>

            {/* Quick Track Switcher & Library Links */}
            {(onOpenStudyPlan || onOpenLibrary) && (
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {onOpenStudyPlan && (
                  <button
                    type="button"
                    onClick={onOpenStudyPlan}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      color: '#334155',
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
                      background: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      color: '#0284c7',
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
              border: '1px solid #a7f3d0',
              background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '16px' }}>🛡️</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#065f46' }}>100% Offline Resilience</span>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#047857', lineHeight: 1.5 }}>
              All typography (@fontsource), mascots, TTS wavs, OCR engines, and deterministic lessons run locally without internet dependency.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
