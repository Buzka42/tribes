import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { pl } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { translations, Language, PluralForms } from './translations';

export type LanguagePreference = Language | 'auto';

const STORAGE_KEY = 'tribes.language';

const deviceLanguage = (): Language =>
  getLocales()[0]?.languageCode === 'pl' ? 'pl' : 'en';

const resolve = (pref: LanguagePreference): Language =>
  pref === 'auto' ? deviceLanguage() : pref;

/** Polish plural category: 1 → one; 2-4 (not 12-14) → few; else → many. */
const plPlural = (n: number): keyof PluralForms => {
  if (n === 1) return 'one';
  const d10 = n % 10;
  const d100 = n % 100;
  if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return 'few';
  return 'many';
};

const interpolate = (template: string, params?: Record<string, string | number>) =>
  params
    ? template.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params[k] ?? `{{${k}}}`))
    : template;

const lookup = (lang: Language, key: string): unknown => {
  let node: any = translations[lang];
  for (const part of key.split('.')) {
    node = node?.[part];
    if (node === undefined) return undefined;
  }
  return node;
};

interface I18nContextType {
  /** Resolved language currently in effect. */
  language: Language;
  /** Raw preference: 'auto' follows the device. */
  preference: LanguagePreference;
  setPreference: (pref: LanguagePreference) => void;
  /** Translate a dot-path key, with optional {{param}} interpolation. */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Translate a plural key ({one, few, many} / {one, other}) for count n. */
  tn: (key: string, n: number) => string;
  /** Display name for a stored English value (subgroup, age, gender...). */
  tValue: (group: 'subgroups' | 'ages' | 'genders' | 'spirits' | 'categories', value: string) => string;
  /** date-fns locale matching the active language (undefined = default en). */
  dateLocale: Locale | undefined;
}

const I18nContext = createContext<I18nContextType>({
  language: 'en',
  preference: 'auto',
  setPreference: () => {},
  t: (key) => key,
  tn: (key) => key,
  tValue: (_g, value) => value,
  dateLocale: undefined,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPreferenceState] = useState<LanguagePreference>('auto');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'en' || stored === 'pl' || stored === 'auto') {
          setPreferenceState(stored);
        }
      })
      .catch(() => {});
  }, []);

  const setPreference = (pref: LanguagePreference) => {
    setPreferenceState(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref).catch(() => {});
  };

  const value = useMemo<I18nContextType>(() => {
    const language = resolve(preference);

    const t = (key: string, params?: Record<string, string | number>) => {
      const entry = lookup(language, key) ?? lookup('en', key);
      return typeof entry === 'string' ? interpolate(entry, params) : key;
    };

    const tn = (key: string, n: number) => {
      const entry = (lookup(language, key) ?? lookup('en', key)) as PluralForms | undefined;
      if (!entry || typeof entry === 'string') return String(entry ?? key);
      const form =
        language === 'pl'
          ? entry[plPlural(n)] ?? entry.many ?? entry.one
          : n === 1
            ? entry.one
            : entry.other ?? entry.one;
      return interpolate(form ?? key, { n });
    };

    const tValue: I18nContextType['tValue'] = (group, val) => {
      const map = lookup(language, group) as Record<string, string> | undefined;
      return map?.[val] ?? val;
    };

    return {
      language,
      preference,
      setPreference,
      t,
      tn,
      tValue,
      dateLocale: language === 'pl' ? pl : undefined,
    };
  }, [preference]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);
