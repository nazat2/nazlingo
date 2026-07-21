"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Exercise, ExerciseOption } from "@/lib/types";
import { LanguageCode, getLanguageMeta } from "@/lib/languages";
import { cn } from "@/lib/cn";
import SpeakButton from "@/components/SpeakButton";
import ClickableText from "@/components/ClickableText";
import { useProgress } from "@/lib/ProgressContext";
import { motion, AnimatePresence } from "framer-motion";
import { speakText } from "@/lib/tts";
import { playCorrectSound, playWrongSound } from "@/lib/sound";
import { checkTypoTolerant } from "@/lib/levenshtein";
import {
  isSpeechRecognitionSupported,
  listenOnce,
  checkPronunciation,
} from "@/lib/speech";
import { Mic } from "lucide-react";

type Props = {
  exercise: Exercise;
  onResult: (correct: boolean) => void;
};

export default function ExerciseCard({ exercise, onResult }: Props) {
  const { progress } = useProgress();
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [typed, setTyped] = useState("");
  const [built, setBuilt] = useState<string[]>([]);
  const [remaining, setRemaining] = useState<string[]>(exercise.scrambled || []);
  const [typoNote, setTypoNote] = useState<string | null>(null);
  const [speakState, setSpeakState] = useState<"idle" | "listening" | "unsupported">(
    "idle"
  );
  const [speakNote, setSpeakNote] = useState<string | null>(null);
  const stopListeningRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setSelected(null);
    setStatus("idle");
    setTyped("");
    setBuilt([]);
    setRemaining(exercise.scrambled || []);
    setTypoNote(null);
    setSpeakNote(null);
    setSpeakState(isSpeechRecognitionSupported() ? "idle" : "unsupported");
    if (exercise.type === "listen_choose" && exercise.jp) {
      const t = setTimeout(() => speakText(exercise.jp!, exercise.lang), 350);
      return () => clearTimeout(t);
    }
    // Kalau pengguna pindah soal (mis. tekan "Lanjut") sementara mic masih
    // aktif dengar, hentikan dulu supaya hasilnya tidak "nyasar" ke soal
    // berikutnya.
    return () => {
      stopListeningRef.current?.();
      stopListeningRef.current = null;
    };
  }, [exercise]);

  const isChecked = status !== "idle";

  function playFeedback(correct: boolean) {
    if (!progress.soundEnabled) return;
    if (correct) playCorrectSound();
    else playWrongSound();
  }

  function commitChoice(optionId: string, correct: boolean) {
    if (isChecked) return;
    setSelected(optionId);
    setStatus(correct ? "correct" : "wrong");
    playFeedback(correct);
    onResult(correct);
  }

  function checkTyped() {
    if (isChecked || !exercise.answer) return;
    const result = checkTypoTolerant(typed, exercise.answer);
    const correct = result !== "wrong";
    setStatus(correct ? "correct" : "wrong");
    if (result === "typo") setTypoNote(exercise.answer);
    playFeedback(correct);
    onResult(correct);
  }

  function checkBuild(nextBuilt: string[]) {
    if (!exercise.answer) return;
    if (nextBuilt.length !== (exercise.scrambled?.length || 0)) return;
    const correct = nextBuilt.join("") === exercise.answer;
    setStatus(correct ? "correct" : "wrong");
    playFeedback(correct);
    onResult(correct);
  }

  function startSpeaking() {
    if (isChecked || speakState === "listening" || !exercise.answer) return;
    setSpeakState("listening");
    setSpeakNote(null);
    stopListeningRef.current = listenOnce(exercise.lang, {
      onResult: (transcript) => {
        const result = checkPronunciation(transcript, exercise.answer!);
        const correct = result !== "wrong";
        setStatus(correct ? "correct" : "wrong");
        if (result === "close") setSpeakNote(exercise.jp || exercise.answer!);
        playFeedback(correct);
        onResult(correct);
      },
      onError: (reason) => {
        // "not-allowed" (izin ditolak) itu satu-satunya yang bener-bener
        // butuh tindakan di luar tombol ini (ubah izin di setelan browser),
        // jadi baru itu yang bikin mic dianggap "unsupported" sementara.
        // Selain itu (termasuk masalah jaringan) tetap "idle" biar
        // pengguna bisa langsung coba tap mic lagi tanpa reload halaman.
        setSpeakState(reason === "not-allowed" ? "unsupported" : "idle");
        if (reason === "not-allowed") {
          setSpeakNote("Izin mikrofon ditolak — nyalakan lewat pengaturan browser.");
        } else if (reason === "no-speech") {
          setSpeakNote("Tidak terdengar suara. Coba lagi, ya.");
        } else if (reason === "network") {
          // Pengenalan suara diproses lewat server (bukan di HP), jadi
          // wajib ada koneksi internet — ini bukan bug, tapi keterbatasan
          // teknologinya. Kasih tahu jelas + tetap kasih jalan keluar.
          setSpeakNote("Butuh koneksi internet buat cek ucapanmu. Coba lagi, atau lewati dulu.");
        } else {
          setSpeakNote("Gagal merekam. Coba tap mic-nya sekali lagi.");
        }
      },
      onEnd: () => {
        setSpeakState((s) => (s === "listening" ? "idle" : s));
      },
    });
  }

  // Dilewati tanpa dianggap salah — konsisten dengan filosofi app ini yang
  // memang tidak ada sistem nyawa/penalti (lihat catatan di lesson page),
  // dan menghindari memaksa pengguna yang sedang di tempat umum/tidak bisa
  // bicara untuk tetap direkam.
  function skipSpeak() {
    if (isChecked) return;
    stopListeningRef.current?.();
    setStatus("correct");
    onResult(true);
  }

  return (
    <div
      // pb-32: beri ruang kosong di dasar konten yang bisa discroll, supaya
      // tombol "Periksa" (type_romaji, sebelum dijawab) maupun banner
      // "Benar sekali!/Belum tepat" + tombol "Lanjut" (setelah dijawab,
      // semua tipe soal) — yang keduanya fixed di dasar layar — tidak
      // pernah menutupi konten atau membuatnya sulit dijangkau.
      className="flex flex-1 flex-col px-4 pb-32 pt-6 sm:px-0"
    >
      <Instruction type={exercise.type} lang={exercise.lang} />

      <div className="mt-4 flex-1">
        {(exercise.type === "mc_jp_to_id" ||
          exercise.type === "mc_id_to_jp" ||
          exercise.type === "listen_choose") && (
          <PromptBlock exercise={exercise} showRomaji={progress.showRomaji} />
        )}

        {(exercise.type === "mc_jp_to_id" ||
          exercise.type === "mc_id_to_jp" ||
          exercise.type === "listen_choose") &&
          exercise.options && (
            <OptionGrid
              options={exercise.options}
              selected={selected}
              status={status}
              onPick={commitChoice}
              showRomaji={progress.showRomaji}
              layoutJp={exercise.type === "mc_id_to_jp"}
              lang={exercise.lang}
            />
          )}

        {exercise.type === "type_romaji" && (
          <TypeRomajiBlock
            exercise={exercise}
            typed={typed}
            setTyped={setTyped}
            status={status}
            showRomaji={progress.showRomaji}
            typoNote={typoNote}
            onSubmit={checkTyped}
          />
        )}

        {exercise.type === "build_word" && (
          <BuildWordBlock
            exercise={exercise}
            built={built}
            setBuilt={setBuilt}
            remaining={remaining}
            setRemaining={setRemaining}
            status={status}
            onComplete={checkBuild}
          />
        )}

        {exercise.type === "speak" && (
          <SpeakBlock
            exercise={exercise}
            status={status}
            speakState={speakState}
            speakNote={speakNote}
            showRomaji={progress.showRomaji}
            onStart={startSpeaking}
            onSkip={skipSpeak}
          />
        )}
      </div>

      <FooterAction
        status={status}
        exercise={exercise}
        canCheck={
          (exercise.type === "type_romaji" && typed.trim().length > 0) ||
          (exercise.type === "build_word" &&
            built.length === (exercise.scrambled?.length || 0) &&
            built.length > 0)
        }
        onCheck={() => {
          if (exercise.type === "type_romaji") checkTyped();
        }}
      />
    </div>
  );
}

function Instruction({ type, lang }: { type: Exercise["type"]; lang: LanguageCode }) {
  // BUG LAMA: label soal type_romaji & build_word sebelumnya hardcode kata
  // "romaji" buat SEMUA bahasa — padahal "romaji" itu istilah khusus cara
  // baca Bahasa Jepang. Mandarin semestinya "pinyin", Arab "transliterasi",
  // dan Inggris (yang sudah huruf Latin asli) lebih pas disebut "ejaan".
  // Sekarang istilahnya diambil dari readingLabel per bahasa (lib/languages.ts).
  const readingLabel = getLanguageMeta(lang).readingLabel;
  const text: Record<Exercise["type"], string> = {
    mc_jp_to_id: "Apa artinya?",
    mc_id_to_jp: "Pilih kata yang tepat",
    // Disamakan dengan mc_jp_to_id ("Apa artinya?") karena sekarang soal ini
    // juga menampilkan teks kata targetnya (lihat listenChoose() di
    // lib/exercises.ts) — bukan cuma tombol audio tanpa konteks lagi.
    listen_choose: "Apa artinya?",
    type_romaji: `Ketik cara bacanya (${readingLabel})`,
    match_pairs: "Jodohkan pasangannya",
    build_word: `Susun jadi ${readingLabel} yang benar`,
    speak: "Ucapkan kalimat ini",
  };
  return (
    <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">
      {text[type]}
    </h2>
  );
}

function PromptBlock({
  exercise,
  showRomaji,
}: {
  exercise: Exercise;
  showRomaji: boolean;
}) {
  if (exercise.type === "mc_id_to_jp") {
    return (
      <div className="mb-6 rounded-2xl bg-surface p-6 text-center shadow-card">
        <p className="text-2xl font-bold text-ink sm:text-3xl">{exercise.prompt}</p>
      </div>
    );
  }
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-surface p-6 shadow-card">
      <div className="flex items-center gap-4">
        <SpeakButton text={exercise.jp || exercise.prompt} lang={exercise.lang} />
        <div>
          <ClickableText
            text={exercise.prompt}
            lang={exercise.lang}
            className="font-display text-3xl font-bold text-ink sm:text-4xl"
          />
          {showRomaji && exercise.promptSub && (
            <p className="mt-1 font-mono text-sm text-ink/50">{exercise.promptSub}</p>
          )}
        </div>
      </div>
      {exercise.example && (
        <div className="rounded-xl bg-ink/[0.03] px-4 py-2.5">
          <ClickableText
            text={exercise.example}
            lang={exercise.lang}
            className="text-sm font-semibold text-ink/70"
          />
          {exercise.exampleId && (
            <p className="mt-0.5 text-xs text-ink/40">{exercise.exampleId}</p>
          )}
        </div>
      )}
    </div>
  );
}

function Mascot({ variant = "icon" }: { variant?: "icon" | "mic" }) {
  // Maskot resmi Nazlingo (burung hantu biru). Variannya beda tergantung
  // konteks soal: "icon" (pegang buku) buat gelembung dengar, "mic" (pegang
  // mikrofon) khusus buat soal ngomong — biar ilustrasinya nyambung sama
  // aksi yang diminta ke pengguna.
  const src =
    variant === "mic" ? "/images/mascot-owl-mic.png" : "/images/mascot-owl-icon.png";
  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-torii-light/25 to-torii/10">
      <Image
        src={src}
        alt="Maskot Nazlingo"
        width={80}
        height={80}
        className="h-16 w-16 object-contain"
        priority
      />
    </div>
  );
}

function OptionGrid({
  options,
  selected,
  status,
  onPick,
  showRomaji,
  layoutJp,
  lang,
}: {
  options: ExerciseOption[];
  selected: string | null;
  status: "idle" | "correct" | "wrong";
  onPick: (id: string, correct: boolean) => void;
  showRomaji: boolean;
  layoutJp: boolean;
  lang: LanguageCode;
}) {
  return (
    <div className={cn("grid gap-3", layoutJp ? "grid-cols-2" : "grid-cols-1")}>
      {options.map((opt) => {
        const isSelected = selected === opt.id;
        const revealState =
          status !== "idle" && (isSelected || opt.correct)
            ? opt.correct
              ? "correct"
              : "wrong"
            : "idle";
        return (
          <div
            key={opt.id}
            role="button"
            tabIndex={status === "idle" ? 0 : -1}
            aria-disabled={status !== "idle"}
            onClick={() => status === "idle" && onPick(opt.id, opt.correct)}
            onKeyDown={(e) => {
              if (status === "idle" && (e.key === "Enter" || e.key === " ")) {
                onPick(opt.id, opt.correct);
              }
            }}
            className={cn(
              "flex flex-col items-center justify-center rounded-2xl border-2 bg-surface px-4 py-4 text-center shadow-card transition-all",
              status === "idle" ? "cursor-pointer" : "cursor-default",
              revealState === "idle" &&
                "border-ink/5 hover:border-indigo/30 hover:-translate-y-0.5",
              revealState === "correct" &&
                "border-matcha bg-matcha-pale text-matcha-deep animate-popIn",
              revealState === "wrong" &&
                "border-torii bg-torii/5 text-torii animate-shake"
            )}
          >
            {opt.sub && showRomaji && layoutJp && (
              <span className="font-mono text-xs tracking-wide text-ink/40">{opt.sub}</span>
            )}
            {layoutJp ? (
              <ClickableText
                text={opt.label}
                lang={lang}
                className="font-display text-xl font-semibold"
              />
            ) : (
              <span className="font-semibold">{opt.label}</span>
            )}
            {opt.sub && showRomaji && !layoutJp && (
              <span className="mt-1 font-mono text-xs text-ink/40">{opt.sub}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TypeRomajiBlock({
  exercise,
  typed,
  setTyped,
  status,
  showRomaji,
  typoNote,
  onSubmit,
}: {
  exercise: Exercise;
  typed: string;
  setTyped: (v: string) => void;
  status: "idle" | "correct" | "wrong";
  showRomaji: boolean;
  typoNote: string | null;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-4 rounded-2xl bg-surface p-6 shadow-card">
        <SpeakButton text={exercise.jp || ""} lang={exercise.lang} />
        <div>
          <ClickableText
            text={exercise.jp || ""}
            lang={exercise.lang}
            glossMode="romaji"
            className="font-display text-3xl font-bold"
          />
          <p className="mt-1 text-sm text-ink/50">{exercise.promptSub}</p>
        </div>
      </div>
      <input
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && status === "idle" && typed.trim().length > 0) {
            onSubmit();
          }
        }}
        disabled={status !== "idle"}
        placeholder={`ketik ${getLanguageMeta(exercise.lang).readingLabel} di sini…`}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        autoFocus
        className={cn(
          "w-full max-w-sm rounded-2xl border-2 bg-surface px-5 py-4 text-center font-mono text-lg shadow-card outline-none transition-colors",
          status === "idle" && "border-ink/10 focus:border-indigo",
          status === "correct" && "border-matcha bg-matcha-pale text-matcha-deep",
          status === "wrong" && "border-torii bg-torii/5 text-torii animate-shake"
        )}
      />
      {status === "correct" && typoNote && (
        <p className="text-sm text-gold-deep">
          Nyaris tepat! Penulisan yang benar:{" "}
          <span className="font-mono font-bold">{typoNote}</span>
        </p>
      )}
      {status === "wrong" && showRomaji && (
        <p className="text-sm text-ink/50">
          Jawaban benar: <span className="font-mono font-bold text-torii">{exercise.romaji}</span>
        </p>
      )}
    </div>
  );
}

function BuildWordBlock({
  exercise,
  built,
  setBuilt,
  remaining,
  setRemaining,
  status,
  onComplete,
}: {
  exercise: Exercise;
  built: string[];
  setBuilt: (v: string[]) => void;
  remaining: string[];
  setRemaining: (v: string[]) => void;
  status: "idle" | "correct" | "wrong";
  onComplete: (built: string[]) => void;
}) {
  function pick(idx: number) {
    if (status !== "idle") return;
    const chunk = remaining[idx];
    const nextRemaining = remaining.filter((_, i) => i !== idx);
    const nextBuilt = [...built, chunk];
    setRemaining(nextRemaining);
    setBuilt(nextBuilt);
    onComplete(nextBuilt);
  }

  function undo(idx: number) {
    if (status !== "idle") return;
    const chunk = built[idx];
    setBuilt(built.filter((_, i) => i !== idx));
    setRemaining([...remaining, chunk]);
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex items-center gap-4 rounded-2xl bg-surface p-6 shadow-card">
        <SpeakButton text={exercise.jp || ""} lang={exercise.lang} />
        <div>
          <p className="text-lg font-bold">{exercise.prompt}</p>
          <ClickableText
            text={exercise.promptSub || ""}
            lang={exercise.lang}
            // BUG LAMA: sebelumnya tidak diset glossMode, jadi defaultnya
            // "id" — kalau kata di-ketuk malah muncul ARTI INDONESIANYA,
            // padahal soal ini justru lagi melatih cara baca (romaji/pinyin/
            // transliterasi/ejaan tergantung bahasa), bukan arti. Disamakan
            // dengan TypeRomajiBlock yang sudah benar dari awal.
            glossMode="romaji"
            className="mt-1 font-display text-2xl"
          />
        </div>
      </div>

      <div
        className={cn(
          "flex min-h-[3.5rem] w-full max-w-sm flex-wrap justify-center gap-2 rounded-2xl border-2 border-dashed p-3",
          status === "correct" && "border-matcha bg-matcha-pale",
          status === "wrong" && "border-torii bg-torii/5 animate-shake",
          status === "idle" && "border-ink/15"
        )}
      >
        {built.length === 0 && (
          <span className="self-center text-sm text-ink/30">Ketuk suku kata di bawah</span>
        )}
        {built.map((chunk, i) => (
          <button
            key={`${chunk}-${i}`}
            onClick={() => undo(i)}
            disabled={status !== "idle"}
            className="rounded-xl bg-indigo px-3 py-2 font-mono text-sm font-bold text-white shadow-stamp"
          >
            {chunk}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {remaining.map((chunk, i) => (
          <button
            key={`${chunk}-${i}`}
            onClick={() => pick(i)}
            disabled={status !== "idle"}
            className="rounded-xl border-2 border-ink/10 bg-surface px-3 py-2 font-mono text-sm font-bold text-ink shadow-card transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {chunk}
          </button>
        ))}
      </div>
    </div>
  );
}

function SpeakBlock({
  exercise,
  status,
  speakState,
  speakNote,
  showRomaji,
  onStart,
  onSkip,
}: {
  exercise: Exercise;
  status: "idle" | "correct" | "wrong";
  speakState: "idle" | "listening" | "unsupported";
  speakNote: string | null;
  showRomaji: boolean;
  onStart: () => void;
  onSkip: () => void;
}) {
  const isChecked = status !== "idle";

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex items-start justify-center gap-3 px-2 pt-2">
        <Mascot variant="mic" />
        <div className="relative">
          <span className="absolute -left-2 top-6 h-4 w-4 rotate-45 border-b-2 border-l-2 border-ink/10 bg-surface" />
          <div className="flex items-center gap-3 rounded-2xl border-2 border-ink/10 bg-surface px-5 py-4 shadow-card">
            <SpeakButton
              text={exercise.jp || ""}
              lang={exercise.lang}
              size={22}
              autoLabel="Putar audio kecepatan normal"
              className="h-10 w-10 shrink-0"
            />
            <div>
              {showRomaji && exercise.promptSub && (
                <p className="font-mono text-xs tracking-wide text-ink/40">
                  {exercise.promptSub}
                </p>
              )}
              <ClickableText
                text={exercise.jp || ""}
                lang={exercise.lang}
                className="font-display text-2xl font-bold text-ink sm:text-3xl"
              />
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onStart}
        disabled={isChecked || speakState === "unsupported"}
        aria-label="Rekam ucapanmu"
        className={cn(
          "flex h-20 w-20 items-center justify-center rounded-2xl text-white shadow-node transition-all active:translate-y-1 active:shadow-nodePressed",
          speakState === "unsupported" && "cursor-not-allowed bg-ink/10 text-ink/30 shadow-none",
          speakState === "listening" && "animate-pulse bg-torii",
          speakState === "idle" &&
            status === "idle" &&
            "bg-indigo hover:-translate-y-0.5",
          status === "correct" && "bg-matcha shadow-none",
          status === "wrong" && "bg-torii/70 shadow-none"
        )}
      >
        <Mic size={32} />
      </button>

      <div className="min-h-[3.25rem] text-center">
        {speakState === "listening" && (
          <p className="text-sm font-semibold text-ink/50">Mendengarkan…</p>
        )}
        {speakState === "unsupported" && !isChecked && (
          <p className="max-w-[15rem] text-xs text-ink/40">
            Browser ini belum mendukung latihan bicara. Lewati saja soal ini.
          </p>
        )}
        {speakNote && status === "correct" && (
          <p className="text-sm text-gold-deep">
            Nyaris tepat! Ucapan yang benar:{" "}
            <span className="font-semibold">{speakNote}</span>
          </p>
        )}
        {speakNote && status === "wrong" && (
          <p className="text-sm text-torii">{speakNote}</p>
        )}
        {status === "wrong" && !speakNote && (
          <p className="text-sm text-ink/50">
            Belum pas kedengarannya. Coba dengarkan dulu, lalu ulangi.
          </p>
        )}
        {/* Pesan error sementara (jaringan/tidak kedengaran/gagal lain) —
            muncul selagi status masih "idle" karena belum sempat ada hasil
            (onResult) sama sekali, jadi harus dicek terpisah dari status
            correct/wrong di atas supaya tetap kelihatan. */}
        {status === "idle" && speakState === "idle" && speakNote && (
          <p className="mb-1 text-sm text-torii">{speakNote}</p>
        )}
        {status === "idle" && speakState === "idle" && (
          <button
            onClick={onSkip}
            className="text-xs font-bold uppercase tracking-wide text-ink/30 underline-offset-2 hover:text-ink/50 hover:underline"
          >
            Tak bisa bicara sekarang
          </button>
        )}
      </div>
    </div>
  );
}

function FooterAction({
  status,
  exercise,
  canCheck,
  onCheck,
}: {
  status: "idle" | "correct" | "wrong";
  exercise: Exercise;
  canCheck: boolean;
  onCheck: () => void;
}) {
  if (exercise.type !== "type_romaji") return null;

  return (
    <AnimatePresence mode="wait">
      {status === "idle" && (
        <motion.div
          key="check-bar"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          // Fixed di dasar layar (bukan mengikuti alur konten) supaya tombol
          // ini SELALU terlihat & bisa ditekan, tidak peduli seberapa
          // panjang konten di atasnya atau apakah keyboard sedang terbuka.
          // z-[60] memastikan tombol ini di atas nav/elemen fixed lainnya.
          className="fixed inset-x-0 bottom-0 z-[60] border-t-2 border-ink/5 bg-washi/95 px-4 pb-safe pt-4 backdrop-blur-md sm:px-8"
        >
          <div className="mx-auto max-w-2xl">
            <button
              disabled={!canCheck}
              onClick={onCheck}
              className={cn(
                "w-full rounded-2xl py-4 text-center font-display text-base font-bold uppercase tracking-wide text-white shadow-node transition-all active:translate-y-1 active:shadow-nodePressed",
                canCheck ? "bg-matcha" : "cursor-not-allowed bg-ink/10 text-ink/30 shadow-none"
              )}
            >
              Periksa
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
