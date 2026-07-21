"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LanguageCode, getLanguageTheme } from "@/lib/languages";

export default function ExerciseHeader({
  progressPercent,
  lang,
}: {
  progressPercent: number;
  /** Opsional: kalau diisi, warna progress bar ikut nuansa gradien khas
   *  bahasa yang sedang dipelajari (lihat lib/languages.ts -
   *  LANGUAGE_THEME), bukan selalu hijau matcha polos — supaya kerasa
   *  "sedang belajar bahasa X", konsisten dengan banner Hero di beranda.
   *  Kalau tidak diisi, tetap pakai hijau matcha seperti sebelumnya. */
  lang?: LanguageCode;
}) {
  const router = useRouter();
  const gradient = lang ? getLanguageTheme(lang).gradient : "bg-matcha";

  return (
    <div className="flex items-center gap-3 px-4 pt-4 sm:gap-4 sm:px-0">
      <button
        onClick={() => router.push("/")}
        aria-label="Keluar dari pelajaran"
        className="text-ink/30 transition-colors hover:text-ink/60"
      >
        <X size={26} />
      </button>
      <div className="h-4 flex-1 overflow-hidden rounded-full bg-ink/10">
        <motion.div
          className={`h-full rounded-full ${gradient}`}
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}
