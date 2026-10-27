import React, { useState, useEffect } from 'react';
import type { Lesson, Level } from '../types/lesson';
import { LANGUAGE_LABELS } from '../utils/fonts';
import { fetchLessonWithTiming } from '../utils/loader';
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
  'Object Oriented Architecture',
];

const DURATION_PRESETS = [
  { sec: 45, label: '⚡ 45s (Fast)', desc: 'Quick recap & quiz' },
  { sec: 90, label: '🎬 90s (Standard)', desc: 'Core logic & cuts' },
  { sec: 105, label: '🎯 1:45 min (In-Depth)', desc: 'Trace & edge case' },
  { sec: 120, label: '🎥 2:00 min (Deep Dive)', desc: 'Full 6 scenes masterclass' },
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
  const [localContext, setLocalContext] = useState(true);
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

  const fetchSampleLesson = async (langCode: string): Promise<Lesson> => {
    return await fetchLessonWithTiming(langCode);
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

      // Automatically archive into topic library
      saveToLibrary(generatedLesson, targetLength);

      onLessonReady(generatedLesson, `Blackboard Lesson (${level.toUpperCase()})`);
    } catch (err) {
      console.error('Generation failed:', err);
      setErrorMessage(`Generation failed: ${(err as Error).message}. You can retry or check local server.`);
      setLoading(false);
    }
  };

  const handleDirectSample = async (sampleLang: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const lesson = await fetchSampleLesson(sampleLang);
      onLessonReady(lesson, `Sample (${sampleLang.toUpperCase()})`);
    } catch (err) {
      setErrorMessage(`Failed to load sample: ${(err as Error).message}`);
      setLoading(false);
    }
  };

  if (loading) {
    return <GeneratingLoader topic={topic || 'Visual Lesson'} targetSeconds={targetLength} />;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '36px 18px 48px',
        boxSizing: 'border-box',
        background: 'radial-gradient(ellipse at 50% 15%, #142018 0%, #0d1711 50%, #060b08 100%)',
        color: '#f8fafc',
        fontFamily: '"Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {/* Ambient chalkboard glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(134, 239, 172, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Header Navigation Bar */}
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          zIndex: 2,
        }}
      >
        <div style={{ display: 'flex', gap: '10px' }}>
          {onOpenStudyPlan && (
            <button
              type="button"
              onClick={onOpenStudyPlan}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'rgba(254, 240, 138, 0.1)',
                border: '1px dashed rgba(254, 240, 138, 0.4)',
                color: '#fef08a',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
              title="Open structured student study plan"
            >
              <span>📋</span>
              <span>Study Curriculum Plan</span>
            </button>
          )}

          {onOpenLibrary && (
            <button
              type="button"
              onClick={onOpenLibrary}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'rgba(125, 211, 252, 0.1)',
                border: '1px dashed rgba(125, 211, 252, 0.35)',
                color: '#7dd3fc',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
            >
              <span>📁</span>
              <span>Saved Lessons</span>
            </button>
          )}
        </div>

        <div
          style={{
            fontFamily: '"Kalam", cursive',
            color: '#a7f3d0',
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>✏️</span> Chalkboard Learning Studio
        </div>
      </div>

      {/* Main Wooden Blackboard Frame */}
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          border: '10px solid #2e1c0c',
          borderRadius: '16px',
          background: '#0e1812',
          boxShadow: 'inset 0 0 50px rgba(0, 0, 0, 0.9), 0 25px 60px rgba(0, 0, 0, 0.9), 0 0 0 2px #452a14',
          position: 'relative',
          boxSizing: 'border-box',
          zIndex: 2,
        }}
      >
        {/* Chalkboard Slate Canvas Inner */}
        <div
          style={{
            padding: '32px 28px 24px',
            background: 'radial-gradient(circle at 50% 25%, #132017 0%, #0c1610 70%, #070d09 100%)',
            boxSizing: 'border-box',
          }}
        >
          {/* Blackboard Title & Badge */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div
              style={{
                display: 'inline-block',
                border: '1.5px dashed rgba(254, 240, 138, 0.5)',
                borderRadius: '20px',
                padding: '4px 14px',
                color: '#fef08a',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '10px',
              }}
            >
              Classroom Lesson Studio
            </div>

            <h1
              style={{
                margin: '0 0 8px 0',
                fontFamily: '"Kalam", cursive',
                fontSize: '34px',
                fontWeight: 700,
                color: '#f8fafc',
                letterSpacing: '0.02em',
                textShadow: '0 0 15px rgba(255, 255, 255, 0.25)',
              }}
            >
              What would you like to master today?
            </h1>

            <p style={{ margin: 0, fontSize: '14px', color: '#86efac', fontFamily: '"Kalam", cursive' }}>
              Personalize your visual teacher, language preference, and depth below ~
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* 1. Topic Input */}
            <div>
              <label
                htmlFor="topic-input"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#fef08a',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <span>📝</span> 1. Lesson Concept or Topic
              </label>

              <input
                id="topic-input"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Binary Search in Arrays, Python Loops, Recursion..."
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: 'rgba(5, 10, 7, 0.85)',
                  border: '1.5px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)',
                  transition: 'border-color 0.2s',
                }}
                required
              />

              {/* Preset Chalk Chips */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                <span style={{ fontSize: '11px', color: '#6ee7b7', alignSelf: 'center', marginRight: '4px' }}>
                  Popular Chalk Topics:
                </span>
                {PRESET_TOPICS.map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => setTopic(preset)}
                    style={{
                      background: topic === preset ? 'rgba(254, 240, 138, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: topic === preset ? '1px solid #fef08a' : '1px dashed rgba(255, 255, 255, 0.2)',
                      color: topic === preset ? '#fef08a' : '#cbd5e1',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Experience Level (Beginner / Intermediate / Advanced) */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#fef08a',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <span>🎓</span> 2. Student Experience Level
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  {
                    val: 'beginner' as Level,
                    title: 'Beginner',
                    icon: '🌱',
                    desc: 'Intuition-first, everyday analogies, simple syntax (≤3 lines)',
                    badgeColor: '#86efac',
                  },
                  {
                    val: 'intermediate' as Level,
                    title: 'Intermediate',
                    icon: '⚡',
                    desc: 'Real patterns, control flow, edge cases, standard library',
                    badgeColor: '#fef08a',
                  },
                  {
                    val: 'advanced' as Level,
                    title: 'Advanced',
                    icon: '🚀',
                    desc: 'CPython internals, memory layout, Big-O limits, production code',
                    badgeColor: '#c084fc',
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
                        background: isSelected ? 'rgba(255, 255, 255, 0.1)' : 'rgba(5, 10, 7, 0.65)',
                        border: isSelected ? `2px solid ${lvl.badgeColor}` : '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#f8fafc',
                        cursor: 'pointer',
                        textAlign: 'left',
                        boxShadow: isSelected ? `0 0 15px ${lvl.badgeColor}33` : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 800, fontSize: '14px', color: lvl.badgeColor }}>
                          {lvl.icon} {lvl.title}
                        </span>
                        {isSelected && <span style={{ fontSize: '11px', color: lvl.badgeColor }}>✓ Active</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.35 }}>
                        {lvl.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Voice Gender & Persona */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#fef08a',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <span>🎙️</span> 3. Teacher Voice Persona
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {[
                  {
                    val: 'female' as const,
                    title: 'Female Voice (Blu Academic Guide)',
                    desc: 'Clear, articulate, high-intelligibility pedagogical tone',
                    icon: '👩',
                  },
                  {
                    val: 'male' as const,
                    title: 'Male Voice (Instructor Persona)',
                    desc: 'Deep, steady, technical explainer cadence',
                    icon: '👨',
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
                        borderRadius: '10px',
                        background: isSelected ? 'rgba(56, 189, 248, 0.14)' : 'rgba(5, 10, 7, 0.65)',
                        border: isSelected ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#f8fafc',
                        cursor: 'pointer',
                        textAlign: 'left',
                        boxShadow: isSelected ? '0 0 15px rgba(56, 189, 248, 0.25)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: isSelected ? '#38bdf8' : '#e2e8f0' }}>
                          {v.icon} {v.title}
                        </span>
                        {isSelected && <span style={{ fontSize: '11px', color: '#38bdf8' }}>✓ Selected</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.3 }}>
                        {v.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Preferred Languages (Primary & Background Multi-Select) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#fef08a',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  <span>🌐</span> 4. Preferred Languages
                </label>
                <span style={{ fontSize: '11px', color: '#6ee7b7' }}>
                  Primary starts immediately · Others available to switch
                </span>
              </div>

              {/* Primary Language Select Dropdown */}
              <div style={{ marginBottom: '10px' }}>
                <select
                  id="language-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(5, 10, 7, 0.85)',
                    border: '1.5px solid rgba(56, 189, 248, 0.45)',
                    color: '#38bdf8',
                    fontSize: '14px',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                  }}
                >
                  {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                    <option key={code} value={code} style={{ background: '#090d16', color: '#ffffff' }}>
                      Primary: {label.flag} {label.name} ({label.nativeName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Language Tiles Multi-Select */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
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
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: isPrimary
                          ? 'rgba(56, 189, 248, 0.2)'
                          : isChecked
                          ? 'rgba(255, 255, 255, 0.08)'
                          : 'rgba(5, 10, 7, 0.5)',
                        border: isPrimary
                          ? '1.5px solid #38bdf8'
                          : isChecked
                          ? '1px dashed rgba(255, 255, 255, 0.35)'
                          : '1px solid rgba(255, 255, 255, 0.1)',
                        color: isPrimary ? '#38bdf8' : isChecked ? '#e2e8f0' : '#64748b',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{label.flag} {label.name}</span>
                      {isPrimary && <span style={{ fontSize: '10px', color: '#38bdf8' }}>★ Main</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Video Generation Duration Slider & Presets */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label
                  htmlFor="length-slider"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#fef08a',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  <span>⏱️</span> 5. Lesson Duration & Depth
                </label>
                <span
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '13px',
                    color: '#7dd3fc',
                    fontWeight: 700,
                  }}
                >
                  {targetLength} seconds (~{Math.floor(targetLength / 60)}m {targetLength % 60}s)
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
                        borderRadius: '8px',
                        background: isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(5, 10, 7, 0.65)',
                        border: isSelected ? '1.5px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.15)',
                        color: isSelected ? '#38bdf8' : '#cbd5e1',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: '2px' }}>{label}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#fca5a5',
                  fontSize: '13px',
                }}
              >
                ⚠️ {errorMessage}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
              <button
                type="submit"
                id="btn-generate-lesson"
                style={{
                  flex: 2,
                  padding: '16px 24px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  border: '1.5px solid #34d399',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 0 25px rgba(52, 211, 153, 0.35)',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.02em',
                }}
              >
                <span style={{ fontSize: '18px' }}>🚀</span>
                <span>Generate Blackboard Lesson ({level.toUpperCase()})</span>
              </button>

              {onOpenStudyPlan && (
                <button
                  type="button"
                  onClick={onOpenStudyPlan}
                  style={{
                    flex: 1,
                    padding: '16px 18px',
                    borderRadius: '12px',
                    background: 'rgba(254, 240, 138, 0.12)',
                    border: '1.5px dashed rgba(254, 240, 138, 0.5)',
                    color: '#fef08a',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                  }}
                  title="Generate structured student study plan"
                >
                  <span>📋</span>
                  <span>Create Plan</span>
                </button>
              )}
            </div>
          </form>

          {/* Chalk Divider */}
          <div
            style={{
              margin: '28px 0 20px',
              borderBottom: '2px dashed rgba(255, 255, 255, 0.15)',
            }}
          />

          {/* Instant Offline Showcase */}
          <div>
            <div
              style={{
                fontFamily: '"Kalam", cursive',
                fontSize: '14px',
                color: '#86efac',
                marginBottom: '10px',
                textAlign: 'center',
                letterSpacing: '0.03em',
              }}
            >
              ✨ Instant Zero-Wait Offline Chalkboard Showcase:
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))', gap: '8px' }}>
              {[
                { code: 'en', flag: '🇬🇧', label: 'English' },
                { code: 'hi', flag: '🇮🇳', label: 'हिन्दी' },
                { code: 'kn', flag: '🇮🇳', label: 'ಕನ್ನಡ' },
                { code: 'ta', flag: '🇮🇳', label: 'தமிழ்' },
                { code: 'te', flag: '🇮🇳', label: 'తెలుగు' },
                { code: 'bn', flag: '🇮🇳', label: 'বাংলা' },
                { code: 'mr', flag: '🇮🇳', label: 'मराठी' },
              ].map((s) => (
                <button
                  key={s.code}
                  type="button"
                  id={`btn-sample-${s.code}`}
                  onClick={() => handleDirectSample(s.code)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#93c5fd',
                    padding: '8px 6px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                  title={`Play instant offline sample in ${s.label}`}
                >
                  <span>{s.flag}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chalkboard Wooden Ledge / Chalk Tray at Bottom */}
        <div
          style={{
            height: '16px',
            background: 'linear-gradient(to bottom, #3d2512 0%, #201309 100%)',
            borderTop: '2px solid #54341b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          {/* Subtle chalk stick icons on ledge */}
          <span style={{ fontSize: '10px', opacity: 0.6 }}>🖍️ 🖍️ 🖍️</span>
        </div>
      </div>
    </div>
  );
};
