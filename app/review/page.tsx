"use client";

import { useEffect, useMemo, useState } from "react";
import { useProgress } from "@/lib/ProgressContext";
import { useLanguage } from "@/lib/LanguageContext";
import { getLessonsFor } from "@/data/curriculum";
import { generateReviewQueue, shuffle } from "@/lib/exercises";
import { Exercise, Vocab } from "@/lib/types";
import { recordAnswer, addXp } from "@/lib/progress";
import ExerciseHeader from "@/components/ExerciseHeader";
import ExerciseCard from "@/components/ExerciseCard";
import FeedbackBanner from "@/components/FeedbackBanner";
import LessonComplete from "@/components/LessonComplete";
import { RotateCcw, Sparkles } from "lucide-react";

const REVIEW_XP = 10;

export default function ReviewPage() {
  const { progress, setProgress, ready } = useProgress();
  const { language, languageMeta } = useLanguage();
  const [started, setStarted] = useState(false);
  const [queue, setQueue] = useState<Exercise[] | null>(null);
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [bannerState, setBannerState] = useState<"idle" | "correct" | "wrong">("idle");
  const [bannerAnswer, setBannerAnswer] = useState<string | undefined>();
  const [finished, setFinished] = useState(false);

  const allVocab: Vocab[] = useMemo(
    () => getLessonsFor(language).flatMap((l) => l.vocab),
    [language]
  );

  // Kalau bahasa yang dipelajari diganti di tengah sesi, mulai ulang dari awal
  // supaya tidak nyangkut di sesi latihan bahasa yang lama.
  useEffect(() => {
    setStarted(false);
    setQueue(null);
    setFinished(false);
  }, [language]);

  const learnedIds = useMemo(
    () => Object.keys(progress.wordStats),
    [progress.wordStats]
  );
  const learnedVocab = useMemo(
    () => allVocab.filter((v) => learnedIds.includes(v.id)),
    [learnedIds, allVocab]
  );
  // "Jatuh tempo untuk diulang" = box < 5 (belum "master") dan due <= sekarang.
  // Kata yang sudah box 5 dianggap sudah tertanam kuat di ingatan jangka
  // panjang, jadi tidak lagi dihitung/ditawarkan sebagai due — konsisten
  // dengan semantik dueWordsCount()/getDueWordIds() di lib/progress.ts.
  const dueCount = useMemo(() => {
    const now = Date.now();
    const learnedIdSet = new Set(learnedVocab.map((v) => v.id));
    return Object.values(progress.wordStats).filter(
      (w) => w.due <= now && w.box < 5 && learnedIdSet.has(w.vocabId)
    ).length;
  }, [progress.wordStats, learnedVocab]);

  function startReview() {
    const now = Date.now();
    let pool = learnedVocab.filter((v) => {
      const stat = progress.wordStats[v.id];
      return stat && stat.due <= now && stat.box < 5;
    });
    if (pool.length < 5) pool = learnedVocab; // kalau belum ada yang jatuh tempo, review semua yang dikenal
    const shuffled = shuffle(pool).slice(0, 15);
    setQueue(generateReviewQueue(shuffled, allVocab));
    setIndex(0);
    setCorrectCount(0);
    setWrongCount(0);
    setBannerState("idle");
    setFinished(false);
    setStarted(true);
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-md px-6 pb-24 pt-16 md:pb-12">
        <div className="skeleton mx-auto h-24 w-24 rounded-full" />
        <div className="skeleton mx-auto mt-6 h-6 w-40 rounded-md" />
        <div className="skeleton mx-auto mt-3 h-4 w-56 rounded-md" />
      </div>
    );
  }

  if (!started) {
    return (
      <ReviewIntro
        count={learnedVocab.length}
        due={dueCount}
        onStart={startReview}
        languageLabel={languageMeta.label}
      />
    );
  }

  if (!queue || queue.length === 0) {
    return (
      <ReviewIntro
        count={learnedVocab.length}
        due={dueCount}
        onStart={startReview}
        languageLabel={languageMeta.label}
      />
    );
  }

  if (finished) {
    const total = correctCount + wrongCount;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 100;
    return <LessonComplete xpEarned={REVIEW_XP} accuracy={accuracy} nextHref={null} />;
  }

  const current = queue[index];
  const progressPercent = Math.round((index / queue.length) * 100);

  // Dipanggil begitu soal dijawab: catat hasilnya dan tahan tampilan (hold)
  // sampai pengguna menekan tombol "Lanjut" di FeedbackBanner.
  function handleResult(correct: boolean) {
    setProgress((p) => recordAnswer(p, current.vocabId, correct));

    if (correct) {
      setCorrectCount((c) => c + 1);
      setBannerState("correct");
    } else {
      setWrongCount((c) => c + 1);
      setBannerState("wrong");
      setBannerAnswer(current.romaji);
    }
  }

  function handleContinue() {
    setBannerState("idle");
    if (index + 1 >= queue!.length) {
      setProgress((p) => addXp(p, REVIEW_XP));
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-65px)] flex-col">
      <ExerciseHeader progressPercent={progressPercent} lang={language} />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <ExerciseCard key={current.id} exercise={current} onResult={handleResult} />
      </div>
      <FeedbackBanner
        state={bannerState}
        correctAnswer={bannerAnswer}
        onContinue={handleContinue}
      />
    </div>
  );
}

function ReviewIntro({
  count,
  due,
  onStart,
  languageLabel,
}: {
  count: number;
  due: number;
  onStart: () => void;
  languageLabel: string;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 pb-24 pt-16 text-center md:pb-12">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo/10">
        <RotateCcw size={44} className="text-indigo" />
      </div>
      <h1 className="mt-6 font-display text-2xl font-bold">Ulangi Kosakata</h1>
      <p className="mt-2 text-ink/50">
        Latihan berulang kosakata {languageLabel} membantu kata-kata menempel di ingatan jangka panjang.
      </p>

      {count === 0 ? (
        <p className="mt-8 rounded-2xl bg-surface p-5 text-sm text-ink/50 shadow-card">
          Selesaikan beberapa pelajaran dulu di halaman Belajar supaya ada
          kosakata yang bisa diulang di sini.
        </p>
      ) : (
        <>
          <div className="mt-8 flex items-center gap-2 rounded-2xl bg-surface px-5 py-3 shadow-card">
            <Sparkles size={18} className="text-gold-deep" />
            <span className="text-sm font-semibold text-ink/70">
              {due > 0
                ? `${due} kata siap diulang sekarang`
                : `${count} kata sudah kamu pelajari`}
            </span>
          </div>
          <button
            onClick={onStart}
            className="mt-8 w-full rounded-2xl bg-indigo py-4 text-center font-display text-base font-bold uppercase tracking-wide text-white shadow-node transition-transform active:translate-y-1 active:shadow-nodePressed"
          >
            Mulai Latihan
          </button>
        </>
      )}
    </div>
  );
}
