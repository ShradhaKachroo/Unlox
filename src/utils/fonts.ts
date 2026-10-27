export const LANGUAGE_FONTS: Record<string, string> = {
  en: '"Noto Sans", sans-serif',
  hi: '"Noto Sans Devanagari", "Noto Sans", sans-serif',
  kn: '"Noto Sans Kannada", "Noto Sans", sans-serif',
  ta: '"Noto Sans Tamil", "Noto Sans", sans-serif',
  te: '"Noto Sans Telugu", "Noto Sans", sans-serif',
  bn: '"Noto Sans Bengali", "Noto Sans", sans-serif',
  mr: '"Noto Sans Devanagari", "Noto Sans", sans-serif',
  gu: '"Noto Sans Gujarati", "Noto Sans", sans-serif',
  es: '"Noto Sans", sans-serif',
  fr: '"Noto Sans", sans-serif',
};

export interface LanguageLabel {
  name: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGE_LABELS: Record<string, LanguageLabel> = {
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  ta: { name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  te: { name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  bn: { name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  mr: { name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  gu: { name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
};

export function getFontFamilyForLanguage(lang: string, dyslexia = false): string {
  const code = (lang || 'en').toLowerCase().trim();
  if (dyslexia) {
    if (code === 'en') {
      return '"OpenDyslexic", "Noto Sans", sans-serif';
    }
    const base = LANGUAGE_FONTS[code] || LANGUAGE_FONTS['en'];
    return `${base}, "OpenDyslexic", sans-serif`;
  }
  return LANGUAGE_FONTS[code] || LANGUAGE_FONTS['en'];
}
