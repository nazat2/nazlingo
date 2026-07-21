"use client";

import { useEffect, useState } from "react";
import { MOTIVATIONAL_QUOTES, getShuffledQuotes } from "@/lib/motivationalQuotes";

/**
 * Kata motivasi yang berganti tiap `intervalMs`. Ekstraksi dari AppSplash &
 * app/loading.tsx supaya logikanya cuma ada di satu tempat — sebelumnya
 * dua-duanya nyalin logic yang sama persis, jadi kalau ada bug di satu
 * tempat gampang kelewatan buat dibenerin di tempat lain juga.
 */
export function useRotatingQuote(active: boolean, intervalMs: number) {
  // Render pertama HARUS sama antara server & client (jangan langsung
  // diacak saat render), baru diacak di useEffect (dijamin cuma jalan di
  // browser) supaya tidak memicu hydration mismatch (React #418/#423/#425).
  const [quotes, setQuotes] = useState<string[]>(MOTIVATIONAL_QUOTES);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setQuotes(getShuffledQuotes());
  }, []);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % quotes.length);
    }, intervalMs);
    return () => clearInterval(t);
  }, [active, intervalMs, quotes.length]);

  return quotes[index];
}
