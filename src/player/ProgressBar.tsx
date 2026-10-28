import React, { useRef, useState } from 'react';
import type { Lesson, Scene } from '../types/lesson';
import { getSceneStartTime } from './timeline';
import { playClickSound } from '../utils/audioSfx';

interface ProgressBarProps {
  lesson: Lesson;
  T: number;
  totalDuration: number;
  onSeek: (tMs: number) => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function getSceneIcon(scene: Scene): string {
  switch (scene.type) {
    case 'title_card':
      return '🎬';
    case 'diagram':
      return '📊';
    case 'code_walkthrough':
      return '💻';
    case 'quiz':
      return '❓';
    default:
      return '📌';
  }
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  lesson,
  T,
  totalDuration,
  onSeek,
}) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [hoveredScene, setHoveredScene] = useState<{ idx: number; x: number } | null>(null);

  const percent = totalDuration > 0 ? Math.min(100, Math.max(0, (T / totalDuration) * 100)) : 0;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!barRef.current || totalDuration <= 0) return;
    playClickSound();
    const rect = barRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * totalDuration);

    const onPointerMove = (moveEvent: PointerEvent) => {
      const moveX = moveEvent.clientX - rect.left;
      const moveRatio = Math.max(0, Math.min(1, moveX / rect.width));
      onSeek(moveRatio * totalDuration);
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleChapterClick = (e: React.MouseEvent, startTime: number) => {
    e.stopPropagation();
    playClickSound();
    onSeek(startTime);
  };

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        {/* Current Time */}
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '12px',
            fontWeight: 700,
            color: '#38bdf8',
            minWidth: '45px',
          }}
        >
          {formatTime(T)}
        </span>

        {/* Continuous Progress Track */}
        <div
          id="progress-track"
          ref={barRef}
          onPointerDown={handlePointerDown}
          style={{
            flex: 1,
            height: '8px',
            borderRadius: '6px',
            background: 'rgba(30, 41, 59, 0.8)',
            position: 'relative',
            cursor: 'pointer',
            border: '1px solid rgba(51, 65, 85, 0.5)',
          }}
          title="Drag or click to seek timeline"
        >
          {/* Filled bar */}
          <div
            id="progress-fill"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: `${percent}%`,
              background: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)',
              borderRadius: '6px',
              boxShadow: '0 0 12px rgba(56, 189, 248, 0.45)',
            }}
          />

          {/* Playhead thumb */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: `${percent}%`,
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: '#ffffff',
              border: '2px solid #0284c7',
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 10px rgba(0, 0, 0, 0.6), 0 0 6px #38bdf8',
              pointerEvents: 'none',
              transition: 'transform 0.1s ease',
            }}
          />
        </div>

        {/* Total Duration */}
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '12px',
            fontWeight: 600,
            color: '#94a3b8',
            minWidth: '45px',
            textAlign: 'right',
          }}
        >
          {formatTime(totalDuration)}
        </span>
      </div>

      {/* Segmented Chapter Timeline Bar */}
      {totalDuration > 0 && lesson.scenes.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '3px',
            width: '100%',
            height: '24px',
            marginTop: '2px',
            position: 'relative',
          }}
        >
          {lesson.scenes.map((sc, idx) => {
            const startTime = getSceneStartTime(lesson, idx);
            const endTime = startTime + (sc.duration_ms || 1000);
            const isActive = T >= startTime && T < endTime;
            const isPassed = T >= endTime;
            const icon = getSceneIcon(sc);
            const flexShare = Math.max(0.1, (sc.duration_ms || 1000) / totalDuration);

            return (
              <div
                key={`chapter-${idx}`}
                onClick={(e) => handleChapterClick(e, startTime)}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredScene({ idx, x: rect.left + rect.width / 2 });
                }}
                onMouseLeave={() => setHoveredScene(null)}
                style={{
                  flex: flexShare,
                  height: '100%',
                  borderRadius: '5px',
                  background: isActive
                    ? 'rgba(56, 189, 248, 0.22)'
                    : isPassed
                    ? 'rgba(30, 41, 59, 0.7)'
                    : 'rgba(15, 23, 42, 0.45)',
                  border: isActive
                    ? '1.5px solid #38bdf8'
                    : isPassed
                    ? '1px solid rgba(56, 189, 248, 0.25)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '0 4px',
                  overflow: 'hidden',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
                title={`${idx + 1}. ${sc.heading || sc.type}`}
              >
                <span style={{ fontSize: '11px', flexShrink: 0 }}>{icon}</span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: isActive ? '#38bdf8' : isPassed ? '#cbd5e1' : '#64748b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {sc.heading ? sc.heading.slice(0, 16) : `Part ${idx + 1}`}
                </span>
              </div>
            );
          })}

          {/* Floating Hover Tooltip */}
          {hoveredScene !== null && lesson.scenes[hoveredScene.idx] && (
            <div
              style={{
                position: 'fixed',
                left: `${hoveredScene.x}px`,
                transform: 'translateX(-50%) translateY(-110%)',
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(8px)',
                border: '1px solid #38bdf8',
                borderRadius: '6px',
                padding: '5px 10px',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                zIndex: 100,
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)',
              }}
            >
              <div style={{ color: '#38bdf8', fontSize: '10px', textTransform: 'uppercase' }}>
                Scene {hoveredScene.idx + 1} • {lesson.scenes[hoveredScene.idx].type.replace('_', ' ')}
              </div>
              <div>{lesson.scenes[hoveredScene.idx].heading || 'Visual Scene'}</div>
              <div style={{ color: '#94a3b8', fontSize: '10px', fontFamily: '"JetBrains Mono", monospace' }}>
                Start at {formatTime(getSceneStartTime(lesson, hoveredScene.idx))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
