import React from 'react';
import type { Scene } from '../types/lesson';
import { TitleCard } from '../scenes/TitleCard';
import { CodeWalkthrough } from '../scenes/CodeWalkthrough';
import { Diagram } from '../scenes/Diagram';

interface SceneRendererProps {
  scene: Scene;
  t: number;
  duration: number;
  quality?: 'high' | 'low';
}

export const SceneRenderer: React.FC<SceneRendererProps> = ({ scene, t, duration, quality = 'high' }) => {
  switch (scene.type) {
    case 'title_card':
      return <TitleCard scene={scene} t={t} duration={duration} quality={quality} />;
    case 'code_walkthrough':
      return <CodeWalkthrough scene={scene} t={t} duration={duration} quality={quality} />;
    case 'diagram':
      return <Diagram scene={scene} t={t} duration={duration} quality={quality} />;
    default:
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
            fontSize: '24px',
            background: '#0f172a',
          }}
        >
          Unsupported scene type
        </div>
      );
  }
};
