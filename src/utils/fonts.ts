export const LANGUAGE_FONTS: Record<string, string> = {
  en: '"Noto Sans", sans-serif',
  hi: '"Noto Sans Devanagari", "Noto Sans", sans-serif',
  kn: '"Noto Sans Kannada", "Noto Sans", sans-serif',
};

export const LANGUAGE_LABELS: Record<string, { name: string; nativeName: string }> = {
  en: { name: 'English', nativeName: 'English' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी' },
  kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
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
