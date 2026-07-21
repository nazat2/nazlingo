// Daftar bahasa target yang bisa dipelajari di Nazlingo.
// Menambah bahasa baru di masa depan cukup dengan menambah entri di sini
// dan membuat file data/curriculum.<kode>.ts yang sesuai.

export type LanguageCode = "ja" | "en" | "zh" | "ar" | "ru";

export type LanguageMeta = {
  code: LanguageCode;
  /** Nama bahasa dalam Bahasa Indonesia, mis. "Bahasa Jepang" */
  label: string;
  /** Nama bahasa dalam bahasa itu sendiri, mis. "日本語" */
  nativeName: string;
  flag: string;
  /** Tag BCP-47 untuk text-to-speech, mis. "ja-JP" */
  speechLang: string;
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  /** Arah baca kata dalam bahasa target ini. Default "ltr" kalau tidak diisi.
   *  Belum dipakai buat ubah layout (UI masih LTR di semua halaman), tapi
   *  disiapkan di sini supaya kalau nanti mau bikin tampilan RTL khusus
   *  Bahasa Arab, tidak perlu ubah tipe data lagi dari awal. */
  dir?: "ltr" | "rtl";
  /** Sebutan buat "cara baca dengan huruf Latin" yang khas bahasa ini —
   *  dipakai di teks instruksi soal (mis. "Ketik cara bacanya (...)").
   *  BUG LAMA: sebelumnya kata "romaji" (istilah khusus Bahasa Jepang)
   *  dipakai hardcode untuk SEMUA bahasa, padahal istilah yang benar beda-
   *  beda: Mandarin pakai "pinyin", Arab pakai "transliterasi", dan Inggris
   *  sebenarnya tidak butuh istilah apa pun karena sudah huruf Latin asli
   *  (jadi latihannya lebih pas disebut "ejaan"). */
  readingLabel: string;
};

export const LANGUAGES: LanguageMeta[] = [
  {
    code: "ja",
    label: "Bahasa Jepang",
    nativeName: "日本語",
    flag: "🇯🇵",
    speechLang: "ja-JP",
    heroTitle: "日本語を学ぼう",
    heroSubtitle: "Belajar Bahasa Jepang dari nol",
    heroDescription:
      "Kosakata, cara baca romaji, dan latihan berulang — pelan-pelan sampai benar-benar lancar. Tanpa terburu-buru, tanpa bikin pusing.",
    readingLabel: "romaji",
  },
  {
    code: "en",
    label: "Bahasa Inggris",
    nativeName: "English",
    flag: "🇺🇸",
    speechLang: "en-US",
    heroTitle: "Let's Learn English",
    heroSubtitle: "Belajar Bahasa Inggris dari nol",
    heroDescription:
      "Kosakata, cara pengucapan, dan latihan berulang — pelan-pelan sampai benar-benar lancar. Tanpa terburu-buru, tanpa bikin pusing.",
    readingLabel: "ejaan",
  },
  {
    code: "zh",
    label: "Bahasa Mandarin",
    nativeName: "中文",
    flag: "🇨🇳",
    speechLang: "zh-CN",
    heroTitle: "学习中文",
    heroSubtitle: "Belajar Bahasa Mandarin dari nol",
    heroDescription:
      "Kosakata, cara baca pinyin, dan latihan berulang — pelan-pelan sampai benar-benar lancar. Tanpa terburu-buru, tanpa bikin pusing.",
    readingLabel: "pinyin",
  },
  {
    code: "ar",
    label: "Bahasa Arab",
    nativeName: "العربية",
    flag: "🇸🇦",
    speechLang: "ar-SA",
    heroTitle: "تعلم العربية",
    heroSubtitle: "Belajar Bahasa Arab dari nol",
    heroDescription:
      "Kosakata, cara baca transliterasi, dan latihan berulang — pelan-pelan sampai benar-benar lancar. Tanpa terburu-buru, tanpa bikin pusing.",
    dir: "rtl",
    readingLabel: "transliterasi",
  },
  {
    code: "ru",
    label: "Bahasa Rusia",
    nativeName: "Русский",
    flag: "🇷🇺",
    speechLang: "ru-RU",
    heroTitle: "Изучаем русский",
    heroSubtitle: "Belajar Bahasa Rusia dari nol",
    heroDescription:
      "Kosakata, cara baca transliterasi, dan latihan berulang — pelan-pelan sampai benar-benar lancar. Tanpa terburu-buru, tanpa bikin pusing.",
    readingLabel: "transliterasi",
  },
];

export const DEFAULT_LANGUAGE: LanguageCode = "ja";

/**
 * Identitas visual per bahasa buat banner Hero di halaman utama (dan tempat
 * lain yang butuh nuansa "khas bahasa ini"). Sebelumnya banner Hero HARDCODE
 * pakai gradien indigo + motif gelombang laut Jepang (seigaiha) untuk SEMUA
 * bahasa — jadi pas lagi belajar Inggris/Mandarin/Arab, banner-nya tetap
 * kerasa "bertema Jepang". Sekarang tiap bahasa punya gradien warna, motif
 * dekoratif, dan aksen warna sendiri:
 * - Jepang: gradien indigo + motif gelombang (seigaiha) — tetap seperti semula.
 * - Inggris: gradien hijau matcha + motif garis kotak (kesan "buku catatan").
 * - Mandarin: gradien merah torii + motif belah ketupat (lattice).
 * - Arab: gradien emas + motif geometris kisi bintang, gaya ornamen Islami/Arab
 *   yang umum dipakai di desain (bukan simbol keagamaan tertentu).
 * - Rusia: gradien biru-merah (nuansa dingin ke hangat) + motif "embun beku"
 *   garis silang tipis, kesan musim dingin khas Rusia.
 */
export type LanguageTheme = {
  /** Kelas gradien latar utama (didefinisikan di tailwind.config: backgroundImage) */
  gradient: string;
  /** Kelas motif dekoratif (didefinisikan di globals.css) */
  motif: string;
  /** Kelas warna 2 lingkaran blur dekoratif tambahan di banner */
  blurA: string;
  blurB: string;
};

export const LANGUAGE_THEME: Record<LanguageCode, LanguageTheme> = {
  ja: { gradient: "bg-grad-indigo", motif: "motif-waves", blurA: "bg-torii/40", blurB: "bg-gold/30" },
  en: { gradient: "bg-grad-matcha", motif: "motif-grid", blurA: "bg-gold/35", blurB: "bg-sakura/30" },
  zh: { gradient: "bg-grad-torii", motif: "motif-diamonds", blurA: "bg-gold/35", blurB: "bg-indigo-light/30" },
  ar: { gradient: "bg-grad-gold", motif: "motif-stars", blurA: "bg-indigo-light/35", blurB: "bg-torii/30" },
  ru: { gradient: "bg-grad-crimson", motif: "motif-frost", blurA: "bg-gold/30", blurB: "bg-indigo-light/35" },
};

export function getLanguageTheme(code: LanguageCode): LanguageTheme {
  return LANGUAGE_THEME[code] ?? LANGUAGE_THEME[DEFAULT_LANGUAGE];
}

export function getLanguageMeta(code: LanguageCode): LanguageMeta {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

export function isLanguageCode(value: string | null | undefined): value is LanguageCode {
  return !!value && LANGUAGES.some((l) => l.code === value);
}
