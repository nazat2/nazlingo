"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useProgress } from "@/lib/ProgressContext";
import { useSimulatedProgress } from "@/lib/useSimulatedProgress";
import { useRotatingQuote } from "@/lib/useRotatingQuote";
import LoadingBar from "@/components/LoadingBar";

// Berapa lama minimal splash tampil, supaya tidak "kedip" sekilas doang
// kalau kebetulan auth & progres selesai dimuat super cepat.
const MIN_VISIBLE_MS = 900;
const QUOTE_INTERVAL_MS = 2600;
// Berapa lama bar ditahan penuh (100%) sebelum splash-nya hilang, biar
// animasinya kelar dilihat mata dulu, ga langsung "meloncat" ilang.
const READY_HOLD_MS = 320;

/**
 * Layar loading global — muncul di atas seluruh app setiap kali app pertama
 * kali dibuka DAN setiap kali reload/relog (karena bergantung pada authReady
 * & progress ready, yang selalu mulai dari false di setiap mount penuh).
 * Navigasi berpindah halaman biasa TIDAK memicu ulang splash ini karena
 * kedua status tsb sudah true dan komponen ini tidak ikut ter-remount.
 */
export default function AppSplash() {
  const { authReady } = useAuth();
  const { ready: progressReady } = useProgress();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [show, setShow] = useState(true);

  const dataReady = authReady && progressReady && minTimeElapsed;
  const progress = useSimulatedProgress(dataReady);
  const quote = useRotatingQuote(show, QUOTE_INTERVAL_MS);

  useEffect(() => {
    const t = setTimeout(() => setMinTimeElapsed(true), MIN_VISIBLE_MS);
    return () => clearTimeout(t);
  }, []);

  // Begitu data beneran siap: bar dipacu penuh ke 100% (lewat
  // useSimulatedProgress), ditahan sebentar biar keliatan selesai, baru
  // splash-nya fade out.
  useEffect(() => {
    if (!dataReady) return;
    const t = setTimeout(() => setShow(false), READY_HOLD_MS);
    return () => clearTimeout(t);
  }, [dataReady]);

  // Kunci scroll body selagi splash menutupi layar penuh.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = show ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="app-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-washi"
          role="status"
          aria-live="polite"
          aria-label="Nazlingo sedang memuat"
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 18% 15%, rgba(39,68,114,0.09), transparent 45%), radial-gradient(circle at 84% 20%, rgba(217,70,46,0.07), transparent 42%), radial-gradient(circle at 50% 96%, rgba(92,138,106,0.08), transparent 45%)",
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative flex flex-col items-center gap-7 px-6 text-center"
          >
            <div className="relative h-20 w-20 animate-float">
              <Image
                src="/images/mascot-owl-reading.png"
                alt="Nazlingo"
                fill
                sizes="80px"
                className="object-contain"
              />
            </div>

            <div className="flex flex-col items-center gap-3">
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-indigo-deep">
                Nazlingo
              </h1>

              <LoadingBar progress={progress} className="w-56 max-w-[65vw]" />
            </div>

            <div className="flex h-11 w-full max-w-xs items-start justify-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={quote}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="flex items-center justify-center gap-1.5 text-sm font-semibold leading-snug text-ink/55"
                >
                  <Sparkles size={14} className="shrink-0 text-gold" />
                  <span>{quote}</span>
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
