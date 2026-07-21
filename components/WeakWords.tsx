"use client";

import { UserProgress } from "@/lib/types";
import { ALL_LESSONS } from "@/data/curriculum";
import SpeakButton from "@/components/SpeakButton";
import { useMemo } from "react";

const VOCAB_BY_ID = new Map(
  ALL_LESSONS.flatMap((l) => l.vocab).map((v) => [v.id, v])
);

export default function WeakWords({ progress }: { progress: UserProgress }) {
  const weak = useMemo(() => {
    return Object.values(progress.wordStats)
      .filter((w) => w.wrong > 0)
      .map((w) => ({
        stat: w,
        vocab: VOCAB_BY_ID.get(w.vocabId),
        ratio: w.wrong / (w.correct + w.wrong),
      }))
      .filter((w) => w.vocab)
      .sort((a, b) => b.ratio - a.ratio || b.stat.wrong - a.stat.wrong)
      .slice(0, 6);
  }, [progress.wordStats]);

  if (weak.length === 0) {
    return (
      <p className="text-sm text-ink/40">
        Belum ada kata yang perlu dilatih ulang — bagus sekali!
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {weak.map(({ stat, vocab }) => (
        <div
          key={stat.vocabId}
          className="flex items-center justify-between gap-3 rounded-xl bg-ink/[0.03] px-3 py-2.5"
        >
          <div className="flex items-center gap-2.5">
            <SpeakButton text={vocab!.jp} lang={vocab!.lang} size={16} className="p-2" />
            <div>
              <p lang={vocab!.lang} className="font-display text-sm font-bold leading-tight">
                {vocab!.jp}
              </p>
              <p className="text-xs text-ink/45">{vocab!.id_}</p>
            </div>
          </div>
          <span className="whitespace-nowrap rounded-full bg-torii/10 px-2.5 py-1 text-xs font-bold text-torii">
            {stat.wrong}× salah
          </span>
        </div>
      ))}
    </div>
  );
}
