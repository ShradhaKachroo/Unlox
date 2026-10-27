import { useContext } from 'react';
import { SettingsContext, type SettingsContextType } from './settingsTypes';

export function useSettings(): SettingsContextType {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
}

export type { PlaybackSpeed, VoiceGender, CaptionSize, LearnerSettings, SettingsContextType } from './settingsTypes';
