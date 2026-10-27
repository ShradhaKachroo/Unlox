import React, { useState, useEffect } from 'react';
import {
  DEFAULT_SETTINGS,
  STORAGE_KEY,
  SettingsContext,
  type LearnerSettings,
  type PlaybackSpeed,
  type VoiceGender,
  type CaptionSize,
} from './settingsTypes';

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<LearnerSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore localStorage errors
    }
    return DEFAULT_SETTINGS;
  });

  // Persist to localStorage and sync data-dyslexia attribute on root
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage quota
    }

    if (typeof document !== 'undefined') {
      if (settings.dyslexia) {
        document.documentElement.setAttribute('data-dyslexia', 'true');
      } else {
        document.documentElement.removeAttribute('data-dyslexia');
      }
    }
  }, [settings]);

  const setSpeed = (speed: PlaybackSpeed) => {
    setSettings((prev) => ({ ...prev, speed }));
  };

  const setVoice = (voice: VoiceGender) => {
    setSettings((prev) => ({ ...prev, voice }));
  };

  const setDyslexia = (dyslexia: boolean) => {
    setSettings((prev) => ({ ...prev, dyslexia }));
  };

  const setCaptionSize = (captionSize: CaptionSize) => {
    setSettings((prev) => ({ ...prev, captionSize }));
  };

  const increaseCaptionSize = () => {
    setSettings((prev) => {
      if (prev.captionSize === 'normal') return { ...prev, captionSize: 'large' };
      if (prev.captionSize === 'large') return { ...prev, captionSize: 'xlarge' };
      return prev;
    });
  };

  const decreaseCaptionSize = () => {
    setSettings((prev) => {
      if (prev.captionSize === 'xlarge') return { ...prev, captionSize: 'large' };
      if (prev.captionSize === 'large') return { ...prev, captionSize: 'normal' };
      return prev;
    });
  };

  const setShowBlu = (showBlu: boolean) => {
    setSettings((prev) => ({ ...prev, showBlu }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        setSpeed,
        setVoice,
        setDyslexia,
        setCaptionSize,
        increaseCaptionSize,
        decreaseCaptionSize,
        setShowBlu,
        resetSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
