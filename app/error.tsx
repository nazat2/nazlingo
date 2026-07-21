"use client";

import { useEffect } from "react";
import { RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Dicatat ke console browser supaya mudah ditelusuri saat development
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-torii/10 text-4xl">
        😵
      </div>
      <h1 className="font-display text-2xl font-bold text-ink">
        Ups, ada yang salah
      </h1>
      <p className="max-w-sm text-sm text-ink/50">
        Terjadi kesalahan tak terduga di halaman ini. Progres belajarmu aman
        tersimpan — coba muat ulang halamannya.
      </p>
      <div className="mt-2 flex gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-2xl bg-indigo px-5 py-3 font-display text-sm font-bold text-white shadow-node transition-transform active:translate-y-1 active:shadow-nodePressed"
        >
          <RefreshCcw size={16} />
          Coba Lagi
        </button>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-2xl bg-ink/5 px-5 py-3 font-display text-sm font-bold text-ink/60"
        >
          <Home size={16} />
          Beranda
        </Link>
      </div>
    </div>
  );
}
