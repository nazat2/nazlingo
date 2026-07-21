"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getLesson, nextLesson } from "@/data/curriculum";
import { generateExerciseQueue } from "@/lib/exercises";
import { Exercise } from "@/lib/types";
import { useProgress } from "@/lib/ProgressContext";
import { addXp, recordAnswer, completeLesson } from "@/lib/progress";
import ExerciseHeader from "@/components/ExerciseHeader";
import ExerciseCard from "@/components/ExerciseCard";
import FeedbackBanner from "@/components/FeedbackBanner";
import LessonComplete from "@/components/LessonComplete";
import Link from "next/link";

const XP_PER_LESSON = 15;

export default function LessonPage() {
  const params = useParams<{ unitId: string; lessonId: string }>();
  const { setProgress } = useProgress();

  const lesson = useMemo(
    () => getLesson(params.unitId, params.lessonId),
    [params.unitId, params.lessonId]
  );

  const [queue, setQueue] = useState<Exercise[] | null>(null);
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [bannerState, setBannerState] = useState<"idle" | "correct" | "wrong">("idle");
  const [bannerAnswer, setBannerAnswer] = useState<string | undefined>();
  const [bannerMeaning, setBannerMeaning] = useState<string | undefined>();
  const [pendingCorrect, setPendingCorrect] = useState<boolean | null>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (lesson) {
      setQueue(generateExerciseQueue(lesson));
      setIndex(0);
      setCorrectCount(0);
      setWrongCount(0);
      setBannerState("idle");
      setPendingCorrect(null);
      setFinished(false);
    }
  }, [lesson]);

  if (!lesson) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="font-display text-xl font-bold">Pelajaran tidak ditemukan</p>
        <Link href="/" className="font-semibold text-indigo underline">
          Kembali ke beranda
        </Link>
      </div>
    );
  }

  if (!queue) return null;

  // Simpan referensi non-null yang stabil, supaya TypeScript tidak
  // mengeluh saat variabel ini dipakai di dalam closure/fungsi nested
  // (mis. di dalam handleContinue atau callback setProgress).
  const currentLesson = lesson;
  const currentQueue = queue;

  if (finished) {
    const total = correctCount + wrongCount;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 100;
    const next = nextLesson(currentLesson.unitId, currentLesson.id);
    return (
      <LessonComplete
        xpEarned={XP_PER_LESSON}
        accuracy={accuracy}
        nextHref={next ? `/lesson/${next.unitId}/${next.lessonId}` : null}
      />
    );
  }

  const current = currentQueue[index];
  const progressPercent = Math.round((index / currentQueue.length) * 100);

  // Dipanggil begitu soal dijawab: catat hasilnya dan tahan tampilan (hold)
  // sampai pengguna menekan tombol "Lanjut" di FeedbackBanner.
  function handleResult(correct: boolean) {
    setProgress((p) => recordAnswer(p, current.vocabId, correct));

    if (correct) {
      setCorrectCount((c) => c + 1);
      setBannerState("correct");
      setBannerMeaning(current.meaning);
    } else {
      setWrongCount((c) => c + 1);
      setBannerState("wrong");
      setBannerAnswer(current.romaji);
    }
    setPendingCorrect(correct);
  }

  // Dipanggil saat pengguna menekan "Lanjut": baru di sini kita pindah ke
  // soal berikutnya atau menyelesaikan pelajaran. Tidak ada nyawa, jadi
  // menjawab salah tetap aman — pengguna selalu bisa lanjut.
  function handleContinue() {
    setBannerState("idle");
    setPendingCorrect(null);

    if (index + 1 >= currentQueue.length) {
      setProgress((p) => {
        let next = addXp(p, XP_PER_LESSON);
        const total = correctCount + wrongCount;
        const acc = total > 0 ? Math.round((correctCount / total) * 100) : 100;
        next = completeLesson(next, currentLesson.id, acc);
        return next;
      });
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-65px)] flex-col">
      <ExerciseHeader progressPercent={progressPercent} lang={current.lang} />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <ExerciseCard key={current.id} exercise={current} onResult={handleResult} />
      </div>
      <FeedbackBanner
        state={bannerState}
        correctAnswer={bannerAnswer}
        meaning={bannerMeaning}
        onContinue={handleContinue}
      />
    </div>
  );
}
