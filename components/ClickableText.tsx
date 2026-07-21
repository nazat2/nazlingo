"use client";

import { useEffect, useRef, useState } from "react";
import { LanguageCode } from "@/lib/languages";
import { tokenizeForGloss, GlossMode } from "@/lib/glossary";
import { cn } from "@/lib/cn";

type Props = {
  text: string;
  lang: LanguageCode;
  className?: string;
  /** Kelas tambahan khusus untuk kata yang bisa diketuk (opsional). */
  tokenClassName?: string;
  /** "id" (default) = ketuk kata tampilkan arti Indonesia. "romaji" = tampilkan cara baca/romaji. */
  glossMode?: GlossMode;
};

/**
 * Menampilkan teks bahasa target (Jepang/Inggris) yang tiap katanya bisa
 * diketuk untuk menampilkan arti Indonesianya di atas kata itu (gaya
 * Duolingo). Ketuk kata yang sama lagi, atau ketuk di luar teks, untuk
 * menutup arti yang sedang tampil.
 */
export default function ClickableText({
  text,
  lang,
  className,
  tokenClassName,
  glossMode = "id",
}: Props) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLSpanElement>(null);
  const tokens = tokenizeForGloss(text, lang, glossMode);

  useEffect(() => {
    setActiveKey(null);
  }, [text, lang]);

  useEffect(() => {
    if (!activeKey) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveKey(null);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [activeKey]);

  return (
    <span
      ref={containerRef}
      lang={lang}
      className={cn("relative", className)}
      onClick={(e) => {
        // Ketuk area kosong di dalam teks (bukan sebuah kata) -> tutup arti.
        if (e.target === e.currentTarget) setActiveKey(null);
      }}
    >
      {tokens.map((token) => {
        if (!token.gloss) {
          return (
            <span key={token.key} className="whitespace-pre-wrap">
              {token.text}
            </span>
          );
        }
        const isActive = activeKey === token.key;
        return (
          <span key={token.key} className="relative inline-block">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveKey((prev) => (prev === token.key ? null : token.key));
              }}
              className={cn(
                "cursor-pointer rounded-[3px] underline decoration-dotted decoration-2 decoration-current/40 underline-offset-4 transition-colors",
                isActive ? "bg-indigo/15 text-indigo" : "hover:bg-indigo/10",
                tokenClassName
              )}
            >
              {token.text}
            </button>
            {isActive && (
              <span
                role="tooltip"
                className="animate-popIn pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[13rem] -translate-x-1/2 rounded-xl bg-ink px-3 py-1.5 text-center text-sm font-semibold leading-snug text-washi shadow-node"
              >
                {token.gloss}
                <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-ink" />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
