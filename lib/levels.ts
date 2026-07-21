export type Level = {
  rank: number;
  title: string;
  minXp: number;
  icon: string;
};

export const LEVELS: Level[] = [
  { rank: 1, title: "Pemula", minXp: 0, icon: "🌱" },
  { rank: 2, title: "Pelajar", minXp: 100, icon: "📘" },
  { rank: 3, title: "Pelajar Rajin", minXp: 300, icon: "📗" },
  { rank: 4, title: "Menengah", minXp: 600, icon: "🎋" },
  { rank: 5, title: "Menengah Mahir", minXp: 1000, icon: "🏮" },
  { rank: 6, title: "Mahir", minXp: 1600, icon: "⛩️" },
  { rank: 7, title: "Ahli", minXp: 2400, icon: "🗾" },
  { rank: 8, title: "Sesepuh", minXp: 3500, icon: "🎌" },
  { rank: 9, title: "Master", minXp: 5000, icon: "🏆" },
  { rank: 10, title: "Native-level", minXp: 7500, icon: "🌸" },
];

export function getLevel(xp: number): Level {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.minXp) current = l;
    else break;
  }
  return current;
}

export function getNextLevel(xp: number): Level | null {
  const current = getLevel(xp);
  const idx = LEVELS.findIndex((l) => l.rank === current.rank);
  return LEVELS[idx + 1] || null;
}

export function levelProgress(xp: number): {
  current: Level;
  next: Level | null;
  percent: number;
  xpIntoLevel: number;
  xpForNext: number;
} {
  const current = getLevel(xp);
  const next = getNextLevel(xp);
  if (!next) {
    return { current, next: null, percent: 100, xpIntoLevel: xp - current.minXp, xpForNext: 0 };
  }
  const span = next.minXp - current.minXp;
  const into = xp - current.minXp;
  return {
    current,
    next,
    percent: Math.min(100, Math.round((into / span) * 100)),
    xpIntoLevel: into,
    xpForNext: next.minXp - xp,
  };
}
