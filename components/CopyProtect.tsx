"use client";

import { useEffect } from "react";

// Bahasa target yang BOLEH disalin (kosakata yang sedang dipelajari).
// Elemen yang menampilkan teks ini ditandai dengan atribut HTML `lang`
// (mis. <span lang="ja">日本語</span>) lewat komponen ClickableText, chart
// Hiragana, dan daftar "Perlu Dilatih Lagi". Semua teks LAIN (arti Bahasa
// Indonesia, UI, instruksi, dsb.) tidak punya penanda ini sehingga tetap
// default ke `lang="id"` dari <html> dan tetap terproteksi seperti biasa.
const COPYABLE_LANGS = new Set(["ja", "en", "zh", "ar", "ru"]);

/**
 * Proteksi konten tambahan di level JavaScript (di luar CSS user-select).
 * Memblokir klik-kanan (context menu), copy/cut, dan drag-select teks di
 * seluruh halaman — KECUALI kolom input/textarea (supaya pengguna tetap
 * bisa mengetik jawaban) dan teks bahasa target (Jepang/Inggris/Mandarin/
 * Arab) yang memang boleh disalin. Arti/terjemahan Bahasa Indonesia tetap
 * tidak bisa disalin.
 */
export default function CopyProtect() {
  useEffect(() => {
    const isFormField = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
    };

    // Cek apakah target event ada di dalam elemen yang ditandai `lang` dengan
    // salah satu bahasa target (ja/en/zh/ar). Kalau ya, biarkan copy/select
    // jalan normal untuk elemen itu.
    const isCopyableTarget = (target: EventTarget | null) => {
      const node = target as Node | null;
      const el =
        node instanceof Element ? node : node?.parentElement ?? null;
      if (!el) return false;
      const langEl = el.closest("[lang]");
      const lang = langEl?.getAttribute("lang");
      return !!lang && COPYABLE_LANGS.has(lang);
    };

    const shouldAllow = (target: EventTarget | null) =>
      isFormField(target) || isCopyableTarget(target);

    const blockContextMenu = (e: MouseEvent) => {
      if (shouldAllow(e.target)) return;
      e.preventDefault();
    };

    const blockCopyCut = (e: ClipboardEvent) => {
      if (shouldAllow(e.target)) return;
      e.preventDefault();
    };

    const blockSelectStart = (e: Event) => {
      if (shouldAllow(e.target)) return;
      e.preventDefault();
    };

    const blockDragStart = (e: DragEvent) => {
      if (shouldAllow(e.target)) return;
      e.preventDefault();
    };

    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("copy", blockCopyCut);
    document.addEventListener("cut", blockCopyCut);
    document.addEventListener("selectstart", blockSelectStart);
    document.addEventListener("dragstart", blockDragStart);

    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("copy", blockCopyCut);
      document.removeEventListener("cut", blockCopyCut);
      document.removeEventListener("selectstart", blockSelectStart);
      document.removeEventListener("dragstart", blockDragStart);
    };
  }, []);

  return null;
}
