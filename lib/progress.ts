"use client";

import { UserProgress, WordStat, LessonProgress, XpDay } from "@/lib/types";
import { getLevel } from "@/lib/levels";

const KEY = "nazlingo_progress_v1";
const LEGACY_KEY = "nihongo_progress_v1"; // key lama sebelum rebranding, untuk migrasi otomatis
const DAY_MS = 1000 * 60 * 60 * 24;
const DAILY_QUEST_GOAL = 20; // XP dasar untuk level 1 (Pemula)
// Sebelumnya target misi harian FLAT 20 XP untuk semua orang di semua level.
// Efeknya: pemain yang levelnya sudah tinggi (dan makin cepat dapat XP per
// soal seiring makin lancar) bisa kelarin misi harian cuma dari 1 pelajaran
// singkat — jadi kerasa gak ada tantangan lagi. Sekarang target naik dikit
// tiap kenaikan level (dibatasi maksimal 2x lipat dasar) supaya tetap terasa
// relevan buat pemain yang sudah jauh, tanpa jadi terlalu berat di awal.
const DAILY_QUEST_GOAL_MAX_MULTIPLIER = 2;
const STREAK_FREEZE_COST = 10; // gems
const XP_HISTORY_DAYS = 30;

// Interval Leitner box (ms) - box 0..5
const BOX_INTERVALS = [0, DAY_MS, 2 * DAY_MS, 4 * DAY_MS, 7 * DAY_MS, 14 * DAY_MS];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function defaultProgress(): UserProgress {
  return {
    xp: 0,
    streak: 0,
    lastActiveDate: "",
    lessonProgress: {},
    wordStats: {},
    showRomaji: true,
    soundEnabled: true,
    joinedAt: Date.now(),
    totalCorrect: 0,
    totalWrong: 0,
    gems: 20,
    theme: "light",
    streakFreezes: 0,
    dailyQuestDate: "",
    dailyXp: 0,
    dailyQuestClaimed: false,
    xpHistory: [],
    unlockedAchievements: [],
  };
}

export function loadProgress(): UserProgress {
  if (typeof window === "undefined") return defaultProgress();
  try {
    let raw = localStorage.getItem(KEY);
    if (!raw) {
      // Migrasi otomatis dari nama aplikasi lama, supaya progres pengguna tidak hilang
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        raw = legacy;
        localStorage.setItem(KEY, legacy);
        localStorage.removeItem(LEGACY_KEY);
      }
    }
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as Partial<UserProgress>;
    return { ...defaultProgress(), ...parsed };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(p: UserProgress) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Diam saja kalau localStorage penuh/diblokir (mis. mode private browsing)
  }
}

/**
 * Perbarui streak harian. Kalau pengguna melewatkan satu hari tapi masih
 * punya "streak freeze", streak tetap aman dan satu freeze terpakai.
 */
export function touchStreak(p: UserProgress): UserProgress {
  const today = todayStr();
  if (p.lastActiveDate === today) return p;
  if (!p.lastActiveDate) {
    return { ...p, streak: 1, lastActiveDate: today };
  }
  const yesterday = new Date(Date.now() - DAY_MS).toISOString().slice(0, 10);
  if (p.lastActiveDate === yesterday) {
    return { ...p, streak: p.streak + 1, lastActiveDate: today };
  }
  const twoDaysAgo = new Date(Date.now() - 2 * DAY_MS).toISOString().slice(0, 10);
  if (p.lastActiveDate === twoDaysAgo && p.streakFreezes > 0) {
    return {
      ...p,
      streak: p.streak + 1,
      lastActiveDate: today,
      streakFreezes: p.streakFreezes - 1,
    };
  }
  return { ...p, streak: 1, lastActiveDate: today };
}

function ensureDailyQuest(p: UserProgress): UserProgress {
  const today = todayStr();
  if (p.dailyQuestDate === today) return p;
  return { ...p, dailyQuestDate: today, dailyXp: 0, dailyQuestClaimed: false };
}

function pushXpHistory(p: UserProgress, amount: number): XpDay[] {
  const today = todayStr();
  const history = [...p.xpHistory];
  const last = history[history.length - 1];
  if (last && last.date === today) {
    history[history.length - 1] = { date: today, xp: last.xp + amount };
  } else {
    history.push({ date: today, xp: amount });
  }
  return history.slice(-XP_HISTORY_DAYS);
}

export function addXp(p: UserProgress, amount: number): UserProgress {
  const withQuest = ensureDailyQuest(p);
  return {
    ...withQuest,
    xp: withQuest.xp + amount,
    dailyXp: withQuest.dailyXp + amount,
    xpHistory: pushXpHistory(withQuest, amount),
  };
}

export function recordAnswer(
  p: UserProgress,
  vocabId: string,
  wasCorrect: boolean
): UserProgress {
  const now = Date.now();
  const existing: WordStat = p.wordStats[vocabId] || {
    vocabId,
    box: 0,
    correct: 0,
    wrong: 0,
    lastSeen: now,
    due: now,
  };
  let box = existing.box;
  if (wasCorrect) {
    box = Math.min(box + 1, BOX_INTERVALS.length - 1);
  } else {
    box = Math.max(box - 1, 0);
  }
  const updated: WordStat = {
    ...existing,
    box,
    correct: existing.correct + (wasCorrect ? 1 : 0),
    wrong: existing.wrong + (wasCorrect ? 0 : 1),
    lastSeen: now,
    due: now + BOX_INTERVALS[box],
  };
  return {
    ...p,
    wordStats: { ...p.wordStats, [vocabId]: updated },
    totalCorrect: p.totalCorrect + (wasCorrect ? 1 : 0),
    totalWrong: p.totalWrong + (wasCorrect ? 0 : 1),
  };
}

export function completeLesson(
  p: UserProgress,
  lessonId: string,
  scorePercent: number
): UserProgress {
  const existing: LessonProgress = p.lessonProgress[lessonId] || {
    lessonId,
    completed: false,
    bestScore: 0,
    timesCompleted: 0,
  };
  const updated: LessonProgress = {
    lessonId,
    completed: true,
    bestScore: Math.max(existing.bestScore, scorePercent),
    timesCompleted: existing.timesCompleted + 1,
  };
  return { ...p, lessonProgress: { ...p.lessonProgress, [lessonId]: updated } };
}

export function isLessonCompleted(p: UserProgress, lessonId: string): boolean {
  return !!p.lessonProgress[lessonId]?.completed;
}

export function dueWordsCount(p: UserProgress): number {
  const now = Date.now();
  return Object.values(p.wordStats).filter((w) => w.due <= now && w.box < 5)
    .length;
}

export function getDueWordIds(p: UserProgress): string[] {
  const now = Date.now();
  return Object.values(p.wordStats)
    .filter((w) => w.due <= now && w.box < 5) // box 5 = sudah "master", tidak perlu diulang lagi
    .sort((a, b) => a.due - b.due)
    .map((w) => w.vocabId);
}

export function toggleRomaji(p: UserProgress): UserProgress {
  return { ...p, showRomaji: !p.showRomaji };
}

export function toggleSound(p: UserProgress): UserProgress {
  return { ...p, soundEnabled: !p.soundEnabled };
}

export function setTheme(p: UserProgress, theme: "light" | "dark"): UserProgress {
  return { ...p, theme };
}

export function toggleTheme(p: UserProgress): UserProgress {
  return { ...p, theme: p.theme === "dark" ? "light" : "dark" };
}

/** Menormalisasi field misi harian supaya selalu sesuai tanggal hari ini. */
export function syncDailyQuest(p: UserProgress): UserProgress {
  return ensureDailyQuest(p);
}

export function dailyQuestGoalFor(p: UserProgress): number {
  const rank = getLevel(p.xp).rank; // 1..10
  const steps = rank - 1; // 0 di level 1, naik satu-satu tiap level
  const multiplier = Math.min(
    DAILY_QUEST_GOAL_MAX_MULTIPLIER,
    1 + steps * 0.12
  );
  return Math.round((DAILY_QUEST_GOAL * multiplier) / 5) * 5; // dibulatkan ke kelipatan 5
}

export function dailyQuestProgress(
  p: UserProgress
): { current: number; goal: number; done: boolean } {
  const current = p.dailyQuestDate === todayStr() ? p.dailyXp : 0;
  const goal = dailyQuestGoalFor(p);
  return { current, goal, done: current >= goal };
}

export function buyStreakFreeze(p: UserProgress): UserProgress {
  if (p.gems < STREAK_FREEZE_COST) return p;
  return { ...p, gems: p.gems - STREAK_FREEZE_COST, streakFreezes: p.streakFreezes + 1 };
}

export function unlockAchievement(p: UserProgress, id: string): UserProgress {
  if (p.unlockedAchievements.includes(id)) return p;
  return {
    ...p,
    unlockedAchievements: [...p.unlockedAchievements, id],
    gems: p.gems + 5,
  };
}

export function resetAllProgress(): UserProgress {
  const fresh = defaultProgress();
  saveProgress(fresh);
  return fresh;
}

export { DAILY_QUEST_GOAL, STREAK_FREEZE_COST };
