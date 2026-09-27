import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en } from './translations/en';
import { es } from './translations/es';
import { fr } from './translations/fr';
import { de } from './translations/de';
import { ja } from './translations/ja';
import { zh } from './translations/zh';
import { settingsService } from '@/services/api';

export type Language = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh';

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' },
  { id: 'fr', label: 'Français' },
  { id: 'de', label: 'Deutsch' },
  { id: 'ja', label: '日本語' },
  { id: 'zh', label: '中文' },
];

// Deeply-nested string dictionaries. `en` is the source of truth for shape;
// the others are typed loosely so a missing key in a translation falls back
// to English at lookup time instead of breaking the build.
type Dict = typeof en;
const DICTS: Record<Language, Dict> = { en, es: es as Dict, fr: fr as Dict, de: de as Dict, ja: ja as Dict, zh: zh as Dict };

const STORAGE_KEY = 'neura-language';

function detectInitialLanguage(): Language {
  try {
    const cached = window.localStorage.getItem(STORAGE_KEY) as Language | null;
    if (cached && cached in DICTS) return cached;
  } catch {
    // localStorage unavailable (e.g. private browsing) — fall through.
  }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  if (nav in DICTS) return nav as Language;
  return 'en';
}

function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

interface I18nState {
  language: Language;
  setLanguage: (lang: Language, persist?: boolean) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Structured accessor for non-string content (arrays/objects of translated strings), e.g. lists of feature cards. */
  td: <T = unknown>(key: string) => T;
}

const I18nCtx = createContext<I18nState | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => detectInitialLanguage());

  // Pick up the signed-in user's saved language preference once, and stay in
  // sync with changes made from the Settings page (which dispatches this
  // event after a successful save) without a page reload.
  useEffect(() => {
    let cancelled = false;
    void settingsService.get().then((settings) => {
      if (!cancelled && settings?.language && settings.language in DICTS) {
        setLanguageState(settings.language as Language);
      }
    }).catch(() => undefined);

    const onChanged = (event: Event) => {
      const custom = event as CustomEvent<{ language?: string }>;
      const lang = custom.detail?.language;
      if (lang && lang in DICTS) setLanguageState(lang as Language);
    };
    window.addEventListener('neura-settings-changed', onChanged);
    return () => { cancelled = true; window.removeEventListener('neura-settings-changed', onChanged); };
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try { window.localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    const dict = DICTS[language] ?? en;
    let value = getPath(dict, key);
    if (typeof value !== 'string') value = getPath(en, key); // fall back to English
    if (typeof value !== 'string') return key; // last resort: surface the key so it's obvious something's missing
    if (!vars) return value;
    return Object.entries(vars).reduce((str, [k, v]) => str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v)), value);
  }, [language]);

  const td = useCallback(<T,>(key: string): T => {
    const dict = DICTS[language] ?? en;
    const value = getPath(dict, key);
    if (value !== undefined) return value as T;
    return getPath(en, key) as T;
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, t, td }), [language, setLanguage, t, td]);

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useTranslation(): I18nState {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error('useTranslation must be used within I18nProvider');
  return ctx;
}
