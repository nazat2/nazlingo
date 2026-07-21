"use client";

import { getUnitsFor } from "@/data/curriculum";
import LessonPath from "@/components/LessonPath";
import DailyQuest from "@/components/DailyQuest";
import { useProgress } from "@/lib/ProgressContext";
import { useLanguage } from "@/lib/LanguageContext";
import { LanguageMeta, getLanguageTheme } from "@/lib/languages";
import { cn } from "@/lib/cn";

export default function HomePage() {
  const { progress, ready } = useProgress();
  const { language, languageMeta } = useLanguage();

  if (!ready) {
    return <HomeSkeleton />;
  }

  const units = getUnitsFor(language);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-8 md:pb-12">
      <Hero meta={languageMeta} />
      <DailyQuest progress={progress} />
      {units.map((unit, i) => {
        const prevUnit = units[i - 1];
        const unlocked =
          i === 0 ||
          (prevUnit &&
            prevUnit.lessons.every(
              (l) => !!progress.lessonProgress[l.id]?.completed
            ));
        return (
          <LessonPath key={unit.id} unit={unit} progress={progress} unlocked={!!unlocked} />
        );
      })}
    </div>
  );
}

function Hero({ meta }: { meta: LanguageMeta }) {
  const theme = getLanguageTheme(meta.code);
  return (
    <div
      className={cn(
        "relative mb-6 overflow-hidden rounded-[28px] px-6 py-9 text-white shadow-glow ring-1 ring-white/10",
        theme.gradient
      )}
    >
      {/* Motif dekoratif + 2 lingkaran blur — beda per bahasa, lihat
          lib/languages.ts (LANGUAGE_THEME) */}
      <div className={cn("absolute inset-0 opacity-40", theme.motif)} />
      <div className="absolute -right-10 -top-14 h-48 w-48 rounded-full bg-white/10 blur-sm" />
      <div className={cn("absolute -bottom-12 right-10 h-28 w-28 rounded-full blur-[2px]", theme.blurA)} />
      <div className={cn("absolute -left-6 bottom-4 h-16 w-16 rounded-full blur-[2px]", theme.blurB)} />

      <p className="relative font-display text-2xl font-bold leading-snug drop-shadow-sm sm:text-3xl">
        {meta.heroTitle}
        <br />
        <span className="text-lg font-semibold opacity-90 sm:text-xl">
          {meta.heroSubtitle}
        </span>
      </p>
      <p className="relative mt-2 max-w-md text-sm text-white/80 sm:text-base">
        {meta.heroDescription}
      </p>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-8 md:pb-12">
      <div className="skeleton h-36 rounded-3xl" />
      <div className="skeleton mt-6 h-16 rounded-2xl" />
      <div className="mt-12 flex flex-col items-center gap-6">
        <div className="skeleton h-16 w-full max-w-md rounded-3xl" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-16 w-16 rounded-full" />
        ))}
      </div>
    </div>
  );
}
