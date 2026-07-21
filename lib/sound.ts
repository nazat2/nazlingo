"use client";

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/**
 * Siapkan AudioContext lebih awal, di dalam interaksi pertama pengguna
 * (tap/klik/keydown di mana saja). Browser modern (terutama Chrome) hanya
 * mengizinkan AudioContext "start" kalau dipicu oleh gesture pengguna asli —
 * kalau tidak, ia cuma mencatat warning di console (bukan error, efek suara
 * tetap tersimpan & langsung jalan begitu ada gesture pertama). Memanggil
 * ini di titik gesture pertama membuat context sudah "running" duluan,
 * jadi warning-nya tidak pernah muncul sama sekali.
 */
export function unlockAudio() {
  getContext();
}

function tone(
  freq: number,
  startTime: number,
  duration: number,
  audioCtx: AudioContext,
  gainPeak = 0.08,
  type: OscillatorType = "sine"
) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

/** Nada dua-not naik yang ceria untuk jawaban benar. */
export function playCorrectSound() {
  const audioCtx = getContext();
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    tone(587.33, now, 0.12, audioCtx); // D5
    tone(880, now + 0.09, 0.18, audioCtx); // A5
  } catch {
    // Diam saja kalau browser memblokir audio (mis. belum ada interaksi pengguna)
  }
}

/** Nada rendah pendek untuk jawaban salah — bukan menghukum, hanya penanda netral. */
export function playWrongSound() {
  const audioCtx = getContext();
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    tone(220, now, 0.16, audioCtx, 0.07, "triangle");
  } catch {
    // Diam saja
  }
}

/** Fanfare singkat untuk layar selesai pelajaran / pencapaian terbuka. */
export function playSuccessFanfare() {
  const audioCtx = getContext();
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      tone(freq, now + i * 0.09, 0.22, audioCtx, 0.06);
    });
  } catch {
    // Diam saja
  }
}
