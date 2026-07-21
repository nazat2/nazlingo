"use client";

import { useEffect, useRef, useState } from "react";

const START_PROGRESS = 6;

/**
 * Simulasi progress bar loading yang mulus & selalu monoton naik.
 *
 * PENYEBAB BUG LAMA ("kayak maju-mundur / gak smooth"): sebelumnya progress
 * di-update lewat `setInterval` tiap 120ms, lalu tiap update memicu ULANG
 * animasi framer-motion (`transition: 0.25s easeOut`) dari nilai sekarang ke
 * target baru. Karena 250ms > 120ms, animasi lama selalu keburu dipotong sama
 * animasi baru sebelum sempat selesai deselerasi (easeOut) — hasilnya laju
 * bar berubah-ubah tiap ~120ms (cepat→lambat→cepat→lambat) yang keliatan
 * kayak "gerak mundur" walau angkanya sendiri sebenarnya tidak pernah turun.
 *
 * Perbaikannya: hitung progress murni sebagai fungsi dari WAKTU YANG SUDAH
 * LEWAT (bukan dari nilai state sebelumnya secara rekursif), di-update tiap
 * frame lewat requestAnimationFrame. Karena update setiap ~16ms jauh lebih
 * rapat dari satu frame render, tidak ada lagi animasi CSS/framer yang perlu
 * "dikejar ulang" — hasilnya kurva naik yang benar-benar kontinu dan mulus.
 */
export function useSimulatedProgress(done: boolean, ceiling = 92) {
  const [progress, setProgress] = useState(START_PROGRESS);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (done) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setProgress(100);
      return;
    }

    startRef.current = null;
    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsedSec = (now - startRef.current) / 1000;
      // Kurva eksponensial: cepat di awal, melambat mendekati ceiling —
      // tapi SELALU monoton naik, tidak pernah nyentuh/mendahului ceiling
      // sebelum data beneran siap.
      const eased = ceiling - (ceiling - START_PROGRESS) * Math.exp(-elapsedSec * 1.1);
      setProgress(Math.min(ceiling, eased));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [done, ceiling]);

  return progress;
}
