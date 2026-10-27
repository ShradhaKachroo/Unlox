export const LANGUAGE_FONTS: Record<string, string> = {
  en: '"Noto Sans", sans-serif',
  hi: '"Noto Sans Devanagari", "Noto Sans", sans-serif',
  kn: '"Noto Sans Kannada", "Noto Sans", sans-serif',
  ta: '"Noto Sans Tamil", "Noto Sans", sans-serif',
  te: '"Noto Sans Telugu", "Noto Sans", sans-serif',
  bn: '"Noto Sans Bengali", "Noto Sans", sans-serif',
  mr: '"Noto Sans Devanagari", "Noto Sans", sans-serif',
};

export const LANGUAGE_LABELS: Record<string, { name: string; nativeName: string }> = {
  en: { name: 'English', nativeName: 'English' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी' },
  kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  ta: { name: 'Tamil', nativeName: 'தமிழ்' },
  te: { name: 'Telugu', nativeName: 'తెలుగు' },
  bn: { name: 'Bengali', nativeName: 'বাংলা' },
  mr: { name: 'Marathi', nativeName: 'मराठी' },
};

export function getFontFamilyForLanguage(lang: string): string {
  const code = (lang || 'en').toLowerCase().trim();
  return LANGUAGE_FONTS[code] || LANGUAGE_FONTS['en'];
}
