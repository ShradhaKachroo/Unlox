import React, { useState, useEffect } from 'react';

interface GeneratingLoaderProps {
  topic: string;
  targetSeconds: number;
}

interface PipelineStage {
  step: string;
  title: string;
  icon: string;
  tag: string;
  color: string;
  bg: string;
  summary: string;
  detail: string;
  metrics: string;
}

const PIPELINE_STAGES: PipelineStage[] = [
  {
    step: '01',
    title: 'Pedagogical Planning',
    icon: '🧠',
    tag: 'Phi-3.5 Local LLM',
    color: '#0284c7',
    bg: 'rgba(2, 132, 199, 0.08)',
    summary: 'Designing Bloom taxonomy scenes & quiz concepts',
    detail: 'Phi-3.5 structures pedagogical scenes, grounded analogies, and meaningful conceptual items with zero cloud dependency.',
    metrics: '3.8B Parameters • 2048 Context • 100% On-Device',
  },
  {
    step: '02',
    title: 'Voiceover Synthesis',
    icon: '🎙️',
    tag: 'Kokoro 82M TTS',
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.08)',
    summary: 'Generating natural, expressive teacher voice',
    detail: 'Synthesizes studio-quality 24kHz audio with pedagogical pacing (0.85x speed), sentence pauses, and clear pronunciation.',
    metrics: '24kHz Studio Audio • Custom Female/Male Voices',
  },
  {
    step: '03',
    title: 'Audio-Visual Sync',
    icon: '⏱️',
    tag: 'Timing Alignment Engine',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.08)',
    summary: 'Aligning captions, timestamps & transitions',
    detail: 'Calculates exact audio duration for each scene, splits sentences into synchronized caption chunks, and locks scene transitions.',
    metrics: 'Sentence Word-Chunking • Sub-millisecond Accuracy',
  },
  {
    step: '04',
    title: '3D Canvas Staging',
    icon: '🎬',
    tag: 'Interactive Player',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.08)',
    summary: 'Preparing 60fps animations & Blu mascot cues',
    detail: 'Pre-renders dynamic perspective camera drifts, glowing diagram arrows, floating particles, and Blu\'s pointing coordinates.',
    metrics: '60fps Canvas • Hardware Accelerated • Responsive',
  },
];

interface TriviaItem {
  id: number;
  category: string;
  icon: string;
  question: string;
  answer: string;
  badge: string;
  color: string;
}

const TRIVIA_CARDS: TriviaItem[] = [
  {
    id: 1,
    category: 'Computer History',
    icon: '🦗',
    question: 'Where did the term "computer bug" actually originate?',
    answer: 'In 1947, Grace Hopper\'s team found a real moth trapped inside Relay #70 of the Harvard Mark II computer. They taped it into the logbook as "First actual case of bug being found"!',
    badge: 'Historical Fact',
    color: '#0284c7',
  },
  {
    id: 2,
    category: 'Cognitive Science',
    icon: '👁️',
    question: 'Why do animated diagrams make you learn so much faster?',
    answer: 'The human brain processes visual diagrams 60,000 times faster than text! Seeing synchronized movement while hearing narration boosts memory retention by over 400%.',
    badge: 'Neuroscience',
    color: '#8b5cf6',
  },
  {
    id: 3,
    category: 'Apollo 11 Feat',
    icon: '🚀',
    question: 'How much memory guided the 1969 Apollo 11 Moon landing?',
    answer: 'The Apollo Guidance Computer had just 4 KB of RAM and 72 KB of ROM! A modern basic smartphone has roughly 2 million times more memory than the computer that landed humans on the Moon.',
    badge: 'Space Tech',
    color: '#f59e0b',
  },
  {
    id: 4,
    category: 'Programming Lore',
    icon: '🐍',
    question: 'Is Python really named after the deadly snake?',
    answer: 'Nope! Guido van Rossum named Python after the British surreal comedy series "Monty Python\'s Flying Circus" because he wanted programming to be playful, readable, and joyful.',
    badge: 'Fun Lore',
    color: '#10b981',
  },
  {
    id: 5,
    category: 'Indian Analogies',
    icon: '☕',
    question: 'How is making Masala Chai the ultimate algorithmic loop?',
    answer: 'Boil water (setup) -> add tea & spices (input processing) -> steep for 3 mins (timer loop) -> add milk until golden (while condition) -> strain & enjoy (return output)!',
    badge: 'Everyday Logic',
    color: '#ec4899',
  },
  {
    id: 6,
    category: 'Coding Humor',
    icon: '🥛',
    question: 'Why did the programmer bring home 12 cartons of milk?',
    answer: 'His partner told him: "Buy a carton of milk, and if they have eggs, buy 12." They had eggs, so he faithfully bought 12 cartons of milk! Classic conditional logic trap.',
    badge: 'Developer Joke',
    color: '#06b6d4',
  },
];

const BLU_MESSAGES = [
  "Baking your visual lesson to perfection! 🍪",
  "Zero cloud servers harmed. 100% running right on your laptop! 💻",
  "Did you know? Visuals make ideas click 60,000x faster! 🧠",
  "Poking me makes me work 10% faster! (Just kidding, but it's fun!) 😄",
  "Synthesizing voice intonations with classroom cadence... 🎙️",
  "Almost ready for presentation! Hold on to your seat! 🚀",
];

export const GeneratingLoader: React.FC<GeneratingLoaderProps> = ({ topic, targetSeconds }) => {
  const [elapsed, setElapsed] = useState(0);
  const [hoveredStage, setHoveredStage] = useState<number | null>(null);
  const [hoveredTrivia, setHoveredTrivia] = useState<number | null>(null);
  const [bluSpeechIdx, setBluSpeechIdx] = useState(0);
  const [bluBounces, setBluBounces] = useState(0);
  const [isBluHovered, setIsBluHovered] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pipeline' | 'trivia'>('all');

  useEffect(() => {
    const timer = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    const speechTimer = setInterval(() => {
      setBluSpeechIdx((prev) => (prev + 1) % BLU_MESSAGES.length);
    }, 5000);

    return () => {
      clearInterval(timer);
      clearInterval(speechTimer);
    };
  }, []);

  const estTotal = targetSeconds >= 100 ? 55 : 35;
  const progressPct = Math.min(95, Math.round((elapsed / estTotal) * 100));

  const handlePokeBlu = () => {
    setBluBounces((prev) => prev + 1);
    setBluSpeechIdx((prev) => (prev + 1) % BLU_MESSAGES.length);
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
        padding: '32px 20px',
        boxSizing: 'border-box',
        background: 'linear-gradient(180deg, #f8fafc 0%, #edf2f7 100%)',
        color: '#0f172a',
        fontFamily: '"Outfit", "Noto Sans", sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '860px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '28px',
          padding: '36px 36px',
          boxSizing: 'border-box',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.08), 0 0 35px rgba(2, 132, 199, 0.06)',
          position: 'relative',
        }}
      >
        {/* Header with Interactive Mascot Blu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
          {/* Interactive Mascot Avatar */}
          <div
            key={bluBounces}
            onClick={handlePokeBlu}
            onMouseEnter={() => setIsBluHovered(true)}
            onMouseLeave={() => setIsBluHovered(false)}
            title={`Click or hover to poke Blu! (Poked ${bluBounces} times)`}
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isBluHovered
                ? '0 12px 30px rgba(2, 132, 199, 0.45), 0 0 20px rgba(56, 189, 248, 0.5)'
                : '0 8px 24px rgba(2, 132, 199, 0.25)',
              cursor: 'pointer',
              transform: isBluHovered ? 'scale(1.1) rotate(-3deg)' : 'scale(1)',
              transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
              flexShrink: 0,
              userSelect: 'none',
              animation: `bounceGentle 3s ease-in-out infinite`,
            }}
          >
            {/* Mascot Eyes & Smile */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
              <div
                style={{
                  width: '8px',
                  height: isBluHovered ? '4px' : '8px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  transition: 'height 0.15s ease',
                }}
              />
              <div
                style={{
                  width: '8px',
                  height: isBluHovered ? '4px' : '8px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  transition: 'height 0.15s ease',
                }}
              />
            </div>
            <div
              style={{
                width: isBluHovered ? '16px' : '10px',
                height: '5px',
                borderRadius: '0 0 10px 10px',
                background: '#ffffff',
                transition: 'width 0.2s ease',
              }}
            />
          </div>

          {/* Title & Speech Bubble */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 8px #10b981',
                  animation: 'pulse 1.5s infinite',
                }}
              />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Offline AI Engine Active
              </span>
            </div>

            <h2 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
              Generating Visual Lesson: <span style={{ color: '#0284c7' }}>"{topic}"</span>
            </h2>

            {/* Interactive Blu Speech Bubble */}
            <div
              onClick={handlePokeBlu}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '12px',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                fontSize: '13px',
                fontWeight: 600,
                color: '#0369a1',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <span>💬</span>
              <span>{BLU_MESSAGES[bluSpeechIdx]}</span>
              <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '4px' }}>(poke me!)</span>
            </div>
          </div>
        </div>

        {/* Progress Bar & ETA */}
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              width: '100%',
              height: '8px',
              background: '#e2e8f0',
              borderRadius: '9999px',
              overflow: 'hidden',
              marginBottom: '10px',
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #0284c7, #38bdf8, #818cf8)',
                borderRadius: '9999px',
                transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: '0 0 12px rgba(56, 189, 248, 0.6)',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
            <span>⏱️ {elapsed}s elapsed</span>
            <span style={{ color: '#0284c7', fontWeight: 700 }}>
              {progressPct < 35
                ? '🧠 [1/4] Planning pedagogical structure...'
                : progressPct < 65
                ? '🎙️ [2/4] Synthesizing 24kHz teacher voice...'
                : progressPct < 85
                ? '⏱️ [3/4] Aligning audio cuts & captions...'
                : '🎬 [4/4] Finalizing 3D canvas stage...'}
            </span>
            <span>~{estTotal}s total</span>
          </div>
        </div>

        {/* Navigation Tabs for Interactive Exploration */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              ✨ Hover to Explore While You Wait:
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                border: 'none',
                background: selectedFilter === 'all' ? '#0284c7' : '#f1f5f9',
                color: selectedFilter === 'all' ? '#ffffff' : '#64748b',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              🌟 All
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('pipeline')}
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                border: 'none',
                background: selectedFilter === 'pipeline' ? '#0284c7' : '#f1f5f9',
                color: selectedFilter === 'pipeline' ? '#ffffff' : '#64748b',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              ⚙️ Pipeline Tech
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('trivia')}
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                border: 'none',
                background: selectedFilter === 'trivia' ? '#0284c7' : '#f1f5f9',
                color: selectedFilter === 'trivia' ? '#ffffff' : '#64748b',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              💡 Trivia Bites
            </button>
          </div>
        </div>

        {/* Section 1: Interactive Pipeline Stage Cards (Hoverable) */}
        {(selectedFilter === 'all' || selectedFilter === 'pipeline') && (
          <div style={{ marginBottom: '22px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Four-Stage Generation Pipeline (Hover any card to inspect internal metrics)
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
              }}
            >
              {PIPELINE_STAGES.map((st, i) => {
                const isHovered = hoveredStage === i;
                return (
                  <div
                    key={st.step}
                    onMouseEnter={() => setHoveredStage(i)}
                    onMouseLeave={() => setHoveredStage(null)}
                    style={{
                      padding: '16px 14px',
                      borderRadius: '16px',
                      background: isHovered ? '#ffffff' : '#f8fafc',
                      border: isHovered ? `2px solid ${st.color}` : '1px solid #e2e8f0',
                      boxShadow: isHovered
                        ? `0 12px 28px rgba(15, 23, 42, 0.12), 0 0 20px ${st.bg}`
                        : '0 2px 6px rgba(15, 23, 42, 0.03)',
                      transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                      transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '120px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '20px' }}>{st.icon}</span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '2px 7px',
                            borderRadius: '6px',
                            background: st.bg,
                            color: st.color,
                          }}
                        >
                          Step {st.step}
                        </span>
                      </div>

                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                        {st.title}
                      </div>

                      <div style={{ fontSize: '12px', color: isHovered ? '#0f172a' : '#64748b', lineHeight: 1.4, transition: 'color 0.15s ease' }}>
                        {isHovered ? st.detail : st.summary}
                      </div>
                    </div>

                    {isHovered && (
                      <div
                        style={{
                          marginTop: '10px',
                          paddingTop: '8px',
                          borderTop: '1px dashed #e2e8f0',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: st.color,
                        }}
                      >
                        ⚡ {st.metrics}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 2: Interactive Trivia Flip Cards (Hoverable) */}
        {(selectedFilter === 'all' || selectedFilter === 'trivia') && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Quick Curiosity Bites (Hover over cards to flip & reveal the answers)
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '12px',
              }}
            >
              {TRIVIA_CARDS.map((card) => {
                const isHovered = hoveredTrivia === card.id;
                return (
                  <div
                    key={card.id}
                    onMouseEnter={() => setHoveredTrivia(card.id)}
                    onMouseLeave={() => setHoveredTrivia(null)}
                    style={{
                      padding: '16px 16px',
                      borderRadius: '16px',
                      background: isHovered ? '#ffffff' : '#f8fafc',
                      border: isHovered ? `2px solid ${card.color}` : '1px solid #e2e8f0',
                      boxShadow: isHovered
                        ? '0 12px 28px rgba(15, 23, 42, 0.1), 0 0 20px rgba(2, 132, 199, 0.08)'
                        : '0 2px 6px rgba(15, 23, 42, 0.03)',
                      transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                      transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '130px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '18px' }}>{card.icon}</span>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: card.color, textTransform: 'uppercase' }}>
                            {card.category}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: isHovered ? card.color : '#e2e8f0',
                            color: isHovered ? '#ffffff' : '#64748b',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {isHovered ? 'Answer Revealed' : 'Hover to Reveal'}
                        </span>
                      </div>

                      {/* Question or Revealed Answer */}
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: isHovered ? 500 : 700,
                          color: isHovered ? '#1e293b' : '#0f172a',
                          lineHeight: 1.45,
                        }}
                      >
                        {isHovered ? (
                          <div style={{ color: '#0f172a' }}>
                            <span style={{ fontWeight: 800, color: card.color }}>Answer: </span>
                            {card.answer}
                          </div>
                        ) : (
                          card.question
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '11px',
                        color: isHovered ? card.color : '#94a3b8',
                        fontWeight: 600,
                      }}
                    >
                      <span>{card.badge}</span>
                      <span>{isHovered ? '💡 Awesome!' : '👉 Touch / Hover'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Hint */}
        <div
          style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '12px',
            color: '#94a3b8',
            borderTop: '1px solid #f1f5f9',
            paddingTop: '16px',
          }}
        >
          <span>🎯 Did you know? You can also ask our local model questions in the bottom-right </span>
          <strong style={{ color: '#0284c7' }}>"Ask Blu"</strong>
          <span> bot anytime!</span>
        </div>
      </div>
    </div>
  );
};
