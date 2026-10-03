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
import { speakText, stopSpeaking, runWhenSpeechIdle } from "@/lib/tts";
import { playCorrectSound, playWrongSound } from "@/lib/sound";
import { checkTypedAnswer } from "@/lib/answers";
import {
  isSpeechRecognitionSupported,
  listenOnce,
  checkPronunciation,
} from "@/lib/speech";
import { Mic } from "lucide-react";

type Props = {
  exercise: Exercise;
  onResult: (correct: boolean) => void;
  /** Soal dilewati tanpa dinilai (mis. soal bicara saat tidak bisa bicara):
   *  TIDAK dihitung benar maupun salah dan tidak mengubah progres kata. */
  onSkip?: () => void;
};

const TYPED_TYPES: Exercise["type"][] = ["type_meaning", "type_target"];

export default function ExerciseCard({ exercise, onResult, onSkip }: Props) {
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
  // Kunci "sudah dijawab" yang berlaku SEKETIKA (ref), bukan menunggu render
  // ulang seperti state `status`. Tanpa ini, ketukan ganda cepat / Enter lalu
  // klik tombol Periksa bisa mengirim hasil dua kali dan menghitung jawaban
  // dobel (XP & statistik kata ikut dobel).
  const resolvedRef = useRef(false);

  useEffect(() => {
    resolvedRef.current = false;
    setSelected(null);
    setStatus("idle");
    setTyped("");
    setBuilt([]);
    setRemaining(exercise.scrambled || []);
    setTypoNote(null);
    setSpeakNote(null);
    setSpeakState(isSpeechRecognitionSupported() ? "idle" : "unsupported");
    let autoplay: ReturnType<typeof setTimeout> | null = null;
    if (exercise.type === "listen_choose" && exercise.jp) {
      autoplay = setTimeout(() => speakText(exercise.jp!, exercise.lang), 350);
    }
    return () => {
      if (autoplay) clearTimeout(autoplay);
      // Kalau pengguna pindah soal (mis. tekan "Lanjut") sementara mic masih
      // aktif dengar, hentikan dulu supaya hasilnya tidak "nyasar" ke soal
      // berikutnya. Suara kata soal ini juga dihentikan supaya tidak
      // terdengar tumpang tindih dengan soal berikutnya.
      stopListeningRef.current?.();
      stopListeningRef.current = null;
      stopSpeaking();
    };
  }, [exercise]);

  const isChecked = status !== "idle";

  function playFeedback(correct: boolean) {
    if (!progress.soundEnabled) return;
    // Tunggu ucapan kata yang sedang main selesai dulu — bunyi "ting" yang
    // menabrak TTS bisa memotong suara kata di sebagian HP.
    runWhenSpeechIdle(() => {
      if (correct) playCorrectSound();
      else playWrongSound();
    });
  }

  /** Satu-satunya pintu keluar hasil jawaban: pasti hanya terkirim SEKALI per soal. */
  function resolve(correct: boolean) {
    if (resolvedRef.current) return false;
    resolvedRef.current = true;
    setStatus(correct ? "correct" : "wrong");
    playFeedback(correct);
    onResult(correct);
    return true;
  }

  function commitChoice(optionId: string, correct: boolean) {
    if (resolvedRef.current) return;
    setSelected(optionId);
    resolve(correct);
  }

  function checkTyped() {
    if (resolvedRef.current || typed.trim().length === 0) return;
    const result = checkTypedAnswer(exercise, typed);
    const correct = result !== "wrong";
    if (!resolve(correct)) return;
    if (result === "typo") setTypoNote(exercise.answerDisplay ?? exercise.meaning ?? null);
  }

  function checkBuild(nextBuilt: string[]) {
    if (!exercise.answer) return;
    if (nextBuilt.length !== (exercise.scrambled?.length || 0)) return;
    resolve(nextBuilt.join("") === exercise.answer);
  }

  function startSpeaking() {
    if (resolvedRef.current || speakState === "listening" || !exercise.answer) return;
    setSpeakState("listening");
    setSpeakNote(null);
    stopListeningRef.current = listenOnce(exercise.lang, {
      onResult: (transcript) => {
        const result = checkPronunciation(transcript, exercise.answer!);
        const correct = result !== "wrong";
        if (!resolve(correct)) return;
        if (result === "close") setSpeakNote(exercise.jp || exercise.answer!);
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

  // Dilewati TANPA dinilai: tidak dihitung benar (jadi tidak mengangkat
  // akurasi / level hafalan kata secara palsu) dan tidak dihitung salah
  // (app ini memang tidak punya nyawa/penalti, dan pengguna di tempat umum
  // tidak boleh dipaksa bicara). Soal langsung dilanjut ke berikutnya.
  function skipSpeak() {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    stopListeningRef.current?.();
    stopListeningRef.current = null;
    onSkip?.();
  }

  return (
    <div
      // pb-32: beri ruang kosong di dasar konten yang bisa discroll, supaya
      // tombol "Periksa" (soal ketik, sebelum dijawab) maupun banner
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

        {TYPED_TYPES.includes(exercise.type) && (
          <TypedAnswerBlock
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
          (TYPED_TYPES.includes(exercise.type) && typed.trim().length > 0) ||
          (exercise.type === "build_word" &&
            built.length === (exercise.scrambled?.length || 0) &&
            built.length > 0)
        }
        onCheck={() => {
          if (TYPED_TYPES.includes(exercise.type)) checkTyped();
        }}
      />
    </div>
  );
}

function Instruction({ type, lang }: { type: Exercise["type"]; lang: LanguageCode }) {
  // Istilah "cara baca" berbeda tiap bahasa (romaji / pinyin / transliterasi /
  // ejaan) — diambil dari readingLabel per bahasa (lib/languages.ts), bukan
  // hardcode "romaji" untuk semuanya.
  const meta = getLanguageMeta(lang);
  const text: Record<Exercise["type"], string> = {
    mc_jp_to_id: "Apa artinya?",
    mc_id_to_jp: "Pilih kata yang tepat",
    // Disamakan dengan mc_jp_to_id ("Apa artinya?") karena soal ini juga
    // menampilkan teks kata targetnya (lihat listenChoose() di
    // lib/exercises.ts) — bukan cuma tombol audio tanpa konteks.
    listen_choose: "Apa artinya?",
    type_meaning: "Tulis artinya dalam Bahasa Indonesia",
    type_target: `Tulis dalam ${meta.label}`,
    match_pairs: "Jodohkan pasangannya",
    build_word: `Susun jadi ${meta.readingLabel} yang benar`,
    speak: "Ucapkan kalimat ini",
  };
  // Petunjuk tambahan di bawah judul soal.
  let sub: string | null = null;
  if (type === "type_target") {
    sub = meta.latinScript
      ? `Ketik katanya dalam huruf biasa.${meta.typingNote ? " " + meta.typingNote : ""}`
      : `Boleh pakai huruf asli atau cara baca (${meta.readingLabel}).`;
  }
  return (
    <div>
      <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">
        {text[type]}
      </h2>
      {sub && <p className="mt-1 text-sm text-ink/50">{sub}</p>}
    </div>
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
        {exercise.hint && (
          <p className="mt-1 text-sm text-ink/45">({exercise.hint})</p>
        )}
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

function TypedAnswerBlock({
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
  const meta = getLanguageMeta(exercise.lang);
  const isMeaning = exercise.type === "type_meaning";

  return (
    <div className="flex flex-col items-center gap-6">
      {isMeaning ? (
        // Terjemahkan ke Indonesia: tampilkan kata bahasa target (+ suara).
        // Ketuk kata menampilkan arti Indonesianya (gaya Duolingo), sama
        // seperti di soal lain.
        <div className="flex items-center gap-4 rounded-2xl bg-surface p-6 shadow-card">
          <SpeakButton text={exercise.jp || ""} lang={exercise.lang} />
          <div>
            <ClickableText
              text={exercise.jp || ""}
              lang={exercise.lang}
              className="font-display text-3xl font-bold"
            />
            {showRomaji && exercise.romaji && !meta.latinScript && (
              <p className="mt-1 font-mono text-sm text-ink/50">{exercise.romaji}</p>
            )}
          </div>
        </div>
      ) : (
        // Tulis dalam bahasa target: tampilkan arti Indonesia saja (tanpa
        // tombol suara — suara akan membocorkan jawabannya).
        <div className="rounded-2xl bg-surface p-6 text-center shadow-card">
          <p className="font-display text-3xl font-bold text-ink">{exercise.prompt}</p>
          {exercise.hint && (
            <p className="mt-1 text-sm text-ink/45">({exercise.hint})</p>
          )}
        </div>
      )}
      <input
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        onKeyDown={(e) => {
          // Saat mengetik dengan IME (Jepang/Mandarin/dll), Enter dipakai untuk
          // MEMILIH hasil konversi huruf — jangan dianggap "kirim jawaban".
          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
          if (e.key === "Enter" && status === "idle" && typed.trim().length > 0) {
            onSubmit();
          }
        }}
        disabled={status !== "idle"}
        placeholder={
          isMeaning ? "ketik artinya di sini…" : `ketik dalam ${meta.label.toLowerCase()}…`
        }
        lang={isMeaning ? "id" : undefined}
        dir={isMeaning ? undefined : "auto"}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        autoFocus
        className={cn(
          "w-full max-w-sm rounded-2xl border-2 bg-surface px-5 py-4 text-center text-lg shadow-card outline-none transition-colors",
          isMeaning ? "font-sans" : "font-mono",
          status === "idle" && "border-ink/10 focus:border-indigo",
          status === "correct" && "border-matcha bg-matcha-pale text-matcha-deep",
          status === "wrong" && "border-torii bg-torii/5 text-torii animate-shake"
        )}
      />
      {status === "correct" && typoNote && (
        <p className="text-sm text-gold-deep">
          Nyaris tepat! Penulisan yang benar:{" "}
          <span className="font-bold">{typoNote}</span>
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
            // dengan blok soal ketik yang sudah benar dari awal.
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
  if (!TYPED_TYPES.includes(exercise.type)) return null;

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
