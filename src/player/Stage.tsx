import React, { useRef, useState, useEffect, useCallback } from 'react';

interface StageProps {
  children: React.ReactNode;
}

export const STAGE_WIDTH = 1280;
export const STAGE_HEIGHT = 720;

export const Stage: React.FC<StageProps> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const updateScale = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const availableWidth = Math.max(100, rect.width - 24);
    const availableHeight = Math.max(100, rect.height - 24);

    const scaleX = availableWidth / STAGE_WIDTH;
    const scaleY = availableHeight / STAGE_HEIGHT;
    const computedScale = Math.min(scaleX, scaleY);
    setScale(Math.max(0.1, computedScale));
  }, []);

  useEffect(() => {
    updateScale();

    const observer = new ResizeObserver(() => {
      updateScale();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    window.addEventListener('resize', updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [updateScale]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Container sized exactly to scaled 16:9 stage */}
      <div
        style={{
          width: `${STAGE_WIDTH * scale}px`,
          height: `${STAGE_HEIGHT * scale}px`,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: `${Math.max(6, 16 * scale)}px`,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(15, 23, 42, 0.8)',
          background: '#090d16',
        }}
      >
        <div
          id="lesson-stage"
          style={{
            width: `${STAGE_WIDTH}px`,
            height: `${STAGE_HEIGHT}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0,
            left: 0,
            overflow: 'hidden',
            background: '#090d16',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
