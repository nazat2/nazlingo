"use client";

import { LanguageCode, LANGUAGES, getLanguageMeta } from "@/lib/languages";

// Sebelumnya file ini punya salinan sendiri map kode-bahasa -> tag BCP-47
// (mis. "ja" -> "ja-JP"), padahal info yang sama persis sudah ada di
// lib/languages.ts (field `speechLang`). Data yang sama disimpan dobel di
// dua tempat gampang lupa disinkronkan — persis yang kejadian di sini: pas
// nambah bahasa baru (zh, ar), salinan di file ini ketinggalan gak
// di-update sampai bikin error build. Sekarang ambil langsung dari satu
// sumber kebenaran biar gak bisa "lupa" lagi.
function speechTagFor(lang: LanguageCode): string {
  return getLanguageMeta(lang).speechLang;
}

const cachedVoices: Partial<Record<LanguageCode, SpeechSynthesisVoice | null>> = {};
let voicesReady = false;
let unlocked = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let speakSeq = 0;

function synth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis || null;
}

/** Apakah browser ini mendukung Web Speech API sama sekali. Bisa dipakai UI
 *  untuk sembunyikan/nonaktifkan tombol suara kalau memang tidak didukung. */
export function isSpeechSupported(): boolean {
  return !!synth();
}

function refreshVoiceCache() {
  const s = synth();
  if (!s) return;
  const voices = s.getVoices();
  if (!voices || voices.length === 0) return;
  voicesReady = true;
  (LANGUAGES.map((l) => l.code)).forEach((lang) => {
    const tag = speechTagFor(lang).toLowerCase();
    const prefix = tag.split("-")[0];
    // Utamakan kecocokan locale persis (mis. "ja-jp"), baru fallback ke
    // kecocokan awalan bahasa saja (mis. suara "ja-JP" atau varian lain).
    const exact = voices.find((v) => v.lang?.toLowerCase() === tag);
    const partial = voices.find((v) => v.lang?.toLowerCase().startsWith(prefix));
    cachedVoices[lang] = exact || partial || null;
  });
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function pickVoice(lang: LanguageCode): SpeechSynthesisVoice | null {
  if (cachedVoices[lang] === undefined) refreshVoiceCache();
  return cachedVoices[lang] ?? null;
}

/**
 * Inisialisasi daftar suara. Aman dipanggil berkali-kali (idempotent).
 * Beberapa browser — terutama Safari/iOS — kadang tidak pernah memicu event
 * `voiceschanged` sama sekali, jadi selain listener event kita juga polling
 * singkat (maks ~5 detik) sebagai jaring pengaman supaya suara tetap
 * ke-load tanpa perlu refresh manual.
 */
export function initVoices() {
  const s = synth();
  if (!s) return;
  refreshVoiceCache();
  s.onvoiceschanged = () => refreshVoiceCache();
  if (!voicesReady && !pollTimer) {
    let tries = 0;
    pollTimer = setInterval(() => {
      tries += 1;
      refreshVoiceCache();
      if (voicesReady || tries > 20) {
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = null;
      }
    }, 250);
  }
}

/**
 * "Buka kunci" audio dengan interaksi pengguna pertama (tap/klik di mana
 * saja di aplikasi). Wajib untuk Safari/iOS: kalau speechSynthesis.speak()
 * belum pernah dipanggil di dalam sebuah user-gesture asli, panggilan
 * berikutnya lewat setTimeout/effect otomatis bisa didiamkan browser tanpa
 * ada error sama sekali — jadi kelihatannya seperti "tombol suara kadang
 * gak bunyi" padahal sebenarnya browser yang menahan. Cukup dipanggil
 * sekali per sesi; panggilan berikutnya no-op.
 */
export function unlockSpeech() {
  const s = synth();
  if (!s || unlocked) return;
  unlocked = true;
  try {
    const utter = new SpeechSynthesisUtterance(" ");
    utter.volume = 0;
    s.speak(utter);
  } catch {
    // Diam saja — kalau gagal, speakText tetap akan dicoba normal nanti.
  }
}

/** Apakah voice untuk bahasa ini SUDAH DIPASTIKAN tidak ada di
 *  browser/device ini (bukan sekadar "belum sempat dicek"). Dipakai UI
 *  untuk menampilkan pesan "suara belum tersedia" ke pengguna, bukan cuma
 *  diam tanpa penjelasan. Sengaja mengembalikan `false` selama daftar voice
 *  belum pernah selesai dimuat sama sekali (voicesReady masih false),
 *  supaya tidak salah menampilkan pesan sebelum sempat dicek. */
export function isVoiceMissing(lang: LanguageCode): boolean {
  pickVoice(lang); // pastikan sudah pernah dicoba di-refresh
  return voicesReady && cachedVoices[lang] === null;
}

/** Ucapkan teks memakai suara bahasa yang sesuai (default: Bahasa Jepang).
 *  `rateOverride` opsional untuk memutar lebih lambat (mis. tombol "putar
 *  pelan"). Aman dipanggil berkali-kali dengan cepat (mis. auto-play saat
 *  soal muncul lalu pengguna langsung tap tombol suara) — panggilan lama
 *  otomatis dibatalkan tanpa membuat dua suara tumpang tindih, dan tidak
 *  pernah melempar error ke pemanggil kalau browser tidak mendukung TTS. */
export function speakText(text: string, lang: LanguageCode = "ja", rateOverride?: number) {
  const s = synth();
  if (!s || !text) return;
  const mySeq = ++speakSeq;
  try {
    s.cancel();
  } catch {
    // Diam saja
  }
  // Chrome punya bug lama: speak() yang dipanggil persis sesudah cancel()
  // kadang didiamkan begitu saja (tidak bersuara, tidak ada error). Kasih
  // jeda sepersekian detik supaya antrian ucapan browser sempat kosong dulu.
  setTimeout(() => {
    if (mySeq !== speakSeq) return; // sudah ada speakText lain yang lebih baru
    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = speechTagFor(lang);
      utter.rate = rateOverride ?? (lang === "ja" ? 0.85 : 0.92);
      const voice = pickVoice(lang);
      if (voice) utter.voice = voice;
      utter.onerror = () => {
        // Gagal diam-diam saja — jangan sampai fitur suara bikin latihan macet.
      };
      s.speak(utter);
    } catch {
      // Diam saja kalau browser tidak mendukung TTS
    }
  }, 60);
}

/** @deprecated Pakai speakText(text, "ja") — dipertahankan untuk kompatibilitas. */
export function speakJapanese(text: string) {
  speakText(text, "ja");
}
