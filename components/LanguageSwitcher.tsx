"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { cn } from "@/lib/cn";

export default function LanguageSwitcher() {
  const { language, languageMeta, languages, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Bahasa yang dipelajari: ${languageMeta.label}`}
        className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 shadow-card transition-transform hover:-translate-y-0.5"
      >
        <span className="text-base leading-none">{languageMeta.flag}</span>
        <span className="hidden font-mono text-sm font-bold text-ink sm:inline">
          {languageMeta.nativeName}
        </span>
        <ChevronDown
          size={14}
          className={cn("text-ink/40 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl bg-surface p-1.5 shadow-card"
        >
          <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink/40">
            Pilih bahasa
          </p>
          {languages.map((l) => {
            const active = l.code === language;
            return (
              <button
                key={l.code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setLanguage(l.code);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                  active ? "bg-indigo/10" : "hover:bg-ink/[0.03]"
                )}
              >
                <span className="text-xl leading-none">{l.flag}</span>
                <span className="flex-1">
                  <span className="block text-sm font-bold text-ink">{l.label}</span>
                  <span className="block text-xs text-ink/40">{l.nativeName}</span>
                </span>
                {active && <Check size={16} className="text-indigo" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
