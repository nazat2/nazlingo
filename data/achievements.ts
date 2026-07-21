import { UserProgress } from "@/lib/types";

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  isUnlocked: (p: UserProgress) => boolean;
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_lesson",
    title: "Langkah Pertama",
    description: "Selesaikan pelajaran pertamamu",
    icon: "🌱",
    isUnlocked: (p) => Object.values(p.lessonProgress).some((l) => l.completed),
  },
  {
    id: "streak_3",
    title: "Mulai Terbiasa",
    description: "Capai 3 hari beruntun",
    icon: "🔥",
    isUnlocked: (p) => p.streak >= 3,
  },
  {
    id: "streak_7",
    title: "Seminggu Penuh",
    description: "Capai 7 hari beruntun",
    icon: "🔥",
    isUnlocked: (p) => p.streak >= 7,
  },
  {
    id: "streak_30",
    title: "Sebulan Konsisten",
    description: "Capai 30 hari beruntun",
    icon: "🏆",
    isUnlocked: (p) => p.streak >= 30,
  },
  {
    id: "words_25",
    title: "Kolektor Kata",
    description: "Pelajari 25 kosakata",
    icon: "📚",
    isUnlocked: (p) => Object.keys(p.wordStats).length >= 25,
  },
  {
    id: "words_75",
    title: "Kamus Berjalan",
    description: "Pelajari 75 kosakata",
    icon: "📖",
    isUnlocked: (p) => Object.keys(p.wordStats).length >= 75,
  },
  {
    id: "words_150",
    title: "Penguasa Kosakata",
    description: "Pelajari 150 kosakata",
    icon: "🈴",
    isUnlocked: (p) => Object.keys(p.wordStats).length >= 150,
  },
  {
    id: "lessons_10",
    title: "Rajin Belajar",
    description: "Selesaikan 10 pelajaran",
    icon: "✏️",
    isUnlocked: (p) => Object.values(p.lessonProgress).filter((l) => l.completed).length >= 10,
  },
  {
    id: "perfect_lesson",
    title: "Sempurna!",
    description: "Selesaikan pelajaran dengan akurasi 100%",
    icon: "💯",
    isUnlocked: (p) => Object.values(p.lessonProgress).some((l) => l.bestScore >= 100),
  },
  {
    id: "xp_500",
    title: "Pengumpul XP",
    description: "Kumpulkan 500 XP total",
    icon: "⚡",
    isUnlocked: (p) => p.xp >= 500,
  },
  {
    id: "master_word",
    title: "Kata yang Melekat",
    description: "Kuasai satu kata sampai box tertinggi",
    icon: "🌟",
    isUnlocked: (p) => Object.values(p.wordStats).some((w) => w.box >= 5),
  },
];

export function checkNewAchievements(
  p: UserProgress
): Achievement[] {
  return ACHIEVEMENTS.filter(
    (a) => !p.unlockedAchievements.includes(a.id) && a.isUnlocked(p)
  );
}
