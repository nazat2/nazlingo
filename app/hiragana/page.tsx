import { redirect } from "next/navigation";

// Halaman ini sudah dipindah & digeneralisasi jadi /alphabet (menyesuaikan
// bahasa yang lagi dipelajari — dulu di sini cuma khusus Jepang). Route lama
// ini tetap ada supaya bookmark/tautan lama tidak jadi 404, langsung
// diarahkan ke halaman barunya.
export default function HiraganaLegacyRedirect() {
  redirect("/alphabet");
}
