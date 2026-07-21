"use client";

// CATATAN KETERBATASAN (biar jelas buat siapa pun yang baca ke depannya):
// Web Speech API cuma ngembaliin TEKS hasil dengarnya, bukan data audio
// mentah/nada suara. Jadi modul ini TIDAK BISA (dan tidak mencoba) menilai
// intonasi atau pitch accent Jepang — cuma menilai apakah kata/kalimat yang
// diucapkan match secara teks dengan yang seharusnya. Kalau suatu saat mau
// benar-benar menilai intonasi, itu perlu pendekatan lain sepenuhnya
// (analisis waveform/pitch pakai library audio terpisah), bukan sekadar
// perluasan dari kode di file ini.

import { LanguageCode, getLanguageMeta } from "@/lib/languages";
import { levenshtein } from "@/lib/levenshtein";

// Web Speech API (SpeechRecognition) belum termasuk di tipe DOM standar
// TypeScript, jadi didefinisikan minimal di sini sendiri (bukan `any` penuh)
// supaya kode pemanggilnya tetap type-safe. Cukup field yang benar-benar
// dipakai.
type SpeechRecognitionResultLike = { transcript: string };
type SpeechRecognitionEventLike = {
  results: { [index: number]: { [index: number]: SpeechRecognitionResultLike } };
};
type SpeechRecognitionErrorEventLike = { error: string };
interface SpeechRecognitionLike {
  lang: string;
  maxAlternatives: number;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

// Sama seperti di lib/tts.ts: ambil tag BCP-47 dari satu sumber kebenaran
// (lib/languages.ts) bukan salinan lokal, supaya nambah bahasa baru gak
// bisa lupa ketinggalan diperbarui di sini.

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/** Apakah browser ini mendukung pengenalan suara (speech-to-text) sama
 *  sekali. Dipakai UI untuk sembunyikan/nonaktifkan tombol mic kalau memang
 *  tidak didukung (mis. Firefox desktop, sebagian Safari lama). */
export function isSpeechRecognitionSupported(): boolean {
  return !!getRecognitionCtor();
}

export type SpeechListenError = "no-speech" | "not-allowed" | "network" | "other";

type ListenCallbacks = {
  onResult: (transcript: string) => void;
  onError?: (reason: SpeechListenError) => void;
  onEnd?: () => void;
};

/** Cek koneksi internet sebelum mulai dengar. Pengenalan suara di Chrome
 *  (dan sebagian besar browser lain) diproses lewat server Google, BUKAN
 *  di HP secara lokal — jadi kalau offline, mending gagal cepat dengan
 *  pesan jelas daripada nunggu lama terus error samar. */
export function isOnline(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.onLine !== "boolean") {
    // Kalau browser tidak expose navigator.onLine, anggap saja online —
    // biar tidak salah blokir di browser yang jarang dipakai.
    return true;
  }
  return navigator.onLine;
}

/**
 * Mulai satu sesi dengar (bukan continuous) untuk bahasa target. Otomatis
 * berhenti begitu pengguna diam sejenak (perilaku bawaan browser).
 * Mengembalikan fungsi `stop()` untuk membatalkan secara manual — penting
 * dipanggil kalau komponen unmount/berpindah soal sebelum pengguna selesai
 * bicara, supaya tidak ada callback "nyasar" ke soal yang sudah tidak aktif.
 */
export function listenOnce(lang: LanguageCode, callbacks: ListenCallbacks): () => void {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    // Tidak dukung sama sekali — beri tahu pemanggil lewat onError, jangan
    // sampai UI menunggu tanpa kepastian.
    callbacks.onError?.("other");
    return () => {};
  }

  if (!isOnline()) {
    // Gagal cepat: daripada nunggu recognition timeout/error samar dari
    // browser, langsung kasih tahu sebabnya spesifik (butuh internet).
    callbacks.onError?.("network");
    return () => {};
  }

  let stopped = false;
  let recognition: SpeechRecognitionLike;
  try {
    recognition = new Ctor();
  } catch {
    // Sebagian browser lama bisa throw sinkron kalau constructor dipanggil
    // tanpa konteks yang tepat (mis. dari iframe/lingkungan terbatas).
    callbacks.onError?.("other");
    return () => {};
  }
  recognition.lang = getLanguageMeta(lang).speechLang;
  recognition.maxAlternatives = 1;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    if (stopped) return;
    const transcript = event.results?.[0]?.[0]?.transcript ?? "";
    callbacks.onResult(transcript);
  };

  recognition.onerror = (event) => {
    if (stopped) return;
    if (event.error === "no-speech") callbacks.onError?.("no-speech");
    else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      callbacks.onError?.("not-allowed");
    } else if (event.error === "network") {
      // Kode error resmi browser buat "gagal terhubung ke layanan
      // pengenalan suara" — hampir selalu berarti koneksi bermasalah.
      callbacks.onError?.("network");
    } else callbacks.onError?.("other");
  };

  recognition.onend = () => {
    callbacks.onEnd?.();
  };

  try {
    recognition.start();
  } catch {
    // Bisa kejadian kalau start() dipanggil dobel dengan cepat (sesi
    // sebelumnya belum sempat benar-benar berhenti) — kasus nyata yang
    // baru ketahuan pas dipakai di HP asli, bukan cuma teori.
    callbacks.onError?.("other");
    return () => {};
  }

  return () => {
    stopped = true;
    try {
      recognition.abort();
    } catch {
      // Diam saja
    }
  };
}

export type PronunciationResult = "correct" | "close" | "wrong";

/**
 * Bandingkan transkrip hasil ucapan pengguna dengan teks target (kalimat
 * dalam bahasa target, mis. "ごはんです。" atau "good morning"), toleran
 * terhadap perbedaan kecil — spasi/tanda baca yang tidak selalu tertangkap
 * speech recognition, atau partikel Jepang yang samar terdengar.
 */
export function checkPronunciation(transcript: string, target: string): PronunciationResult {
  const clean = (s: string) => s.toLowerCase().replace(/[。、.,!?！？\s]/g, "");
  const a = clean(transcript);
  const b = clean(target);
  if (!a) return "wrong";
  if (a === b) return "correct";

  // Toleransi ~25% dari panjang target (minimal 1 karakter), supaya
  // sedikit salah tangkap tidak langsung dianggap gagal total.
  const tolerance = Math.max(1, Math.round(b.length * 0.25));
  return levenshtein(a, b) <= tolerance ? "close" : "wrong";
}
