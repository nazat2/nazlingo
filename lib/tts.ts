"use client";

import { LanguageCode, LANGUAGES, getLanguageMeta } from "@/lib/languages";
import { toSpeakable } from "@/lib/speakable";

// =============================================================================
// Text-to-speech (suara kata) — versi yang dibuat tahan "kadang bunyi, kadang
// tidak, kadang terpotong".
//
// Web Speech API (speechSynthesis) terkenal rewel. Penyebab yang ditangani di
// sini, satu per satu:
//
//  1. Objek SpeechSynthesisUtterance yang tidak dipegang referensinya bisa
//     "dibersihkan" garbage collector di tengah ucapan (terutama Chrome) ->
//     suara terpotong / event "end" tidak pernah datang. SOLUSI: utterance
//     disimpan di variabel modul selama sesi ucapan berjalan.
//  2. speak() yang dipanggil persis sesudah cancel() sering didiamkan begitu
//     saja. SOLUSI: kalau memang ada ucapan lain yang harus dibatalkan, beri
//     jeda singkat; kalau tidak ada, langsung bunyi (tetap di dalam gesture
//     pengguna — penting untuk iOS/Safari).
//  3. Mesin suara bisa dalam keadaan "paused" (mis. setelah tab di
//     background) -> speak() tidak mengeluarkan suara. SOLUSI: resume() dulu.
//  4. Suara bisa gagal diam-diam (tidak ada error, tidak ada suara) atau
//     suara tertentu bermasalah (mis. voice online saat sinyal jelek).
//     SOLUSI: pengawas waktu — kalau ucapan tidak mulai dalam beberapa
//     detik, atau muncul error, ulangi otomatis (maks. 3x) dengan voice
//     berikutnya, terakhir dengan voice bawaan sistem.
//  5. Voice online (jaringan) lebih sering putus di tengah kalimat daripada
//     voice lokal di perangkat. SOLUSI: voice lokal diutamakan.
//  6. Dua permintaan nyaris bersamaan (suara otomatis saat soal muncul + user
//     langsung tap tombol suara) saling membatalkan -> kedengarannya
//     terpotong. SOLUSI: permintaan kembar untuk teks yang sama diabaikan.
//  7. Teks mentah kosakata kadang memuat catatan dalam kurung / tanda "/"
//     yang bikin ucapan aneh. SOLUSI: dibersihkan lewat toSpeakable().
//  8. Suara kata masih jalan saat pindah soal / tab disembunyikan. SOLUSI:
//     stopSpeaking() dipanggil saat soal berganti & saat halaman disembunyikan.
// =============================================================================

// Tag BCP-47 diambil dari satu sumber kebenaran (lib/languages.ts).
function speechTagFor(lang: LanguageCode): string {
  return getLanguageMeta(lang).speechLang;
}

const MAX_ATTEMPTS = 3; // percobaan pertama + 2x ulang otomatis
const CANCEL_SETTLE_MS = 80; // jeda setelah cancel() sebelum speak() lagi
const START_TIMEOUT_MS = 2200; // batas tunggu ucapan "mulai" sebelum dianggap gagal
const SAFETY_TIMEOUT_MS = 20000; // jaga-jaga kalau event "end" tidak pernah datang
const DUPLICATE_WINDOW_MS = 600; // permintaan kembar dalam rentang ini diabaikan

const rankedVoices: Partial<Record<LanguageCode, SpeechSynthesisVoice[]>> = {};
let voicesReady = false;
let unlocked = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let lifecycleBound = false;

type Session = {
  spoken: string;
  lang: LanguageCode;
  rate?: number;
  requestedAt: number;
  attempt: number;
  started: boolean;
  // Referensi KUAT ke utterance aktif (lihat poin 1 di atas).
  utter: SpeechSynthesisUtterance | null;
  startTimer: ReturnType<typeof setTimeout> | null;
  safetyTimer: ReturnType<typeof setTimeout> | null;
  settleTimer: ReturnType<typeof setTimeout> | null;
};

let current: Session | null = null;
let speakingNow = false;
let speakingText: string | null = null;
const listeners = new Set<() => void>();

function synth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis || null;
}

/** Apakah browser ini mendukung Web Speech API sama sekali. */
export function isSpeechSupported(): boolean {
  return !!synth();
}

// ---------------------------------------------------------------------------
// Status "sedang bicara" (untuk animasi tombol & menunda efek suara)
// ---------------------------------------------------------------------------

function setSpeaking(on: boolean, text: string | null) {
  if (speakingNow === on && speakingText === text) return;
  speakingNow = on;
  speakingText = on ? text : null;
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // listener yang error tidak boleh mengganggu suara
    }
  });
}

/** Apakah teks ini (sudah dibersihkan lewat toSpeakable) sedang diucapkan. */
export function isSpeakingText(spoken: string): boolean {
  return speakingNow && speakingText === spoken;
}

/** Apakah ada suara yang sedang diputar. */
export function isSpeaking(): boolean {
  return speakingNow;
}

/** Berlangganan perubahan status bicara. Mengembalikan fungsi berhenti-berlangganan. */
export function subscribeSpeaking(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Jalankan `fn` begitu tidak ada suara yang sedang diputar (atau setelah
 * `maxWaitMs`, mana lebih dulu). Dipakai supaya efek suara benar/salah tidak
 * menabrak ucapan kata yang masih berjalan — di sebagian HP Android, bunyi
 * "ting" dari AudioContext bisa memutus TTS yang sedang main.
 */
export function runWhenSpeechIdle(fn: () => void, maxWaitMs = 1500) {
  if (!speakingNow) {
    fn();
    return;
  }
  let done = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let unsubscribe: (() => void) | null = null;
  const run = () => {
    if (done) return;
    done = true;
    if (timer) clearTimeout(timer);
    if (unsubscribe) unsubscribe();
    fn();
  };
  unsubscribe = subscribeSpeaking(() => {
    if (!speakingNow) run();
  });
  timer = setTimeout(run, maxWaitMs);
}

// ---------------------------------------------------------------------------
// Daftar suara (voice)
// ---------------------------------------------------------------------------

function normLang(l: string | undefined): string {
  // Sebagian perangkat (Android) memakai "ja_JP", bukan "ja-JP".
  return (l || "").toLowerCase().replace(/_/g, "-");
}

function refreshVoiceCache() {
  const s = synth();
  if (!s) return;
  const voices = s.getVoices();
  if (!voices || voices.length === 0) return;
  voicesReady = true;
  LANGUAGES.forEach(({ code }) => {
    const tag = normLang(speechTagFor(code));
    const prefix = tag.split("-")[0];
    const scored: { v: SpeechSynthesisVoice; score: number; order: number }[] = [];
    voices.forEach((v, order) => {
      const vl = normLang(v.lang);
      let score: number;
      if (vl === tag) score = 4; // locale persis (mis. "ja-jp")
      else if (vl.split("-")[0] === prefix) score = 2; // bahasa sama, locale lain
      else return;
      // Voice lokal (ada di perangkat) jauh lebih jarang putus di tengah
      // ucapan daripada voice jaringan -> diutamakan.
      if (v.localService) score += 3;
      scored.push({ v, score, order });
    });
    scored.sort((a, b) => b.score - a.score || a.order - b.order);
    rankedVoices[code] = scored.map((x) => x.v);
  });
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function voiceForAttempt(lang: LanguageCode, attempt: number): SpeechSynthesisVoice | null {
  if (rankedVoices[lang] === undefined) refreshVoiceCache();
  const list = rankedVoices[lang];
  if (!list || list.length === 0) return null;
  // Percobaan 1: voice terbaik. Percobaan 2: voice kedua (kalau ada).
  // Percobaan 3: tanpa memilih voice sama sekali -> biar sistem yang memilih.
  if (attempt >= MAX_ATTEMPTS - 1) return null;
  return list[attempt] ?? null;
}

/** Apakah voice untuk bahasa ini SUDAH DIPASTIKAN tidak ada di browser/device
 *  ini (bukan sekadar "belum sempat dicek"). */
export function isVoiceMissing(lang: LanguageCode): boolean {
  if (rankedVoices[lang] === undefined) refreshVoiceCache();
  const list = rankedVoices[lang];
  return voicesReady && (!list || list.length === 0);
}

function bindLifecycle() {
  if (lifecycleBound || typeof document === "undefined") return;
  lifecycleBound = true;
  // Tab disembunyikan / halaman ditinggalkan -> hentikan suara (jangan
  // sampai nyangkut di antrian & muncul tiba-tiba, atau mesin suara jadi
  // "paused"). Kembali terlihat -> pastikan mesin tidak dalam keadaan pause.
  document.addEventListener("visibilitychange", () => {
    const s = synth();
    if (!s) return;
    if (document.hidden) {
      stopSpeaking();
    } else {
      try {
        s.resume();
      } catch {
        // diam saja
      }
    }
  });
  window.addEventListener("pagehide", () => stopSpeaking());
}

/**
 * Inisialisasi daftar suara. Aman dipanggil berkali-kali (idempotent).
 * Beberapa browser — terutama Safari/iOS — kadang tidak pernah memicu event
 * `voiceschanged` sama sekali, jadi selain listener event kita juga polling
 * singkat (maks ~5 detik) sebagai jaring pengaman.
 */
export function initVoices() {
  const s = synth();
  if (!s) return;
  bindLifecycle();
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
 * saja). Wajib untuk Safari/iOS: kalau speak() belum pernah dipanggil di
 * dalam user-gesture asli, panggilan berikutnya lewat timer/effect otomatis
 * bisa didiamkan browser tanpa error. Cukup sekali per sesi.
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
    // Diam saja — speakText tetap dicoba normal nanti.
  }
}

// ---------------------------------------------------------------------------
// Inti: satu sesi ucapan
// ---------------------------------------------------------------------------

function clearTimers(session: Session) {
  if (session.startTimer) clearTimeout(session.startTimer);
  if (session.safetyTimer) clearTimeout(session.safetyTimer);
  if (session.settleTimer) clearTimeout(session.settleTimer);
  session.startTimer = null;
  session.safetyTimer = null;
  session.settleTimer = null;
}

function finish(session: Session) {
  clearTimers(session);
  session.utter = null;
  if (current === session) {
    current = null;
    setSpeaking(false, null);
  }
}

function retry(session: Session) {
  if (current !== session) return;
  if (session.attempt >= MAX_ATTEMPTS - 1) {
    finish(session);
    return;
  }
  session.attempt += 1;
  begin(session);
}

/** Mulai (atau ulang) sesi: batalkan ucapan lain yang masih jalan, lalu putar. */
function begin(session: Session) {
  const s = synth();
  if (!s || current !== session) return;
  clearTimers(session);
  // Lepaskan utterance lama SEBELUM cancel(), supaya event "error/canceled"
  // dari utterance lama itu tidak dikira kegagalan sesi yang baru.
  session.utter = null;
  session.started = false;

  let hadActivity = false;
  try {
    hadActivity = s.speaking || s.pending || s.paused;
    if (hadActivity) s.cancel();
  } catch {
    // diam saja
  }

  if (hadActivity) {
    // Chrome sering mendiamkan speak() yang menempel dengan cancel().
    session.settleTimer = setTimeout(() => play(session), CANCEL_SETTLE_MS);
  } else {
    // Tidak ada yang perlu dibatalkan -> langsung bunyi (tetap di dalam
    // gesture pengguna kalau dipicu dari klik, penting untuk iOS).
    play(session);
  }
}

function play(session: Session) {
  const s = synth();
  if (!s || current !== session) return;
  session.settleTimer = null;

  try {
    s.resume();
  } catch {
    // diam saja
  }

  let utter: SpeechSynthesisUtterance;
  try {
    utter = new SpeechSynthesisUtterance(session.spoken);
  } catch {
    finish(session);
    return;
  }
  utter.lang = speechTagFor(session.lang);
  utter.rate = session.rate ?? (session.lang === "ja" ? 0.85 : 0.92);
  utter.pitch = 1;
  utter.volume = 1;
  const voice = voiceForAttempt(session.lang, session.attempt);
  if (voice) {
    utter.voice = voice;
    if (voice.lang) utter.lang = voice.lang;
  }

  const stillMine = () => current === session && session.utter === utter;
  utter.onstart = () => {
    if (!stillMine()) return;
    session.started = true;
    if (session.startTimer) clearTimeout(session.startTimer);
    session.startTimer = null;
    setSpeaking(true, session.spoken);
  };
  utter.onend = () => {
    if (!stillMine()) return;
    finish(session);
  };
  utter.onerror = (e: SpeechSynthesisErrorEvent) => {
    if (!stillMine()) return;
    // "interrupted"/"canceled" yang sampai ke sini (utterance masih aktif)
    // berarti diputus dari luar (mis. sistem merebut audio) -> coba lagi.
    // Error lain (synthesis-failed, audio-busy, network, ...) juga diulang
    // dengan voice berikutnya.
    void e;
    retry(session);
  };

  session.utter = utter; // referensi kuat sampai ucapan selesai

  // Pengawas: kalau tidak ada tanda "mulai" dalam beberapa detik, anggap
  // gagal diam-diam dan ulangi. TAPI kalau mesin suara sendiri masih
  // melaporkan sedang bicara / ada antrian (mis. mesin lambat start di HP
  // lawas, atau browser yang tidak mengirim event "start"), jangan ulangi —
  // itu justru akan memotong suara yang sebenarnya sedang jalan.
  let busyChecks = 0;
  const watch = () => {
    if (current !== session || session.utter !== utter || session.started) return;
    const engine = synth();
    const busy = !!engine && (engine.speaking || engine.pending);
    if (!busy) {
      retry(session);
      return;
    }
    busyChecks += 1;
    if (busyChecks <= 2) {
      session.startTimer = setTimeout(watch, START_TIMEOUT_MS);
    } else {
      // Mesin terus bilang "sibuk" tapi tidak ada event start: anggap sedang
      // bicara normal dan biarkan selesai sendiri.
      session.started = true;
      setSpeaking(true, session.spoken);
    }
  };
  session.startTimer = setTimeout(watch, START_TIMEOUT_MS);
  // Jaring pengaman terakhir kalau event "end" tidak pernah datang.
  session.safetyTimer = setTimeout(() => finish(session), SAFETY_TIMEOUT_MS);

  try {
    s.speak(utter);
  } catch {
    retry(session);
  }
}

/** Hentikan suara yang sedang/akan diputar. */
export function stopSpeaking() {
  const s = synth();
  const session = current;
  current = null;
  if (session) {
    clearTimers(session);
    session.utter = null;
  }
  setSpeaking(false, null);
  if (!s) return;
  try {
    if (s.speaking || s.pending) s.cancel();
  } catch {
    // diam saja
  }
}

/** Ucapkan teks memakai suara bahasa yang sesuai (default: Bahasa Jepang).
 *  `rateOverride` opsional untuk memutar lebih lambat. Aman dipanggil
 *  berkali-kali dengan cepat — ucapan lama dibatalkan tanpa tumpang tindih,
 *  permintaan kembar untuk teks yang sama diabaikan, dan tidak pernah
 *  melempar error kalau browser tidak mendukung TTS. */
export function speakText(text: string, lang: LanguageCode = "ja", rateOverride?: number) {
  const s = synth();
  if (!s) return;
  const spoken = toSpeakable(text);
  if (!spoken) return;

  const now = Date.now();
  if (
    current &&
    current.spoken === spoken &&
    current.lang === lang &&
    now - current.requestedAt < DUPLICATE_WINDOW_MS
  ) {
    return; // permintaan kembar (mis. suara otomatis + tap tombol) — biarkan yang pertama selesai
  }

  const previous = current;
  if (previous) clearTimers(previous);

  const session: Session = {
    spoken,
    lang,
    rate: rateOverride,
    requestedAt: now,
    attempt: 0,
    started: false,
    utter: null,
    startTimer: null,
    safetyTimer: null,
    settleTimer: null,
  };
  current = session;
  if (previous) previous.utter = null;
  setSpeaking(false, null);
  begin(session);
}

/** @deprecated Pakai speakText(text, "ja") — dipertahankan untuk kompatibilitas. */
export function speakJapanese(text: string) {
  speakText(text, "ja");
}
