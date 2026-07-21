"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { UserProgress } from "@/lib/types";
import {
  loadProgress,
  saveProgress,
  touchStreak,
  syncDailyQuest,
  unlockAchievement,
  defaultProgress,
} from "@/lib/progress";
import { checkNewAchievements, Achievement, ACHIEVEMENTS } from "@/data/achievements";
import { getLevel, Level } from "@/lib/levels";
import { initVoices, unlockSpeech } from "@/lib/tts";
import { unlockAudio } from "@/lib/sound";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";

type Ctx = {
  progress: UserProgress;
  setProgress: (updater: (p: UserProgress) => UserProgress) => void;
  ready: boolean;
  justUnlocked: Achievement[];
  dismissAchievement: (id: string) => void;
  justLeveledUp: Level | null;
  dismissLevelUp: () => void;
};

const ProgressCtx = createContext<Ctx | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  // Penting: state awal HARUS sama persis di server & client (defaultProgress),
  // jangan langsung baca localStorage di sini — itu menyebabkan hydration mismatch
  // karena HTML dari server (tanpa localStorage) beda dengan render pertama di client.
  // Data asli dari localStorage baru dimuat di useEffect di bawah (setelah mount).
  const [progress, setProgressState] = useState<UserProgress>(defaultProgress());
  const [ready, setReady] = useState(false);
  const [justUnlocked, setJustUnlocked] = useState<Achievement[]>([]);
  const [justLeveledUp, setJustLeveledUp] = useState<Level | null>(null);

  const { user, authReady } = useAuth();
  const syncedUidRef = useRef<string | null>(null);

  const hasMounted = useRef(false);
  const prevUnlockedRef = useRef<string[]>([]);
  const prevLevelRankRef = useRef<number | null>(null);

  useEffect(() => {
    let p = loadProgress();
    p = touchStreak(p);
    p = syncDailyQuest(p);
    setProgressState(p);
    saveProgress(p);
    prevUnlockedRef.current = p.unlockedAchievements;
    prevLevelRankRef.current = getLevel(p.xp).rank;
    setReady(true);
    hasMounted.current = true;
    initVoices();

    // Buka kunci Web Speech API & AudioContext begitu ada interaksi pertama
    // dari pengguna (wajib di Safari/iOS & memenuhi kebijakan Chrome supaya
    // audio latihan & efek suara benar-jawaban/salah-jawaban tidak
    // didiamkan browser atau memicu warning "AudioContext not allowed").
    // Listener sekali-pakai, dilepas otomatis setelah trigger pertama.
    const unlock = () => {
      unlockSpeech();
      unlockAudio();
    };
    document.addEventListener("pointerdown", unlock, { once: true, passive: true });
    document.addEventListener("keydown", unlock, { once: true });
    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []);

  // Terapkan tema (light/dark) ke elemen <html> supaya varian `dark:` Tailwind aktif.
  //
  // BUG LAMA (penyebab "kedipan ke mode terang" pas loading): state awal
  // `progress` SELALU `defaultProgress()` (tema "light") demi mencegah
  // hydration mismatch — nilai ASLI dari localStorage baru masuk lewat
  // `setProgressState(p)` di efek atas, yang baru berlaku di render
  // BERIKUTNYA (setState itu async). Jadi pada render pertama, efek ini
  // sempat jalan dengan progress.theme="light" walau pengguna sebenarnya
  // pakai tema gelap — mencopot class "dark" yang sudah ditempel duluan
  // oleh script inline di <head>, lalu baru dipasang lagi begitu progres
  // asli selesai dimuat. Hasilnya: kedipan gelap→terang→gelap yang sekilas
  // tapi kelihatan, terutama di device yang agak lambat baca localStorage.
  //
  // FIX: tunggu `ready` (baru true setelah progres asli selesai dimuat)
  // sebelum efek ini boleh menyentuh class "dark" sama sekali. Sebelum itu,
  // biarkan class dari script <head> apa adanya — sudah benar sejak awal.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!ready) return;
    document.documentElement.classList.toggle("dark", progress.theme === "dark");
  }, [progress.theme, ready]);

  // --- Sinkronisasi cloud (Firestore) ---
  // Begitu pengguna login, tarik progres yang tersimpan di cloud untuk akun
  // itu. Kalau ini pertama kalinya akun tsb login (belum ada dokumen di
  // Firestore), unggah progres tamu (localStorage) yang sedang berjalan
  // sekarang supaya tidak hilang. Berjalan sekali per uid (ditandai lewat
  // syncedUidRef) supaya tidak looping/menimpa ulang setiap render.
  useEffect(() => {
    if (!authReady || !user) {
      if (!user) syncedUidRef.current = null;
      return;
    }
    if (syncedUidRef.current === user.uid) return;
    syncedUidRef.current = user.uid;

    let cancelled = false;
    (async () => {
      const database = await getFirebaseDb();
      if (!database || cancelled) return;
      try {
        const { doc, getDoc, setDoc } = await import("firebase/firestore");
        const ref = doc(database, "progress", user.uid);
        const snap = await getDoc(ref);
        if (cancelled) return;
        if (snap.exists()) {
          let remote = { ...defaultProgress(), ...(snap.data() as Partial<UserProgress>) };
          remote = touchStreak(remote);
          remote = syncDailyQuest(remote);
          setProgressState(remote);
          saveProgress(remote);
        } else {
          setProgressState((current) => {
            setDoc(ref, current).catch(() => {});
            return current;
          });
        }
      } catch {
        // Offline / gagal ambil dari Firestore — tetap lanjut pakai data
        // lokal yang sudah ada, nanti otomatis dicoba lagi saat progress berubah.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authReady]);

  // Setiap progress berubah DAN pengguna sedang login, kirim salinan
  // terbaru ke Firestore. Di-debounce 800ms supaya tidak menembak Firestore
  // di setiap keystroke/klik kecil.
  useEffect(() => {
    if (!ready || !authReady || !user) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const database = await getFirebaseDb();
      if (!database || cancelled) return;
      const { doc, setDoc } = await import("firebase/firestore");
      setDoc(doc(database, "progress", user.uid), progress).catch(() => {
        // Offline — akan tersinkron lagi begitu progress berubah berikutnya
      });
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [progress, user, ready, authReady]);

  // Deteksi pencapaian & kenaikan level lewat efek terpisah (bukan di dalam state updater)
  // supaya updater tetap murni dan tidak memicu efek samping ganda di React Strict Mode.
  useEffect(() => {
    if (!hasMounted.current) return;

    const newIds = progress.unlockedAchievements.filter(
      (id) => !prevUnlockedRef.current.includes(id)
    );
    if (newIds.length > 0) {
      const newAchievements = ACHIEVEMENTS.filter((a) => newIds.includes(a.id));
      setJustUnlocked((q) => [...q, ...newAchievements]);
    }
    prevUnlockedRef.current = progress.unlockedAchievements;

    const currentRank = getLevel(progress.xp).rank;
    if (prevLevelRankRef.current !== null && currentRank > prevLevelRankRef.current) {
      setJustLeveledUp(getLevel(progress.xp));
    }
    prevLevelRankRef.current = currentRank;
  }, [progress.unlockedAchievements, progress.xp]);

  const setProgress = useCallback((updater: (p: UserProgress) => UserProgress) => {
    setProgressState((prev) => {
      let next = updater(prev);

      // Cek pencapaian baru — transformasi data murni, tanpa memicu state lain di sini
      const newlyUnlocked = checkNewAchievements(next);
      for (const a of newlyUnlocked) {
        next = unlockAchievement(next, a.id);
      }

      saveProgress(next);
      return next;
    });
  }, []);

  const dismissAchievement = useCallback((id: string) => {
    setJustUnlocked((q) => q.filter((a) => a.id !== id));
  }, []);

  const dismissLevelUp = useCallback(() => {
    setJustLeveledUp(null);
  }, []);

  return (
    <ProgressCtx.Provider
      value={{
        progress,
        setProgress,
        ready,
        justUnlocked,
        dismissAchievement,
        justLeveledUp,
        dismissLevelUp,
      }}
    >
      {children}
    </ProgressCtx.Provider>
  );
}

export function useProgress() {
  const ctx = useContext(ProgressCtx);
  if (!ctx) throw new Error("useProgress harus dipakai di dalam ProgressProvider");
  return ctx;
}
