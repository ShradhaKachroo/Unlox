import { createContext } from 'react';

export type PlaybackSpeed = 0.75 | 1 | 1.25 | 1.5;
export type VoiceGender = 'female' | 'male';
export type CaptionSize = 'normal' | 'large' | 'xlarge';

export interface LearnerSettings {
  speed: PlaybackSpeed;
  voice: VoiceGender;
  dyslexia: boolean;
  captionSize: CaptionSize;
  showBlu: boolean;
}

export interface SettingsContextType {
  settings: LearnerSettings;
  setSpeed: (speed: PlaybackSpeed) => void;
  setVoice: (voice: VoiceGender) => void;
  setDyslexia: (enabled: boolean) => void;
  setCaptionSize: (size: CaptionSize) => void;
  increaseCaptionSize: () => void;
  decreaseCaptionSize: () => void;
  setShowBlu: (show: boolean) => void;
  resetSettings: () => void;
}

export const DEFAULT_SETTINGS: LearnerSettings = {
  speed: 1,
  voice: 'female',
  dyslexia: false,
  captionSize: 'normal',
  showBlu: true,
};

export const STORAGE_KEY = 'blu_learner_settings';

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);
