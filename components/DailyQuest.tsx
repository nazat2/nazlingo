"use client";

import { UserProgress } from "@/lib/types";
import { dailyQuestProgress } from "@/lib/progress";
import { Target, CheckCircle2 } from "lucide-react";

export default function DailyQuest({ progress }: { progress: UserProgress }) {
  const quest = dailyQuestProgress(progress);
  const pct = Math.min(100, Math.round((quest.current / quest.goal) * 100));

  return (
    <div className="mb-8 flex items-center gap-4 rounded-2xl bg-surface p-4 shadow-card">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
          quest.done ? "bg-matcha/15" : "bg-gold/15"
        }`}
      >
        {quest.done ? (
          <CheckCircle2 size={22} className="text-matcha-deep" />
        ) : (
          <Target size={20} className="text-gold-deep" />
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">Misi Harian</p>
          <span className="font-mono text-xs font-semibold text-ink/40">
            {Math.min(quest.current, quest.goal)}/{quest.goal} XP
          </span>
        </div>
        <p className="text-xs text-ink/45">
          {quest.done ? "Selesai! Kembali lagi besok." : "Kumpulkan XP dari pelajaran hari ini"}
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10">
          <div
            className={`h-full rounded-full transition-all ${
              quest.done ? "bg-matcha" : "bg-gold"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
