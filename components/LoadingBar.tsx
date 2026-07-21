"use client";

export default function LoadingBar({
  progress,
  className = "",
}: {
  progress: number;
  className?: string;
}) {
  return (
    <div
      className={`h-2 overflow-hidden rounded-full bg-ink/10 ${className}`}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-torii via-gold to-matcha"
        style={{
          width: `${progress}%`,
          // Linear & durasinya pendek-konstan (bukan framer-motion tween
          // yang di-restart tiap update state) — begini browser cuma
          // nyambungin satu nilai ke nilai berikutnya secara halus tanpa
          // pernah "kejar-kejaran" sama animasi sebelumnya yang belum
          // selesai. Ini yang bikin bar-nya kerasa nyendat/​maju-mundur
          // sebelumnya.
          transition: "width 100ms linear",
        }}
      />
    </div>
  );
}
