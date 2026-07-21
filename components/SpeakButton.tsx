"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { speakText, isVoiceMissing, isSpeechSupported } from "@/lib/tts";
import { cn } from "@/lib/cn";
import { LanguageCode } from "@/lib/languages";

// Pesan ini muncul kalau kita SUDAH sempat mengecek dan voice bahasa ini
// memang tidak ada di browser/device pengguna — bukan cuma diam tanpa
// penjelasan seperti sebelumnya. Dua penyebab paling umum yang kami temukan:
// (1) OS memang belum punya voice bahasa itu terinstall, atau (2) link-nya
// dibuka lewat in-app browser (Instagram/TikTok/dll) yang mesin suaranya
// dipangkas dan sering tidak mendukung banyak voice sama sekali.
const NOTICE_TEXT =
  "Suara belum tersedia di sini. Coba buka link ini langsung di Chrome, Edge, atau Safari (bukan dari dalam aplikasi Instagram/TikTok/dll), dan pastikan voice bahasa ini sudah terinstall di HP/laptopmu.";

export default function SpeakButton({
  text,
  lang = "ja",
  size = 22,
  className,
  autoLabel = "Dengarkan pengucapan",
}: {
  text: string;
  lang?: LanguageCode;
  size?: number;
  className?: string;
  autoLabel?: string;
}) {
  const [showNotice, setShowNotice] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    speakText(text, lang);

    // Voice untuk lang tertentu baru sempat dicek/di-cache pertama kali saat
    // speakText/pickVoice dipanggil, jadi tunggu sedikit sebelum menilai
    // status "tidak ada" — supaya tidak keliru nampilin notice terlalu dini.
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setTimeout(() => {
      if (!isSpeechSupported() || isVoiceMissing(lang)) {
        setShowNotice(true);
        hideTimer.current = setTimeout(() => setShowNotice(false), 6000);
      }
    }, 150);
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={handleClick}
        aria-label={autoLabel}
        className={cn(
          "flex items-center justify-center rounded-full bg-indigo/10 p-2.5 text-indigo transition-transform hover:scale-105 active:scale-95",
          className
        )}
      >
        <Volume2 size={size} />
      </button>

      {showNotice && (
        <div
          role="status"
          className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-xl border-2 border-ink/10 bg-surface p-3 text-xs leading-snug text-ink shadow-card"
        >
          {NOTICE_TEXT}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowNotice(false);
            }}
            className="mt-2 block w-full rounded-lg bg-indigo/10 py-1.5 text-center font-semibold text-indigo"
          >
            Oke, mengerti
          </button>
        </div>
      )}
    </span>
  );
}
