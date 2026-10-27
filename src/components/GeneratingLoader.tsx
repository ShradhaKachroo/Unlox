import React, { useState, useEffect } from 'react';

const FACTS_AND_JOKES = [
  { emoji: '💡', text: 'Why do programmers prefer dark mode? Because light attracts bugs!' },
  { emoji: '🧠', text: 'Visual learning is processed 60,000x faster than plain text. You are about to learn in seconds what takes hours to read.' },
  { emoji: '🦗', text: 'The first computer bug was an actual moth trapped inside a Harvard Mark II relay in 1947.' },
  { emoji: '🏏', text: 'In Indian cricket analogy: variables are player scores, loops are overs, and conditions are the umpire decision!' },
  { emoji: '☕', text: 'Making chai is the ultimate algorithm: boil water -> steep tea -> add milk -> filter -> enjoy!' },
  { emoji: '🐍', text: 'Python is named after the comedy series Monty Python, not the reptile. It was made to make programming fun.' },
  { emoji: '🚀', text: 'The Apollo 11 moon mission guidance computer had only 4 KB of RAM. Your phone has 2 million times more memory.' },
  { emoji: '⚡', text: 'Local AI running on CPU: No internet required. 100% private, on-device intelligence.' },
  { emoji: '🎯', text: 'A programmer went to the grocery store: "Buy 1 carton of milk. If they have eggs, buy 12." They came back with 12 cartons of milk!' },
  { emoji: '🤖', text: 'Synthesizing voice with natural educator tone and calculating audio-visual cut timestamps...' },
];

interface GeneratingLoaderProps {
  topic: string;
  targetSeconds: number;
}

export const GeneratingLoader: React.FC<GeneratingLoaderProps> = ({ topic, targetSeconds }) => {
  const [factIdx, setFactIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    const factTimer = setInterval(() => {
      setFactIdx((prev) => (prev + 1) % FACTS_AND_JOKES.length);
    }, 4500);

    return () => {
      clearInterval(timer);
      clearInterval(factTimer);
    };
  }, []);

  const currentFact = FACTS_AND_JOKES[factIdx];
  const estTotal = targetSeconds >= 100 ? 55 : 35;
  const progressPct = Math.min(95, Math.round((elapsed / estTotal) * 100));

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
        background: 'radial-gradient(ellipse at 50% 15%, #0c1836 0%, #050813 70%, #020409 100%)',
        color: '#f8fafc',
        fontFamily: '"Noto Sans", sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '24px',
          padding: '36px 32px',
          boxSizing: 'border-box',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(56, 189, 248, 0.15)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Animated Mascot / Icon */}
        <div
          style={{
            width: '72px',
            height: '72px',
            margin: '0 auto 20px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            boxShadow: '0 0 25px rgba(56, 189, 248, 0.5)',
            animation: 'pulse 2s infinite',
          }}
        >
          ✨
        </div>

        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 800, color: '#ffffff' }}>
          Generating Video Lesson
        </h2>
        <p style={{ margin: '0 0 24px 0', fontSize: '15px', color: '#93c5fd', fontWeight: 600 }}>
          "{topic}"
        </p>

        {/* Progress Bar */}
        <div style={{ width: '100%', height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
          <div
            style={{
              width: `${progressPct}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #0284c7, #38bdf8, #818cf8)',
              transition: 'width 0.5s ease',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '28px' }}>
          <span>{elapsed}s elapsed</span>
          <span>{progressPct < 40 ? '1/3 Planning scenes' : progressPct < 80 ? '2/3 Generating voice' : '3/3 Finalizing cuts'}</span>
          <span>~{estTotal}s total</span>
        </div>

        {/* Rotating Jokes & Facts Card */}
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.6)',
            border: '1px solid rgba(71, 85, 105, 0.4)',
            borderRadius: '16px',
            padding: '20px',
            minHeight: '85px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '6px' }}>{currentFact.emoji}</div>
          <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5 }}>
            {currentFact.text}
          </p>
        </div>
      </div>
    </div>
  );
};
