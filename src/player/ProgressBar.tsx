import React, { useRef } from 'react';
import type { Lesson } from '../types/lesson';
import { getSceneStartTime } from './timeline';

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

export const ProgressBar: React.FC<ProgressBarProps> = ({
  lesson,
  T,
  totalDuration,
  onSeek,
}) => {
  const barRef = useRef<HTMLDivElement>(null);

  const percent = totalDuration > 0 ? Math.min(100, Math.max(0, (T / totalDuration) * 100)) : 0;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!barRef.current || totalDuration <= 0) return;
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

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        userSelect: 'none',
      }}
    >
      {/* Current Time */}
      <span
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '13px',
          fontWeight: 600,
          color: '#38bdf8',
          minWidth: '45px',
        }}
      >
        {formatTime(T)}
      </span>

      {/* Progress Track */}
      <div
        id="progress-track"
        ref={barRef}
        onPointerDown={handlePointerDown}
        style={{
          flex: 1,
          height: '10px',
          borderRadius: '5px',
          background: 'rgba(30, 41, 59, 0.8)',
          position: 'relative',
          cursor: 'pointer',
          border: '1px solid rgba(51, 65, 85, 0.6)',
        }}
        title="Seek timeline"
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
            borderRadius: '5px',
            boxShadow: '0 0 10px rgba(56, 189, 248, 0.5)',
          }}
        />

        {/* Playhead thumb */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${percent}%`,
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: '#ffffff',
            border: '2px solid #0284c7',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 8px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}
        />

        {/* Scene Boundary Marks */}
        {totalDuration > 0 &&
          lesson.scenes.map((_, idx) => {
            if (idx === 0) return null;
            const startTime = getSceneStartTime(lesson, idx);
            const markPercent = (startTime / totalDuration) * 100;
            return (
              <div
                key={`mark-${idx}`}
                style={{
                  position: 'absolute',
                  top: '-2px',
                  bottom: '-2px',
                  left: `${markPercent}%`,
                  width: '2px',
                  background: '#64748b',
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
                title={`Scene ${idx + 1}`}
              />
            );
          })}
      </div>

      {/* Total Duration */}
      <span
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '13px',
          fontWeight: 600,
          color: '#94a3b8',
          minWidth: '45px',
        }}
      >
        {formatTime(totalDuration)}
      </span>
    </div>
  );
};
