"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useProgress } from "@/lib/ProgressContext";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { toggleRomaji, toggleTheme, toggleSound, resetAllProgress } from "@/lib/progress";
import { getLessonsFor } from "@/data/curriculum";
import { ACHIEVEMENTS } from "@/data/achievements";
import { levelProgress } from "@/lib/levels";
import {
  Flame,
  Gem,
  Star,
  Zap,
  Type,
  Trash2,
  Moon,
  Sun,
  Trophy,
  ChevronRight,
  TrendingUp,
  Volume2,
  VolumeX,
  LogOut,
  Cloud,
  Languages,
} from "lucide-react";
import XpChart from "@/components/XpChart";
import WeakWords from "@/components/WeakWords";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function ProfilePage() {
  const { progress, setProgress, ready } = useProgress();
  const { user, authReady, authEnabled, signInWithGoogle, signOutUser, signingIn } = useAuth();
  const { language, languageMeta } = useLanguage();
  const [confirmingReset, setConfirmingReset] = useState(false);
  // Kalau foto profil Google gagal dimuat (CDN Google lagi lambat/timeout —
  // bukan masalah di kode kita), tampilkan avatar bulat default alih-alih
  // ikon gambar rusak.
  const [avatarFailed, setAvatarFailed] = useState(false);

  if (!ready || !authReady) return <ProfileSkeleton />;

  // Login wajib dulu sebelum data profil ditampilkan (kalau Firebase sudah
  // dikonfigurasi). Kalau developer belum setup Firebase (.env.local kosong),
  // authEnabled bernilai false — jangan sampai halaman ini malah terkunci
  // total dan tidak bisa diakses siapa pun.
  if (authEnabled && !user) {
    return <LoginGate onLogin={signInWithGoogle} signingIn={signingIn} />;
  }

  const lessonsForLanguage = getLessonsFor(language);
  const completedCount = lessonsForLanguage.filter(
    (l) => !!progress.lessonProgress[l.id]?.completed
  ).length;
  const totalLessons = lessonsForLanguage.length;
  const totalAnswers = progress.totalCorrect + progress.totalWrong;
  const accuracy =
    totalAnswers > 0 ? Math.round((progress.totalCorrect / totalAnswers) * 100) : 0;
  const lvl = levelProgress(progress.xp);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-8 md:pb-12">
      <div className="flex items-center gap-4">
        {user?.photoURL && !avatarFailed ? (
          <Image
            src={user.photoURL}
            alt={user.displayName || "Foto profil"}
            width={64}
            height={64}
            className="h-16 w-16 shrink-0 rounded-full object-cover"
            unoptimized
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-indigo font-display text-2xl font-bold text-white">
            学
          </div>
        )}
        <div>
          <h1 className="font-display text-xl font-bold">
            {user?.displayName || "Pelajar Bahasa"}
          </h1>
          <p className="text-sm text-ink/40">
            {user?.email ? `${user.email} · ` : ""}Bergabung sejak{" "}
            {new Date(progress.joinedAt).toLocaleDateString("id-ID", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {user && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-matcha-deep">
          <Cloud size={14} />
          Progres tersinkron ke akun Google-mu
        </div>
      )}

      {/* Kartu level/rank */}
      <div className="mt-6 rounded-2xl bg-gradient-to-br from-indigo to-indigo-deep p-5 text-white shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none">{lvl.current.icon}</span>
            <div>
              <p className="text-xs uppercase tracking-wide text-white/60">
                Level {lvl.current.rank}
              </p>
              <p className="font-display text-lg font-bold">{lvl.current.title}</p>
            </div>
          </div>
          <p className="font-mono text-sm font-semibold text-white/70">{progress.xp} XP</p>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-gold transition-all"
            style={{ width: `${lvl.percent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-white/60">
          {lvl.next
            ? `${lvl.xpForNext} XP lagi menuju ${lvl.next.icon} ${lvl.next.title}`
            : "Level tertinggi tercapai — luar biasa!"}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<Flame className="text-torii" />} value={progress.streak} label="Hari beruntun" />
        <Stat icon={<Zap className="text-gold-deep" />} value={progress.xp} label="Total XP" />
        <Stat icon={<Gem className="text-indigo" />} value={progress.gems} label="Permata" />
        <Stat
          icon={<Star className="text-matcha-deep" />}
          value={`${completedCount}/${totalLessons}`}
          label={`Pelajaran ${languageMeta.flag}`}
        />
      </div>

      <div className="md:grid md:grid-cols-2 md:gap-4">
        <QuickLink
          href="/achievements"
          icon={<Trophy className="text-gold-deep" size={20} />}
          title="Pencapaian"
          subtitle={`${progress.unlockedAchievements.length} dari ${ACHIEVEMENTS.length} terbuka`}
        />
        <QuickLink
          href="/shop"
          icon={<Gem className="text-indigo" size={20} />}
          title="Toko"
          subtitle="Tukar permata dengan pembeku streak"
        />
      </div>

      <div className="md:grid md:grid-cols-2 md:gap-4">
        <div className="mt-6 rounded-2xl bg-surface p-5 shadow-card">
          <h2 className="flex items-center gap-2 font-display text-base font-bold">
            <TrendingUp size={18} className="text-indigo" />
            XP 7 Hari Terakhir
          </h2>
          <div className="mt-4">
            <XpChart history={progress.xpHistory} />
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-surface p-5 shadow-card">
          <h2 className="font-display text-base font-bold">Perlu Dilatih Lagi</h2>
          <div className="mt-3">
            <WeakWords progress={progress} />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-surface p-5 shadow-card">
        <h2 className="font-display text-base font-bold">Statistik Latihan</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="flex items-center justify-between text-sm sm:flex-col sm:items-start sm:gap-1">
            <span className="text-ink/50">Jawaban benar</span>
            <span className="font-bold text-matcha-deep">{progress.totalCorrect}</span>
          </div>
          <div className="flex items-center justify-between text-sm sm:flex-col sm:items-start sm:gap-1">
            <span className="text-ink/50">Jawaban salah</span>
            <span className="font-bold text-torii">{progress.totalWrong}</span>
          </div>
          <div className="flex items-center justify-between text-sm sm:flex-col sm:items-start sm:gap-1">
            <span className="text-ink/50">Akurasi</span>
            <span className="font-bold text-indigo">{accuracy}%</span>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-surface p-5 shadow-card">
        <h2 className="font-display text-base font-bold">Pengaturan</h2>

        <div className="flex items-center justify-between gap-3 border-b border-ink/5 px-2 py-3">
          <div className="flex items-center gap-2.5">
            <Languages size={18} className="text-ink/40" />
            <span className="text-sm font-semibold text-ink">Bahasa yang dipelajari</span>
          </div>
          <LanguageSwitcher />
        </div>

        <SettingRow
          icon={
            progress.theme === "dark" ? (
              <Moon size={18} className="text-ink/40" />
            ) : (
              <Sun size={18} className="text-ink/40" />
            )
          }
          label="Mode gelap"
          checked={progress.theme === "dark"}
          onToggle={() => setProgress((p) => toggleTheme(p))}
        />
        <SettingRow
          icon={<Type size={18} className="text-ink/40" />}
          label="Tampilkan cara baca"
          checked={progress.showRomaji}
          onToggle={() => setProgress((p) => toggleRomaji(p))}
        />
        <SettingRow
          icon={
            progress.soundEnabled ? (
              <Volume2 size={18} className="text-ink/40" />
            ) : (
              <VolumeX size={18} className="text-ink/40" />
            )
          }
          label="Efek suara"
          checked={progress.soundEnabled}
          onToggle={() => setProgress((p) => toggleSound(p))}
        />

        {user && (
          <button
            onClick={() => signOutUser()}
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-torii transition-colors hover:bg-torii/5"
          >
            <LogOut size={18} />
            Keluar dari akun Google
          </button>
        )}
      </div>

      <div className="mt-6 rounded-2xl border-2 border-dashed border-torii/30 p-5">
        <h2 className="font-display text-sm font-bold text-torii">Zona Berbahaya</h2>
        <p className="mt-1 text-xs text-ink/40">
          Ini akan menghapus semua progres belajarmu di perangkat ini.
        </p>
        {!confirmingReset ? (
          <button
            onClick={() => setConfirmingReset(true)}
            className="mt-3 flex items-center gap-2 rounded-xl bg-torii/10 px-4 py-2 text-sm font-bold text-torii"
          >
            <Trash2 size={16} />
            Reset semua progres
          </button>
        ) : (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                setProgress(() => resetAllProgress());
                setConfirmingReset(false);
              }}
              className="rounded-xl bg-torii px-4 py-2 text-sm font-bold text-white"
            >
              Ya, hapus semua
            </button>
            <button
              onClick={() => setConfirmingReset(false)}
              className="rounded-xl bg-ink/5 px-4 py-2 text-sm font-bold text-ink/60"
            >
              Batal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingRow({
  icon,
  label,
  checked,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="mt-1 flex w-full items-center justify-between rounded-xl px-2 py-2 transition-colors hover:bg-ink/[0.02]"
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {label}
      </span>
      <Toggle checked={checked} />
    </button>
  );
}

function Toggle({ checked }: { checked: boolean }) {
  return (
    <span
      className={`h-6 w-11 rounded-full p-0.5 transition-colors ${
        checked ? "bg-matcha" : "bg-ink/15"
      }`}
    >
      <span
        className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </span>
  );
}

function QuickLink({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="mt-3 flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-card transition-transform hover:-translate-y-0.5"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink/[0.04]">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-display text-sm font-bold">{title}</p>
        <p className="text-xs text-ink/45">{subtitle}</p>
      </div>
      <ChevronRight size={18} className="text-ink/30" />
    </Link>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-surface p-4 shadow-card">
      {icon}
      <span className="font-display text-lg font-bold">{value}</span>
      <span className="text-center text-[11px] text-ink/40">{label}</span>
    </div>
  );
}

function LoginGate({
  onLogin,
  signingIn,
}: {
  onLogin: () => void;
  signingIn: boolean;
}) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-6 pb-24 pt-20 text-center md:pb-12">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo/10">
        <Cloud size={36} className="text-indigo" />
      </div>
      <h1 className="mt-6 font-display text-2xl font-bold">Masuk dulu, yuk</h1>
      <p className="mt-2 text-sm text-ink/50">
        Login dengan akun Google supaya progres belajarmu (XP, streak, kata
        yang sudah dipelajari) aman tersimpan di cloud dan bisa diakses dari
        perangkat mana pun.
      </p>

      <button
        onClick={onLogin}
        disabled={signingIn}
        className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-surface py-3.5 font-display text-sm font-bold text-ink shadow-node transition-transform active:translate-y-1 active:shadow-nodePressed disabled:opacity-60"
      >
        <GoogleLogo />
        {signingIn ? "Membuka jendela login…" : "Masuk dengan Google"}
      </button>

      <p className="mt-4 text-xs text-ink/35">
        Pilih akun Gmail mana pun yang kamu mau — satu klik, langsung masuk.
      </p>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4c-7.4 0-13.8 4.1-17.1 10.2z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.5c-2 1.5-4.6 2.5-7.6 2.5-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.9 39.6 16.4 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4 5.6l6.6 5.5C41.5 36 44 30.5 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-8 md:pb-12">
      <div className="flex items-center gap-4">
        <div className="skeleton h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <div className="skeleton h-4 w-40 rounded-md" />
          <div className="skeleton h-3 w-28 rounded-md" />
        </div>
      </div>
      <div className="skeleton mt-6 h-24 rounded-2xl" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-2xl" />
        ))}
      </div>
      <div className="skeleton mt-6 h-40 rounded-2xl" />
      <div className="skeleton mt-6 h-40 rounded-2xl" />
    </div>
  );
}
