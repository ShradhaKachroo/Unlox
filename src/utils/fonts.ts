export const LANGUAGE_FONTS: Record<string, string> = {
  en: '"Outfit", "Noto Sans", system-ui, -apple-system, sans-serif',
  hi: '"Nirmala UI", "Noto Sans Devanagari", "Mangal", "Aparajita", sans-serif',
  kn: '"Nirmala UI", "Noto Sans Kannada", "Tunga", "Kedage", sans-serif',
  ta: '"Nirmala UI", "Noto Sans Tamil", "Latha", "Vijaya", sans-serif',
  te: '"Nirmala UI", "Noto Sans Telugu", "Gautami", "Vani", sans-serif',
  bn: '"Nirmala UI", "Noto Sans Bengali", "Vrinda", "Shonar Bangla", sans-serif',
  mr: '"Nirmala UI", "Noto Sans Devanagari", "Mangal", sans-serif',
  gu: '"Nirmala UI", "Noto Sans Gujarati", "Shruti", sans-serif',
  es: '"Outfit", "Noto Sans", sans-serif',
  fr: '"Outfit", "Noto Sans", sans-serif',
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
