"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { Star, Zap, Target } from "lucide-react";
import Link from "next/link";
import { useProgress } from "@/lib/ProgressContext";
import { playSuccessFanfare } from "@/lib/sound";

export default function LessonComplete({
  xpEarned,
  accuracy,
  nextHref,
}: {
  xpEarned: number;
  accuracy: number;
  nextHref: string | null;
}) {
  const { progress } = useProgress();

  useEffect(() => {
    if (progress.soundEnabled) playSuccessFanfare();

    const duration = 1200;
    const end = Date.now() + duration;
    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.7 },
        colors: ["#274472", "#D9462E", "#E0A33C", "#5C8A6A", "#F4A6B7"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.7 },
        colors: ["#274472", "#D9462E", "#E0A33C", "#5C8A6A", "#F4A6B7"],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 14 }}
        className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-deep shadow-node"
      >
        <div className="absolute inset-0 animate-ping rounded-full bg-gold/30" />
        <Star size={56} className="relative fill-white text-white" />
      </motion.div>

      <h1 className="mt-6 font-display text-3xl font-bold text-ink">
        Pelajaran Selesai!
      </h1>
      <p className="mt-2 text-ink/50">Kerja bagus, terus lanjutkan!</p>

      <div className="mt-8 flex gap-4">
        <StatCard icon={<Zap className="text-gold-deep" />} value={`+${xpEarned}`} label="XP" />
        <StatCard icon={<Target className="text-matcha-deep" />} value={`${accuracy}%`} label="Akurasi" />
      </div>

      <Link
        href={nextHref || "/"}
        className="mt-10 w-full max-w-xs rounded-2xl bg-matcha py-4 text-center font-display text-base font-bold uppercase tracking-wide text-white shadow-node transition-transform active:translate-y-1 active:shadow-nodePressed"
      >
        {nextHref ? "Lanjut" : "Kembali ke Beranda"}
      </Link>
      <Link
        href="/"
        className="mt-3 text-sm font-semibold text-ink/40 hover:text-ink/70"
      >
        Kembali ke peta belajar
      </Link>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex min-w-[110px] flex-col items-center gap-1 rounded-2xl bg-surface px-6 py-4 shadow-card">
      {icon}
      <span className="font-display text-xl font-bold">{value}</span>
      <span className="text-xs text-ink/40">{label}</span>
    </div>
  );
}
