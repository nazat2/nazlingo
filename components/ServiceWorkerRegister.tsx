"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Daftarkan hanya di produksi supaya tidak mengganggu proses development lokal
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Diam saja kalau gagal — aplikasi tetap berjalan normal tanpa PWA
    });
  }, []);

  return null;
}
