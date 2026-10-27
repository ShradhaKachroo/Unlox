import React, { useState, useEffect } from 'react';
import type { Lesson, Level } from '../types/lesson';
import { LANGUAGE_LABELS } from '../utils/fonts';
import { useSettings } from '../context/useSettings';
import { apiGenerateLesson } from '../api/lessonApi';
import { GeneratingLoader } from '../components/GeneratingLoader';
import { saveToLibrary } from '../utils/library';

interface InputPageProps {
  onLessonReady: (lesson: Lesson, sourceBadge: string) => void;
  onOpenLibrary?: () => void;
  onOpenStudyPlan?: () => void;
  initialTopic?: string;
  initialDuration?: number;
}

const PRESET_TOPICS = [
  'Python For Loops',
  'Binary Search in Arrays',
  'Variables and Memory',
  'Recursion and Call Stacks',
  'Object-Oriented Architecture',
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
  initialDuration = 120,
}) => {
  const { settings, setVoice } = useSettings();
  const [topic, setTopic] = useState(initialTopic);
  const [level, setLevel] = useState<Level>('beginner');
  const [language, setLanguage] = useState('en');
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>(settings.voice || 'female');
  const [targetLength, setTargetLength] = useState(initialDuration);
  const [localContext] = useState(true);
  const [preferredLanguages, setPreferredLanguages] = useState<string[]>(['en', 'hi', 'kn']);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialTopic) setTopic(initialTopic);
    if (initialDuration) setTargetLength(initialDuration);
  }, [initialTopic, initialDuration]);

  const handleVoiceChange = (gender: 'female' | 'male') => {
    setVoiceGender(gender);
    setVoice(gender);
  };

  const togglePreferredLanguage = (langCode: string) => {
    setPreferredLanguages((prev) =>
      prev.includes(langCode) ? prev.filter((c) => c !== langCode) : [...prev, langCode]
    );
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
      onLessonReady(generatedLesson, `Blackboard Lesson (${level.toUpperCase()})`);
    } catch (err) {
      console.error('Generation failed:', err);
      setErrorMessage(`Generation failed: ${(err as Error).message}. Please ensure the backend is running.`);
      setLoading(false);
    }
  };

  if (loading) {
    return <GeneratingLoader topic={topic || 'Lesson'} targetSeconds={targetLength} />;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '36px 20px 60px',
        boxSizing: 'border-box',
        background: '#090d0b',
        color: '#f1f5f9',
        fontFamily: '"Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Top Bar Navigation */}
      <div
        style={{
          width: '100%',
          maxWidth: '760px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontFamily: '"Kalam", cursive',
              fontSize: '18px',
              color: '#a7f3d0',
              fontWeight: 700,
              letterSpacing: '0.02em',
            }}
          >
            Chalkboard Studio
          </span>
          <span
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '2px 8px',
              borderRadius: '4px',
              background: 'rgba(52, 211, 153, 0.1)',
              color: '#34d399',
              border: '1px solid rgba(52, 211, 153, 0.25)',
              fontWeight: 600,
            }}
          >
            Visual Learning
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {onOpenStudyPlan && (
            <button
              type="button"
              onClick={onOpenStudyPlan}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#e2e8f0',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span>Study Curriculum</span>
            </button>
          )}

          {onOpenLibrary && (
            <button
              type="button"
              onClick={onOpenLibrary}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#e2e8f0',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span>Saved Lessons</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Studio Blackboard Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '760px',
          borderRadius: '12px',
          background: '#0d1511',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Subtle Slate Top Header */}
        <div
          style={{
            padding: '24px 28px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
            background: 'linear-gradient(180deg, #121e18 0%, #0d1511 100%)',
          }}
        >
          <h1
            style={{
              margin: '0 0 6px 0',
              fontFamily: '"Outfit", sans-serif',
              fontSize: '24px',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.01em',
            }}
          >
            Create Visual Lesson
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
            Customize your subject matter, student depth, voice persona, and generation runtime.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* 1. Topic Input */}
          <div>
            <label
              htmlFor="topic-input"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#cbd5e1',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '8px',
              }}
            >
              1. Lesson Topic or Concept
            </label>

            <input
              id="topic-input"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Binary Search in Arrays, Python For Loops, Recursion..."
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                background: '#070b09',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontSize: '15px',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.15s ease',
              }}
              required
            />

            {/* Quick Suggestion Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', alignSelf: 'center', marginRight: '4px' }}>
                Suggestions:
              </span>
              {PRESET_TOPICS.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setTopic(preset)}
                  style={{
                    background: topic === preset ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border: topic === preset ? '1px solid #34d399' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: topic === preset ? '#34d399' : '#94a3b8',
                    padding: '4px 10px',
                    borderRadius: '5px',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Experience Level */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
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
                  desc: 'Intuition-first, everyday analogies, concise snippets (≤3 lines)',
                  color: '#34d399',
                },
                {
                  val: 'intermediate' as Level,
                  title: 'Intermediate',
                  badge: 'Standard',
                  desc: 'Control flow, standard algorithms, complexity, and common traps',
                  color: '#38bdf8',
                },
                {
                  val: 'advanced' as Level,
                  title: 'Advanced',
                  badge: 'Deep Dive',
                  desc: 'CPython internals, memory addresses, concurrency, and Big-O limits',
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
                      borderRadius: '8px',
                      background: isSelected ? 'rgba(255, 255, 255, 0.06)' : '#070b09',
                      border: isSelected ? `1.5px solid ${lvl.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#f8fafc',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: isSelected ? lvl.color : '#e2e8f0' }}>
                        {lvl.title}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 6px',
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

          {/* 3. Teacher Voice Persona */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#cbd5e1',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '8px',
              }}
            >
              3. Voice Persona
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {[
                {
                  val: 'female' as const,
                  title: 'Female Voice',
                  sub: 'Academic Guide',
                  desc: 'Clear, articulate pedagogical tone optimized for conceptual comprehension',
                },
                {
                  val: 'male' as const,
                  title: 'Male Voice',
                  sub: 'Technical Explainer',
                  desc: 'Steady, focused cadence with emphasis on mechanics and implementation',
                },
              ].map((v) => {
                const isSelected = voiceGender === v.val;
                return (
                  <button
                    key={v.val}
                    type="button"
                    onClick={() => handleVoiceChange(v.val)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      background: isSelected ? 'rgba(56, 189, 248, 0.08)' : '#070b09',
                      border: isSelected ? '1.5px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#f8fafc',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isSelected ? '#38bdf8' : '#94a3b8'} strokeWidth="2">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                        </svg>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: isSelected ? '#38bdf8' : '#e2e8f0' }}>
                          {v.title}
                        </span>
                      </div>
                      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>{v.sub}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.3 }}>
                      {v.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Preferred Languages */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label
                htmlFor="language-select"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                4. Primary Language & Preferences
              </label>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Primary voice renders first
              </span>
            </div>

            {/* Primary Dropdown */}
            <div style={{ marginBottom: '8px' }}>
              <select
                id="language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 12px',
                  borderRadius: '8px',
                  background: '#070b09',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#f8fafc',
                  fontSize: '13px',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box',
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

            {/* Compact Preference Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {Object.entries(LANGUAGE_LABELS).map(([code, label]) => {
                const isPrimary = language === code;
                const isChecked = preferredLanguages.includes(code) || isPrimary;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setLanguage(code);
                      togglePreferredLanguage(code);
                    }}
                    style={{
                      padding: '5px 9px',
                      borderRadius: '6px',
                      background: isPrimary
                        ? 'rgba(56, 189, 248, 0.15)'
                        : isChecked
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'transparent',
                      border: isPrimary
                        ? '1px solid #38bdf8'
                        : isChecked
                        ? '1px solid rgba(255, 255, 255, 0.15)'
                        : '1px solid rgba(255, 255, 255, 0.06)',
                      color: isPrimary ? '#38bdf8' : isChecked ? '#cbd5e1' : '#64748b',
                      fontSize: '11px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    {label.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Video Generation Duration Slider & Presets */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label
                htmlFor="length-slider"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                5. Video Duration
              </label>
              <span
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '12px',
                  color: '#38bdf8',
                  fontWeight: 600,
                }}
              >
                {targetLength}s ({Math.floor(targetLength / 60)}m {targetLength % 60}s)
              </span>
            </div>

            <input
              id="length-slider"
              type="range"
              min={30}
              max={120}
              step={15}
              value={targetLength}
              onChange={(e) => setTargetLength(Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#38bdf8',
                cursor: 'pointer',
                marginBottom: '10px',
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {DURATION_PRESETS.map(({ sec, label, desc }) => {
                const isSelected = targetLength === sec;
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setTargetLength(sec)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: isSelected ? 'rgba(56, 189, 248, 0.15)' : '#070b09',
                      border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: isSelected ? '#38bdf8' : '#94a3b8',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{label}</div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                fontSize: '12px',
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button
              type="submit"
              id="btn-generate-lesson"
              style={{
                flex: 2,
                padding: '14px 20px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                border: '1px solid #10b981',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)',
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>Generate Lesson ({level.toUpperCase()})</span>
            </button>

            {onOpenStudyPlan && (
              <button
                type="button"
                onClick={onOpenStudyPlan}
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#e2e8f0',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>Curriculum Plan</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
