import React, { useState } from 'react';
import type { Lesson, Level } from '../types/lesson';
import { validateLesson } from '../types/validate';
import { LANGUAGE_LABELS } from '../utils/fonts';

interface InputPageProps {
  onLessonReady: (lesson: Lesson, sourceBadge: string) => void;
}

const PRESET_TOPICS = [
  'Python For Loops',
  'Binary Search in Arrays',
  'Variables and Memory',
  'Recursion and Call Stacks',
];

export const InputPage: React.FC<InputPageProps> = ({ onLessonReady }) => {
  const [topic, setTopic] = useState('Python For Loops');
  const [level, setLevel] = useState<Level>('beginner');
  const [language, setLanguage] = useState('en');
  const [targetLength, setTargetLength] = useState(45);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchSampleLesson = async (langCode: string): Promise<Lesson> => {
    // Attempt requested language sample
    try {
      const res = await fetch(`/sample/lesson_${langCode}.json`);
      if (res.ok) {
        const data = await res.json();
        const validation = validateLesson(data);
        if (validation.ok && validation.lesson) {
          return validation.lesson;
        }
      }
    } catch {
      // ignore and try English fallback
    }

    // Fallback to English sample
    const enRes = await fetch('/sample/lesson_en.json');
    const enData = await enRes.json();
    const enValidation = validateLesson(enData);
    if (!enValidation.ok || !enValidation.lesson) {
      throw new Error(`Failed to load English fallback: ${(enValidation.errors || []).join(', ')}`);
    }
    return enValidation.lesson;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setStatusMessage('Contacting lesson generation backend...');

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout for quick fallback

      const res = await fetch(`${apiUrl}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          level,
          language,
          target_length_seconds: targetLength,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const validation = validateLesson(data);
        if (validation.ok && validation.lesson) {
          onLessonReady(validation.lesson, 'Backend API');
          return;
        }
      }
      throw new Error('Backend response invalid or unavailable');
    } catch (err) {
      // Backend not running or call failed -> graceful offline fallback to sample
      setStatusMessage(`Loading offline verified sample for [${language.toUpperCase()}]...`);
      try {
        const fallbackLesson = await fetchSampleLesson(language);
        onLessonReady(fallbackLesson, `Offline Mode (${language.toUpperCase()})`);
      } catch (fallbackErr) {
        setStatusMessage(`Error: ${(fallbackErr as Error).message}`);
        setLoading(false);
      }
    }
  };

  const handleDirectSample = async (sampleLang: string) => {
    setLoading(true);
    setStatusMessage(`Loading ${sampleLang.toUpperCase()} lesson...`);
    try {
      const lesson = await fetchSampleLesson(sampleLang);
      onLessonReady(lesson, `Sample (${sampleLang.toUpperCase()})`);
    } catch (err) {
      setStatusMessage(`Failed to load sample: ${(err as Error).message}`);
      setLoading(false);
    }
  };

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
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px', maxWidth: '640px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '9999px',
            background: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#38bdf8',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '14px',
          }}
        >
          <span style={{ fontSize: '15px' }}>⚡</span> Offline Visual Teacher
        </div>

        <h1
          style={{
            margin: '0 0 10px 0',
            fontSize: '40px',
            fontWeight: 800,
            letterSpacing: '-0.025em',
            background: 'linear-gradient(135deg, #ffffff 30%, #93c5fd 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Blu Visual Teacher
        </h1>

        <p style={{ margin: 0, fontSize: '16px', color: '#94a3b8', lineHeight: 1.5 }}>
          Transform coding and conceptual lessons into animated, narrated visual walkthroughs.
          100% offline-ready with regional Indian typography.
        </p>
      </div>

      {/* Main Generator Form Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '580px',
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '20px',
          padding: '32px',
          boxSizing: 'border-box',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(56, 189, 248, 0.1)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
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
              placeholder="e.g. Python For Loops, Binary Search"
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
                Narration Language
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
                {Object.entries(LANGUAGE_LABELS).map(([code, item]) => (
                  <option key={code} value={code}>
                    {item.name} ({item.nativeName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Length Slider */}
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
                Target Length
              </label>
              <span
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '13px',
                  color: '#38bdf8',
                  fontWeight: 700,
                }}
              >
                {targetLength} seconds
              </span>
            </div>
            <input
              id="length-slider"
              type="range"
              min={30}
              max={90}
              step={5}
              value={targetLength}
              onChange={(e) => setTargetLength(Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#38bdf8',
                cursor: 'pointer',
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: '#64748b',
                fontSize: '12px',
                marginTop: '4px',
              }}
            >
              <span>30s (Quick Overview)</span>
              <span>60s (Standard)</span>
              <span>90s (In-depth)</span>
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(2, 132, 199, 0.15)',
                border: '1px solid rgba(2, 132, 199, 0.3)',
                color: '#38bdf8',
                fontSize: '13px',
                textAlign: 'center',
              }}
            >
              {statusMessage}
            </div>
          )}

          {/* Submit Button */}
          <button
            id="btn-generate"
            type="submit"
            disabled={loading}
            style={{
              padding: '14px 24px',
              borderRadius: '12px',
              background: loading
                ? '#1e293b'
                : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              border: '1px solid #38bdf8',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 0 25px rgba(2, 132, 199, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            {loading ? (
              <span>Preparing Lesson...</span>
            ) : (
              <>
                <span>Generate Animated Lesson</span>
                <span>✨</span>
              </>
            )}
          </button>
        </form>

        {/* Instant Offline Quick Launch Presets */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #1e293b' }}>
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
