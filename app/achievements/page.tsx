"use client";

import { useProgress } from "@/lib/ProgressContext";
import { ACHIEVEMENTS } from "@/data/achievements";
import { Lock } from "lucide-react";
import { cn } from "@/lib/cn";

export default function AchievementsPage() {
  const { progress } = useProgress();
  const unlockedCount = progress.unlockedAchievements.length;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-8 md:pb-12">
      <h1 className="font-display text-2xl font-bold">Pencapaian</h1>
      <p className="mt-1 text-sm text-ink/50">
        {unlockedCount} dari {ACHIEVEMENTS.length} terbuka — setiap pencapaian memberi 5 permata.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {ACHIEVEMENTS.map((a) => {
          const unlocked = progress.unlockedAchievements.includes(a.id);
          return (
            <div key={a.id} className="flex flex-col items-center gap-2 text-center">
              <div
                className={cn(
                  "relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 text-3xl shadow-node transition-transform",
                  unlocked
                    ? "border-gold bg-gradient-to-b from-gold/25 to-gold/5"
                    : "border-ink/10 bg-ink/[0.04] grayscale"
                )}
              >
                {unlocked ? a.icon : <Lock size={22} className="text-ink/25" />}
              </div>
              <div>
                <p className="font-display text-xs font-bold leading-snug">{a.title}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-ink/40">{a.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
