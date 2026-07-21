"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, RotateCcw, Type, User } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/lib/LanguageContext";
import { LanguageCode } from "@/lib/languages";

const BASE_ITEMS = [
  { href: "/", label: "Belajar", icon: Home },
  { href: "/review", label: "Ulangi", icon: RotateCcw },
  { href: "/profile", label: "Profil", icon: User },
];

// BUG LAMA: label item ini dulu selalu "Kana" (istilah khusus sistem
// tulisan Jepang) untuk SEMUA bahasa. Sekarang labelnya menyesuaikan bahasa
// yang lagi dipelajari, dan item ini disembunyikan total untuk Bahasa
// Inggris karena tidak ada aksara terpisah yang perlu dipelajari (lihat
// app/alphabet/page.tsx buat detail lengkapnya per bahasa).
const ALPHABET_LABEL: Record<LanguageCode, string | null> = {
  ja: "Kana",
  zh: "Pinyin",
  ar: "Hijaiyah",
  en: null,
};

export default function BottomNav() {
  const pathname = usePathname();
  const { language } = useLanguage();

  // Sembunyikan nav bawah saat sedang mengerjakan pelajaran (mode fokus penuh
  // layar). Kalau tidak, nav ini yang fixed di posisi paling bawah akan
  // menutupi tombol "Periksa"/"Lanjut" yang juga berada di bagian bawah layar.
  if (pathname.startsWith("/lesson/")) return null;

  const alphabetLabel = ALPHABET_LABEL[language];
  const items = alphabetLabel
    ? [
        BASE_ITEMS[0],
        { href: "/alphabet", label: alphabetLabel, icon: Type },
        ...BASE_ITEMS.slice(1),
      ]
    : BASE_ITEMS;

  return (
    <nav className="glass fixed bottom-0 left-0 right-0 z-40 border-t border-ink/5 pb-safe shadow-[0_-4px_20px_-8px_rgba(34,37,43,0.08)] md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 transition-all",
                active ? "-translate-y-0.5 bg-indigo/10 text-indigo" : "text-ink/40"
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[11px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
