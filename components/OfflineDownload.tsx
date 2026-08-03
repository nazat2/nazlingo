"use client";

import { useEffect, useState } from "react";
import { Download, Check, WifiOff, Loader2 } from "lucide-react";
import { ALL_LESSONS } from "@/data/curriculum";

// Halaman-halaman utama yang statis & sama buat semua orang (sudah juga
// di-precache otomatis oleh service worker pas pertama diinstal — daftar
// ini dipakai lagi di sini supaya tombol "Siapkan offline" bisa juga
// dipakai untuk MEMPERBARUI cache-nya kapan saja pengguna mau, tanpa harus
// menunggu service worker baru terpasang).
const MAIN_PAGES = ["/", "/achievements", "/alphabet", "/hiragana", "/profile", "/review", "/shop"];

const STORAGE_KEY = "nazlingo:offlineReadyAt";

type Status = "idle" | "unsupported" | "downloading" | "done" | "error";

export default function OfflineDownload() {
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [lastReady, setLastReady] = useState<string | null>(null);

  // Muat status terakhir dari localStorage, dan cek dukungan browser.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setLastReady(saved);
    } catch {
      // localStorage bisa saja tidak tersedia (mis. mode privat ketat) —
      // tombolnya tetap bisa dipakai, cuma statusnya tidak "diingat".
    }
  }, []);

  // Dengarkan laporan progress dari service worker selama proses download.
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    function handleMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "NAZLINGO_CACHE_PROGRESS") {
        setProgress({ done: data.done, total: data.total });
      }

      if (data.type === "NAZLINGO_CACHE_DONE") {
        setStatus("done");
        const now = new Date().toISOString();
        setLastReady(now);
        try {
          window.localStorage.setItem(STORAGE_KEY, now);
        } catch {
          // Abaikan kalau tidak bisa disimpan — tidak fatal.
        }
      }
    }

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, []);

  async function handleDownload() {
    if (!("serviceWorker" in navigator)) return;

    setStatus("downloading");
    setProgress({ done: 0, total: 0 });

    try {
      const registration = await navigator.serviceWorker.ready;
      const controller = registration.active;
      if (!controller) {
        setStatus("error");
        return;
      }

      // Satu halaman lesson contoh sudah cukup buat SEMUA lesson lain (lihat
      // penjelasan lengkap di public/sw.js pada networkFirstForLesson) —
      // jadi tidak perlu download ratusan halaman lesson satu-satu.
      const sampleLesson = ALL_LESSONS[0];
      const urls = [
        ...MAIN_PAGES,
        ...(sampleLesson ? [`/lesson/${sampleLesson.unitId}/${sampleLesson.id}`] : []),
      ];

      setProgress({ done: 0, total: urls.length });
      controller.postMessage({ type: "NAZLINGO_CACHE_URLS", urls });
    } catch {
      setStatus("error");
    }
  }

  if (status === "unsupported") return null;

  return (
    <div className="mt-1 rounded-xl border-b border-ink/5 px-2 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <WifiOff size={18} className="text-ink/40" />
          <div>
            <p className="text-sm font-semibold text-ink">Mode offline</p>
            <p className="text-xs text-ink/40">
              {status === "downloading" && progress.total > 0
                ? `Menyiapkan... ${progress.done}/${progress.total}`
                : status === "downloading"
                ? "Menyiapkan..."
                : lastReady
                ? `Siap dipakai offline · diperbarui ${new Date(lastReady).toLocaleString("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}`
                : "Belum disiapkan untuk offline"}
            </p>
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={status === "downloading"}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo/10 px-3 py-2 text-xs font-bold text-indigo transition-colors disabled:opacity-60"
        >
          {status === "downloading" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : status === "done" ? (
            <Check size={14} />
          ) : (
            <Download size={14} />
          )}
          {status === "downloading" ? "Memproses" : status === "done" ? "Diperbarui" : "Siapkan"}
        </button>
      </div>

      {status === "error" && (
        <p className="mt-2 text-xs text-torii">
          Gagal menyiapkan mode offline. Pastikan kamu sedang online dan coba lagi.
        </p>
      )}
    </div>
  );
}
