"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useProgress } from "@/lib/ProgressContext";
import { useEffect } from "react";
import { playSuccessFanfare } from "@/lib/sound";

export default function AchievementToast() {
  const { progress, justUnlocked, dismissAchievement } = useProgress();
  const current = justUnlocked[0];

  useEffect(() => {
    if (!current) return;
    if (progress.soundEnabled) playSuccessFanfare();
    const t = setTimeout(() => dismissAchievement(current.id), 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, dismissAchievement]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
      <AnimatePresence>
        {current && (
          <motion.div
            key={current.id}
            initial={{ y: -60, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -40, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-surface px-5 py-3 shadow-node"
            role="status"
          >
            <span className="text-2xl">{current.icon}</span>
            <div>
              <p className="font-display text-sm font-bold text-gold-deep">
                Pencapaian Terbuka!
              </p>
              <p className="text-sm font-semibold text-ink">{current.title}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
