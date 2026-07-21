// Tipe data inti aplikasi belajar bahasa asing (Jepang, Inggris, dst)
// Catatan: nama field `jp`/`romaji` dipertahankan dari versi awal (khusus
// Bahasa Jepang) tapi sekarang dipakai generik untuk bahasa apa pun:
// `jp` = kata dalam bahasa target, `romaji` = cara baca/pengucapan.

import { LanguageCode } from "@/lib/languages";

export type Vocab = {
  id: string; // unik: unitId-lessonId-index (sudah termasuk prefix bahasa)
  jp: string; // kata dalam bahasa target
  romaji: string; // cara baca / pengucapan
  id_: string; // arti dalam Bahasa Indonesia
  hint?: string; // catatan tambahan (opsional)
  example?: string; // contoh kalimat dalam bahasa target (opsional)
  exampleId?: string; // arti contoh kalimat dalam Bahasa Indonesia (opsional)
  lang: LanguageCode; // bahasa target kosakata ini
};

export type Lesson = {
  id: string;
  unitId: string;
  title: string;
  subtitle: string;
  vocab: Vocab[];
};

export type Unit = {
  id: string;
  index: number;
  title: string;
  titleJp: string;
  description: string;
  icon: string; // emoji ikon unit
  color: "indigo" | "torii" | "sakura" | "gold" | "matcha";
  lessons: Lesson[];
};

export type ExerciseType =
  | "mc_jp_to_id" // lihat kanji/kana, pilih arti Indonesia
  | "mc_id_to_jp" // lihat arti Indonesia, pilih kata Jepang
  | "listen_choose" // dengar suara, pilih arti
  | "type_romaji" // ketik romaji dari kata Jepang
  | "match_pairs" // jodohkan kata Jepang & Indonesia
  | "build_word" // susun huruf romaji jadi kata yang benar
  | "speak"; // ucapkan ulang kalimat/kata (speech-to-text, opsional bisa dilewati)

export type ExerciseOption = {
  id: string;
  label: string;
  sub?: string;
  correct: boolean;
};

export type Exercise = {
  id: string;
  type: ExerciseType;
  prompt: string;
  promptSub?: string;
  vocabId: string;
  jp?: string;
  romaji?: string;
  options?: ExerciseOption[];
  answer?: string; // untuk type_romaji / build_word
  meaning?: string; // arti Indonesia kata ini (ditampilkan saat jawaban benar)
  pairs?: { jp: string; romaji: string; id_: string }[]; // untuk match_pairs
  scrambled?: string[]; // untuk build_word
  example?: string; // contoh kalimat dalam bahasa target (opsional)
  exampleId?: string; // arti contoh kalimat (opsional)
  lang: LanguageCode; // bahasa target soal ini (untuk TTS & tampilan)
};

export type WordStat = {
  vocabId: string;
  box: number; // level Leitner box 0-5 (0 = baru, 5 = mahir)
  correct: number;
  wrong: number;
  lastSeen: number; // epoch ms
  due: number; // epoch ms kapan harus direview lagi
};

export type LessonProgress = {
  lessonId: string;
  completed: boolean;
  bestScore: number; // 0-100
  timesCompleted: number;
};

export type XpDay = {
  date: string; // YYYY-MM-DD
  xp: number;
};

export type Theme = "light" | "dark";

export type UserProgress = {
  xp: number;
  streak: number;
  lastActiveDate: string; // YYYY-MM-DD
  lessonProgress: Record<string, LessonProgress>;
  wordStats: Record<string, WordStat>;
  showRomaji: boolean;
  soundEnabled: boolean;
  joinedAt: number;
  totalCorrect: number;
  totalWrong: number;
  gems: number;
  theme: Theme;
  streakFreezes: number;
  dailyQuestDate: string; // YYYY-MM-DD, tanggal misi harian berjalan
  dailyXp: number; // XP yang didapat hari ini (untuk misi harian)
  dailyQuestClaimed: boolean;
  xpHistory: XpDay[]; // 30 hari terakhir untuk grafik
  unlockedAchievements: string[];
};
