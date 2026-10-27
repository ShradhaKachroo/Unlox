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
];

export const InputPage: React.FC<InputPageProps> = ({
  onLessonReady,
  onOpenLibrary,
  onOpenStudyPlan,
  initialTopic = '',
  initialDuration = 45,
}) => {
  const { settings } = useSettings();
  const [topic, setTopic] = useState(initialTopic);
  const [level, setLevel] = useState<Level>('beginner');
  const [language, setLanguage] = useState('en');
  const [targetLength, setTargetLength] = useState(initialDuration);
  const [localContext, setLocalContext] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialTopic) setTopic(initialTopic);
    if (initialDuration) setTargetLength(initialDuration);
  }, [initialTopic, initialDuration]);

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
        target_length_seconds: targetLength,
        voice: settings.voice,
        local_context: localContext,
      });

      // Automatically archive into topic library
      saveToLibrary(generatedLesson, targetLength);

      onLessonReady(generatedLesson, 'Generated Lesson');
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

  // If generating, show the interactive GeneratingLoader with jokes and trivia
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
        justifyContent: 'center',
        padding: '30px 20px',
        boxSizing: 'border-box',
        background: 'radial-gradient(ellipse at 50% 10%, #0c1836 0%, #050813 70%, #020409 100%)',
        color: '#f8fafc',
        fontFamily: '"Noto Sans", sans-serif',
      }}
    >
      {/* Top Action Bar */}
      <div
        style={{
          width: '100%',
          maxWidth: '620px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', gap: '10px' }}>
          {onOpenStudyPlan && (
            <button
              type="button"
              onClick={onOpenStudyPlan}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.18)',
                border: '1px solid rgba(129, 140, 248, 0.4)',
                color: '#a5b4fc',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>🗺️</span> Study Plan
            </button>
          )}

          {onOpenLibrary && (
            <button
              type="button"
              onClick={onOpenLibrary}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                color: '#38bdf8',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>📚</span> Video Library
            </button>
          )}
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '9999px',
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            color: '#4ade80',
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          <span>●</span> 100% Offline Engine
        </div>
      </div>

      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px', maxWidth: '640px' }}>
        <h1
          style={{
            margin: '0 0 8px 0',
            fontSize: '38px',
            fontWeight: 800,
            letterSpacing: '-0.025em',
            background: 'linear-gradient(135deg, #ffffff 30%, #93c5fd 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Blu Visual Teacher
        </h1>

        <p style={{ margin: 0, fontSize: '15px', color: '#94a3b8', lineHeight: 1.5 }}>
          Turn any coding concept into an animated visual lesson with step-by-step cuts and MCQ quiz.
        </p>
      </div>

      {/* Main Generator Form Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '580px',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '20px',
          padding: '30px',
          boxSizing: 'border-box',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(56, 189, 248, 0.1)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Topic Input */}
          <div>
            <label
              htmlFor="topic-input"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 700,
                color: '#e2e8f0',
                marginBottom: '8px',
              }}
            >
              Lesson Topic
            </label>
            <input
              id="topic-input"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Binary Search in Arrays, Recursion, Python Dictionaries..."
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                background: '#090d16',
                border: '1px solid #334155',
                color: '#f8fafc',
                fontSize: '15px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
              required
            />

            {/* Quick Topic Presets */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
              {PRESET_TOPICS.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setTopic(preset)}
                  style={{
                    background: topic === preset ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                    border: topic === preset ? '1px solid #38bdf8' : '1px solid rgba(71, 85, 105, 0.4)',
                    color: topic === preset ? '#38bdf8' : '#94a3b8',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Level Selection & Language Selection (Row) */}
          <div style={{ display: 'flex', gap: '16px' }}>
            {/* Level Select */}
            <div style={{ flex: 1 }}>
              <label
                htmlFor="level-select"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#e2e8f0',
                  marginBottom: '8px',
                }}
              >
                Difficulty Level
              </label>
              <select
                id="level-select"
                value={level}
                onChange={(e) => setLevel(e.target.value as Level)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: '#090d16',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
              </select>
            </div>

            {/* Language Select */}
            <div style={{ flex: 1 }}>
              <label
                htmlFor="language-select"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#e2e8f0',
                  marginBottom: '8px',
                }}
              >
                Voice Language
              </label>
              <select
                id="language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: '#090d16',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              >
                {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label.name} ({label.nativeName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Length Slider & 2-Minute Mode */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label
                htmlFor="length-slider"
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#e2e8f0',
                }}
              >
                Video Duration & Visual Rhythm
              </label>
              <span
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '13px',
                  color: '#38bdf8',
                  fontWeight: 700,
                }}
              >
                {targetLength} seconds {targetLength >= 100 ? '(2 min deep dive)' : '(rapid cuts)'}
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
              }}
            />

            {/* Duration Presets */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              {[
                { sec: 45, label: '⚡ 45s (5 Cuts)' },
                { sec: 60, label: '⏱️ 60s (6 Cuts)' },
                { sec: 120, label: '🎬 2 Min (8-10 Cuts + MCQ)' },
              ].map(({ sec, label }) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setTargetLength(sec)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: '6px',
                    background: targetLength === sec ? 'rgba(56, 189, 248, 0.25)' : 'rgba(30, 41, 59, 0.6)',
                    border: targetLength === sec ? '1px solid #38bdf8' : '1px solid #334155',
                    color: targetLength === sec ? '#38bdf8' : '#94a3b8',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Local Context Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
            }}
          >
            <input
              id="toggle-local-context"
              type="checkbox"
              checked={localContext}
              onChange={(e) => setLocalContext(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                accentColor: '#38bdf8',
                cursor: 'pointer',
              }}
            />
            <label
              htmlFor="toggle-local-context"
              style={{
                cursor: 'pointer',
                fontSize: '14px',
                color: '#e2e8f0',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <span style={{ fontWeight: 600 }}>Use relatable Indian examples (cricket, chai, trains)</span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                Grounds abstract programming concepts in familiar cultural contexts
              </span>
            </label>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '13px',
                textAlign: 'center',
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* Generate Button */}
          <button
            id="btn-generate"
            type="submit"
            disabled={loading}
            style={{
              padding: '14px 24px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              border: '1px solid #38bdf8',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 0 25px rgba(2, 132, 199, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            <span>Generate Animated Lesson</span>
            <span>✨</span>
          </button>
        </form>

        {/* Offline Quick Launch Presets */}
        <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #1e293b' }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '10px',
              textAlign: 'center',
            }}
          >
            Instant Offline Sample Showcase
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button
              type="button"
              id="btn-sample-en"
              onClick={() => handleDirectSample('en')}
              style={{
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid #334155',
                color: '#93c5fd',
                padding: '8px 10px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🇬🇧 English
            </button>
            <button
              type="button"
              id="btn-sample-hi"
              onClick={() => handleDirectSample('hi')}
              style={{
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid #334155',
                color: '#93c5fd',
                padding: '8px 10px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🇮🇳 हिन्दी
            </button>
            <button
              type="button"
              id="btn-sample-kn"
              onClick={() => handleDirectSample('kn')}
              style={{
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid #334155',
                color: '#93c5fd',
                padding: '8px 10px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🇮🇳 ಕನ್ನಡ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
