"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useSimulatedProgress } from "@/lib/useSimulatedProgress";
import { useRotatingQuote } from "@/lib/useRotatingQuote";
import LoadingBar from "@/components/LoadingBar";

const QUOTE_INTERVAL_MS = 2400;

// Loading ini muncul saat pindah ke halaman baru (Suspense boundary bawaan
// Next.js App Router), jadi TopBar/SideNav/BottomNav tetap kelihatan.
// Sengaja disamain gaya visualnya sama AppSplash (logo + progress bar),
// cuma versi lebih ringkas & tidak menutupi layar penuh. Logic progress bar
// & quote-nya dipakai bareng lewat lib/useSimulatedProgress &
// lib/useRotatingQuote supaya tidak ada dua salinan kode yang bisa beda
// perilaku (dan beda bug) satu sama lain.
export default function Loading() {
  // Halaman ini tidak punya kondisi "data siap" eksternal seperti AppSplash,
  // jadi progress cuma dibiarkan naik mendekati ceiling selama komponen ini
  // tampil (durasinya sependek transisi halaman itu sendiri).
  const progress = useSimulatedProgress(false);
  const quote = useRotatingQuote(true, QUOTE_INTERVAL_MS);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="relative h-16 w-16 animate-float">
        <Image
          src="/images/mascot-owl-reading.png"
          alt="Nazlingo"
          fill
          sizes="64px"
          className="object-contain"
        />
      </div>

      <LoadingBar progress={progress} className="w-44 max-w-[55vw]" />

      <div className="flex h-6 w-full max-w-xs items-start justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={quote}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex items-center justify-center gap-1.5 text-sm font-semibold text-ink/45"
          >
            <Sparkles size={13} className="shrink-0 text-gold" />
            <span>{quote}</span>
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
