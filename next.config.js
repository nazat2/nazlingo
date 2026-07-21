/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Hilangkan header "X-Powered-By: Next.js" — tidak memengaruhi fungsi
  // apa pun, cuma mengurangi informasi stack teknis yang terbuka ke publik.
  poweredByHeader: false,
  experimental: {
    // Next.js hanya mem-bundle bagian framer-motion yang benar-benar dipakai
    // di tiap halaman (bukan seluruh library), sedikit memperkecil ukuran
    // JS yang harus di-download & di-parse browser saat loading pertama.
    optimizePackageImports: ["framer-motion"],
  },
  images: {
    // Supaya foto profil akun Google (dari login) bisa dipakai lewat next/image
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

module.exports = nextConfig;
