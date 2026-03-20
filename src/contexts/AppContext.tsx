import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language } from '@/lib/translations';

type TranslationType = typeof translations[Language];

interface AppContextType {
  lang: Language;
  setLang: (l: Language) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  t: TranslationType;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [lang, setLang] = useState<Language>(
    (localStorage.getItem('rag_lang') as Language) || 'en'
  );
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('rag_theme') as 'light' | 'dark') || 'dark'
  );

  useEffect(() => {
    localStorage.setItem('rag_lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('rag_theme', theme);
    const root = document.documentElement;
    
    // Add transition class for smooth theme change
    root.style.setProperty('--theme-transition', 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease');
    root.classList.add('theme-transitioning');
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Remove transition class after animation completes
    const timeout = setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const t = translations[lang];

  return (
    <AppContext.Provider value={{ lang, setLang, theme, toggleTheme, t }}>
      {children}
    </AppContext.Provider>
  );
};
