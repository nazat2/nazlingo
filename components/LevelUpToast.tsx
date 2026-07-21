"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useProgress } from "@/lib/ProgressContext";
import { useEffect } from "react";
import { playSuccessFanfare } from "@/lib/sound";

export default function LevelUpToast() {
  const { progress, justLeveledUp, dismissLevelUp } = useProgress();

  useEffect(() => {
    if (!justLeveledUp) return;
    if (progress.soundEnabled) playSuccessFanfare();
    // canvas-confetti di-lazy-load: komponen ini terpasang di root layout
    // (selalu ada di semua halaman), jadi library confetti-nya baru
    // diunduh & dijalankan pas benar-benar naik level, bukan ikut membebani
    // loading pertama tiap halaman.
    import("canvas-confetti").then(({ default: confetti }) => {
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.4 },
        colors: ["#274472", "#D9462E", "#E0A33C", "#5C8A6A", "#F4A6B7"],
      });
    });
    const t = setTimeout(dismissLevelUp, 4500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justLeveledUp, dismissLevelUp]);

  return (
    <AnimatePresence>
      {justLeveledUp && (
        <div className="pointer-events-none fixed inset-0 z-[65] flex items-center justify-center px-4">
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="pointer-events-auto flex flex-col items-center gap-2 rounded-3xl bg-surface px-8 py-7 text-center shadow-node"
            role="status"
          >
            <span className="text-5xl">{justLeveledUp.icon}</span>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-gold-deep">
              Naik Level!
            </p>
            <p className="font-display text-xl font-bold text-ink">
              Level {justLeveledUp.rank}: {justLeveledUp.title}
            </p>
            <button
              onClick={dismissLevelUp}
              className="mt-3 rounded-xl bg-indigo px-5 py-2 text-sm font-bold text-white"
            >
              Lanjutkan
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
