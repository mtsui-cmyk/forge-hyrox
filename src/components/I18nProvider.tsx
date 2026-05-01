"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import zh from "@/locales/zh.json";
import en from "@/locales/en.json";

export type Locale = "zh" | "en";

const dictionaries: Record<Locale, typeof zh> = { zh, en };

interface I18nContextType {
  locale: Locale;
  lang: string;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("forge-locale") as Locale | null;
    if (saved && (saved === "zh" || saved === "en")) {
      setLocaleState(saved);
    }
    setIsReady(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("forge-locale", newLocale);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const dict = dictionaries[locale];
      // Support nested keys like "dashboard.title"
      const keys = key.split(".");
      let value: unknown = dict;
      for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
          value = (value as Record<string, unknown>)[k];
        } else {
          return key; // Fallback to key if not found
        }
      }
      if (typeof value !== "string") return key;

      // Replace {variable} placeholders
      if (vars) {
        let result = value;
        for (const [varKey, varVal] of Object.entries(vars)) {
          result = result.replace(`{${varKey}}`, String(varVal));
        }
        return result;
      }
      return value;
    },
    [locale]
  );

  if (!isReady) return null;

  return (
    <I18nContext.Provider value={{ locale, lang: locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
}

/** A tiny language toggle button component */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useTranslation();
  return (
    <button
      onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
      className={`px-3 py-1.5 rounded-lg bg-neutral-800 text-xs font-bold tracking-wider text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors uppercase ${className}`}
      aria-label="Switch language"
      title={locale === "zh" ? "切换到英文" : "Switch to Chinese"}
    >
      {locale === "zh" ? "EN" : "ZH"}
    </button>
  );
}
