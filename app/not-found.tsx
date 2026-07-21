import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-5xl">🍡</p>
      <h1 className="font-display text-2xl font-bold">Halaman tidak ditemukan</h1>
      <p className="text-ink/50">Sepertinya halaman ini tersesat di suatu tempat.</p>
      <Link
        href="/"
        className="mt-4 rounded-2xl bg-indigo px-6 py-3 font-display font-bold text-white shadow-node"
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}
