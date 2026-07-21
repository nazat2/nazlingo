"use client";

import { useEffect, useState } from "react";

// Halaman ini SPESIAL: dipakai Next.js untuk mengganti SELURUH dokumen
// <html>/<body> kalau terjadi error fatal di root layout, jadi TIDAK ikut
// lewat app/layout.tsx sama sekali — termasuk script anti-kedip dark mode
// yang ada di sana. Makanya sebelumnya halaman ini SELALU tampil terang
// walau pengguna sudah pilih mode gelap, kerasa aneh/tidak konsisten kalau
// pas error kebetulan lagi dark mode. Sekarang baca preferensi yang sama
// dari localStorage (fallback aman ke terang kalau gagal/tidak ada).
function readSavedTheme(): "light" | "dark" {
  try {
    const raw =
      localStorage.getItem("nazlingo_progress_v1") ||
      localStorage.getItem("nihongo_progress_v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.theme === "dark") return "dark";
    }
  } catch {
    // Diam saja, fallback ke terang
  }
  return "light";
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    console.error(error);
    setTheme(readSavedTheme());
  }, [error]);

  const dark = theme === "dark";
  const bg = dark ? "#12141A" : "#FBF6EC";
  const fg = dark ? "#E8E4DA" : "#22252B";
  const fgMuted = dark ? "#E8E4DA99" : "#22252B99";

  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          padding: "24px",
          textAlign: "center",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          background: bg,
          color: fg,
          transition: "background-color 0.2s ease, color 0.2s ease",
        }}
      >
        <div style={{ fontSize: "48px" }}>⚠️</div>
        <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0 }}>
          Nazlingo mengalami masalah
        </h1>
        <p style={{ maxWidth: "360px", fontSize: "14px", color: fgMuted, margin: 0 }}>
          Terjadi kesalahan yang tidak terduga. Progres belajarmu tersimpan
          aman di perangkat ini — coba muat ulang aplikasi.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: "8px",
            padding: "12px 24px",
            borderRadius: "16px",
            border: "none",
            background: "#274472",
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Muat Ulang
        </button>
      </body>
    </html>
  );
}
