"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  LanguageCode,
  LanguageMeta,
  LANGUAGES,
  DEFAULT_LANGUAGE,
  getLanguageMeta,
  isLanguageCode,
} from "@/lib/languages";

const KEY = "nazlingo_language_v1";

type Ctx = {
  language: LanguageCode;
  languageMeta: LanguageMeta;
  languages: LanguageMeta[];
  setLanguage: (lang: LanguageCode) => void;
  ready: boolean;
};

const LanguageCtx = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Sama seperti ProgressProvider: state awal harus sama persis di server &
  // client supaya tidak terjadi hydration mismatch. Nilai dari localStorage
  // baru dibaca di useEffect setelah mount.
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (isLanguageCode(saved)) {
        setLanguageState(saved);
      }
    } catch {
      // Diam saja kalau localStorage tidak tersedia
    }
    setReady(true);
  }, []);

  const setLanguage = useCallback((lang: LanguageCode) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      // Diam saja kalau localStorage penuh/diblokir
    }
  }, []);

  return (
    <LanguageCtx.Provider
      value={{
        language,
        languageMeta: getLanguageMeta(language),
        languages: LANGUAGES,
        setLanguage,
        ready,
      }}
    >
      {children}
    </LanguageCtx.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageCtx);
  if (!ctx) throw new Error("useLanguage harus dipakai di dalam LanguageProvider");
  return ctx;
}
