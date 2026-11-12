import React, { createContext, useContext, useEffect, useState } from 'react';
import { THEME_PALETTES } from '../lib/cmsLogic';

export type SupportedLang = 'en' | 'hi' | 'mr' | 'kn' | 'ta';

const TRANSLATIONS: Record<SupportedLang, Record<string, string>> = {
  en: {
    home: 'Home',
    about: 'About HEI',
    administration: 'Administration',
    academics: 'Academics',
    admissions: 'Admissions & Fee',
    research: 'Research',
    studentLife: 'Student Life',
    infoAlumni: 'Info & Alumni',
    quickLinks: 'Quick Links',
    gallery: 'Gallery',
    contact: 'Contact Us',
    searchPlaceholder: 'Search UGC disclosures, faculty, notices, fee structure...',
    listenPage: 'Listen',
    stopListening: 'Stop Audio',
    skipToContent: 'Skip to main content',
    latestUpdates: 'Latest Notices',
    exploreDepts: 'Academic Departments',
    ugcDisclosure: 'UGC NEP 2020 Public Self-Disclosure',
  },
  hi: {
    home: 'मुख्य पृष्ठ',
    about: 'संस्थान परिचय',
    administration: 'प्रशासन',
    academics: 'शैक्षणिक',
    admissions: 'प्रवेश एवं शुल्क',
    research: 'अनुसंधान',
    studentLife: 'छात्र जीवन',
    infoAlumni: 'सूचना व पूर्व छात्र',
    quickLinks: 'त्वरित लिंक',
    gallery: 'चित्र दीर्घा',
    contact: 'संपर्क करें',
    searchPlaceholder: 'यूजीसी प्रकटीकरण, संकाय, सूचनाएं, शुल्क खोजें...',
    listenPage: 'सुनें',
    stopListening: 'रोकें',
    skipToContent: 'मुख्य सामग्री पर जाएं',
    latestUpdates: 'ताज़ा सूचनाएं',
    exploreDepts: 'शैक्षणिक विभाग',
    ugcDisclosure: 'यूजीसी एनईपी 2020 सार्वजनिक स्व-प्रकटीकरण',
  },
  mr: {
    home: 'मुख्यपृष्ठ',
    about: 'संस्थेविषयी',
    administration: 'प्रशासन',
    academics: 'शैक्षणिक',
    admissions: 'प्रवेश व शुल्क',
    research: 'संशोधन',
    studentLife: 'विद्यार्थी जीवन',
    infoAlumni: 'माहिती व माजी विद्यार्थी',
    quickLinks: 'त्वरित दुवे',
    gallery: 'छायाचित्र दालन',
    contact: 'संपर्क',
    searchPlaceholder: 'UGC माहिती, प्राध्यापक, परिपत्रके, शुल्क शोधा...',
    listenPage: 'ऐका',
    stopListening: 'थांबवा',
    skipToContent: 'मुख्य मजकुरावर जा',
    latestUpdates: 'ताज्या सूचना',
    exploreDepts: 'शैक्षणिक विभाग',
    ugcDisclosure: 'UGC NEP 2020 सार्वजनिक स्वयं-प्रकटीकरण',
  },
  kn: {
    home: 'ಮುಖಪುಟ',
    about: 'ಸಂಸ್ಥೆಯ ಬಗ್ಗೆ',
    administration: 'ಆಡಳಿತ',
    academics: 'ಶೈಕ್ಷಣಿಕ',
    admissions: 'ಪ್ರವೇಶ ಮತ್ತು ಶುಲ್ಕ',
    research: 'ಸಂಶೋಧನೆ',
    studentLife: 'ವಿದ್ಯಾರ್ಥಿ ಜೀವನ',
    infoAlumni: 'ಮಾಹಿತಿ ಮತ್ತು ಹಳೆಯ ವಿದ್ಯಾರ್ಥಿಗಳು',
    quickLinks: 'ತ್ವರಿತ ಕೊಂಡಿಗಳು',
    gallery: 'ಚಿತ್ರ ಗ್ಯಾಲರಿ',
    contact: 'ಸಂಪರ್ಕಿಸಿ',
    searchPlaceholder: 'UGC ಮಾಹಿತಿ, ಅಧ್ಯಾಪಕರು, ಶುಲ್ಕ ಹುಡುಕಿ...',
    listenPage: 'ಆಲಿಸಿ',
    stopListening: 'ನಿಲ್ಲಿಸಿ',
    skipToContent: 'ಮುಖ್ಯ ವಿಷಯಕ್ಕೆ ಹೋಗಿ',
    latestUpdates: 'ಇತ್ತೀಚಿನ ಪ್ರಕಟಣೆಗಳು',
    exploreDepts: 'ಶೈಕ್ಷಣಿಕ ವಿಭಾಗಗಳು',
    ugcDisclosure: 'UGC NEP 2020 ಸಾರ್ವಜನಿಕ ಸ್ವಯಂ-ಪ್ರಕಟಣೆ',
  },
  ta: {
    home: 'முகப்பு',
    about: 'நிறுவனம் பற்றி',
    administration: 'நிர்வாகம்',
    academics: 'கல்வி',
    admissions: 'சேர்க்கை & கட்டணம்',
    research: 'ஆராய்ச்சி',
    studentLife: 'மாணவர் நலம்',
    infoAlumni: 'தகவல் & முன்னாள் மாணவர்',
    quickLinks: 'விரைவு இணைப்புகள்',
    gallery: 'படத்தொகுப்பு',
    contact: 'தொடர்பு கொள்ள',
    searchPlaceholder: 'UGC தகவல்கள், ஆசிரியர்கள், கட்டணம் தேடுங்கள்...',
    listenPage: 'கேட்கவும்',
    stopListening: 'நிறுத்து',
    skipToContent: 'முதன்மை உள்ளடக்கத்திற்குச் செல்லவும்',
    latestUpdates: 'சமீபத்திய அறிவிப்புகள்',
    exploreDepts: 'கல்வித் துறைகள்',
    ugcDisclosure: 'UGC NEP 2020 பொது சுய-வெளிப்பாடு',
  },
};

interface ThemeAccessibilityContextValue {
  paletteId: string;
  primaryColor: string;
  secondaryColor: string;
  fontScale: number;
  darkMode: boolean;
  highContrast: boolean;
  dyslexiaFont: boolean;
  highlightLinks: boolean;
  isSpeaking: boolean;
  language: SupportedLang;
  t: (key: string) => string;
  setPalette: (id: string) => void;
  setCustomColors: (primary: string, secondary: string) => void;
  adjustFontScale: (delta: number | 'reset') => void;
  toggleDarkMode: () => void;
  toggleHighContrast: () => void;
  toggleDyslexiaFont: () => void;
  toggleHighlightLinks: () => void;
  toggleSpeech: (customText?: string) => void;
  setLanguage: (lang: SupportedLang) => void;
  resetAccessibility: () => void;
}

const ThemeAccessibilityContext = createContext<ThemeAccessibilityContextValue | null>(null);

const STORAGE_KEY = 'svcoer_a11y_prefs_v1';

export function ThemeAccessibilityProvider({
  children,
  defaultPrimary = '#0F294A',
  defaultSecondary = '#B45309',
}: {
  children: React.ReactNode;
  defaultPrimary?: string;
  defaultSecondary?: string;
}) {
  const [paletteId, setPaletteId] = useState<string>('royal-navy');
  const [primaryColor, setPrimaryColor] = useState<string>(defaultPrimary);
  const [secondaryColor, setSecondaryColor] = useState<string>(defaultSecondary);
  const [fontScale, setFontScale] = useState<number>(1);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [dyslexiaFont, setDyslexiaFont] = useState<boolean>(false);
  const [highlightLinks, setHighlightLinks] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [language, setLanguage] = useState<SupportedLang>('en');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.paletteId) setPaletteId(parsed.paletteId);
        if (parsed.primaryColor) setPrimaryColor(parsed.primaryColor);
        if (parsed.secondaryColor) setSecondaryColor(parsed.secondaryColor);
        if (typeof parsed.fontScale === 'number') setFontScale(parsed.fontScale);
        if (typeof parsed.darkMode === 'boolean') setDarkMode(parsed.darkMode);
        if (typeof parsed.highContrast === 'boolean') setHighContrast(parsed.highContrast);
        if (typeof parsed.dyslexiaFont === 'boolean') setDyslexiaFont(parsed.dyslexiaFont);
        if (typeof parsed.highlightLinks === 'boolean') setHighlightLinks(parsed.highlightLinks);
        if (parsed.language) setLanguage(parsed.language);
      }
    } catch {
      // Ignore invalid localStorage
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', primaryColor);
    root.style.setProperty('--secondary-color', secondaryColor);
    root.style.setProperty('--font-scale', String(fontScale));
    root.classList.toggle('dark', darkMode);
    root.classList.toggle('high-contrast', highContrast);
    root.classList.toggle('dyslexia-font', dyslexiaFont);
    root.classList.toggle('highlight-links', highlightLinks);
    root.lang = language;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          paletteId,
          primaryColor,
          secondaryColor,
          fontScale,
          darkMode,
          highContrast,
          dyslexiaFont,
          highlightLinks,
          language,
        }),
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [
    paletteId,
    primaryColor,
    secondaryColor,
    fontScale,
    darkMode,
    highContrast,
    dyslexiaFont,
    highlightLinks,
    language,
  ]);

  const setPalette = (id: string) => {
    const found = THEME_PALETTES.find((p) => p.id === id);
    if (found) {
      setPaletteId(found.id);
      setPrimaryColor(found.primary);
      setSecondaryColor(found.secondary);
    }
  };

  const setCustomColors = (primary: string, secondary: string) => {
    setPaletteId('custom');
    setPrimaryColor(primary);
    setSecondaryColor(secondary);
  };

  const adjustFontScale = (delta: number | 'reset') => {
    if (delta === 'reset') {
      setFontScale(1);
      return;
    }
    setFontScale((prev) => {
      const next = Math.round((prev + delta) * 100) / 100;
      return Math.min(1.25, Math.max(0.85, next));
    });
  };

  const toggleSpeech = (customText?: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const selection = window.getSelection()?.toString().trim();
    const mainEl = document.getElementById('main-content');
    const textToRead =
      customText || selection || mainEl?.innerText?.slice(0, 3500) || document.title;
    if (!textToRead) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 0.98;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const resetAccessibility = () => {
    setFontScale(1);
    setDarkMode(false);
    setHighContrast(false);
    setDyslexiaFont(false);
    setHighlightLinks(false);
    setPalette('royal-navy');
  };

  const t = (key: string) => TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || key;

  return (
    <ThemeAccessibilityContext.Provider
      value={{
        paletteId,
        primaryColor,
        secondaryColor,
        fontScale,
        darkMode,
        highContrast,
        dyslexiaFont,
        highlightLinks,
        isSpeaking,
        language,
        t,
        setPalette,
        setCustomColors,
        adjustFontScale,
        toggleDarkMode: () => setDarkMode((v) => !v),
        toggleHighContrast: () => setHighContrast((v) => !v),
        toggleDyslexiaFont: () => setDyslexiaFont((v) => !v),
        toggleHighlightLinks: () => setHighlightLinks((v) => !v),
        toggleSpeech,
        setLanguage,
        resetAccessibility,
      }}
    >
      {children}
    </ThemeAccessibilityContext.Provider>
  );
}

export function useThemeAccessibility() {
  const ctx = useContext(ThemeAccessibilityContext);
  if (!ctx) throw new Error('useThemeAccessibility must be used inside ThemeAccessibilityProvider');
  return ctx;
}
