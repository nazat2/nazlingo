"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, RotateCcw, Type, User, Gem, Trophy } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/lib/LanguageContext";
import { LanguageCode } from "@/lib/languages";

const BASE_ITEMS = [
  { href: "/", label: "Belajar", icon: Home },
  { href: "/review", label: "Ulangi Kata", icon: RotateCcw },
  { href: "/achievements", label: "Pencapaian", icon: Trophy },
  { href: "/shop", label: "Toko", icon: Gem },
  { href: "/profile", label: "Profil", icon: User },
];

// BUG LAMA: label item ini dulu selalu "Huruf Kana" (istilah khusus sistem
// tulisan Jepang) untuk SEMUA bahasa. Sekarang labelnya menyesuaikan bahasa
// yang lagi dipelajari, dan item ini disembunyikan total untuk Bahasa
// Inggris karena tidak ada aksara terpisah yang perlu dipelajari (lihat
// app/alphabet/page.tsx buat detail lengkapnya per bahasa).
const ALPHABET_LABEL: Record<LanguageCode, string | null> = {
  ja: "Huruf Kana",
  zh: "Pinyin",
  ar: "Huruf Hijaiyah",
  ru: "Alfabet Cyrillic",
  en: null,
};

export default function SideNav() {
  const pathname = usePathname();
  const { language } = useLanguage();

  const alphabetLabel = ALPHABET_LABEL[language];
  const items = alphabetLabel
    ? [
        BASE_ITEMS[0],
        { href: "/alphabet", label: alphabetLabel, icon: Type },
        ...BASE_ITEMS.slice(1),
      ]
    : BASE_ITEMS;

  return (
    <aside className="sticky top-[65px] hidden h-[calc(100vh-65px)] w-56 shrink-0 flex-col gap-1 border-r border-ink/5 px-3 py-6 md:flex">
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold transition-colors",
              active
                ? "bg-indigo/10 text-indigo-deep"
                : "text-ink/50 hover:bg-ink/[0.03] hover:text-ink"
            )}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 2} />
            {item.label}
          </Link>
        );
      })}
    </aside>
  );
}
