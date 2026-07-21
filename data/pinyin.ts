// Data referensi Pinyin — dipakai di halaman /alphabet saat bahasa yang
// dipelajari adalah Mandarin (padanan dari "Huruf Kana" punya Bahasa Jepang,
// tapi TIDAK diberi nama "Kana" karena Pinyin itu konsep yang beda: bukan
// aksara/huruf tersendiri, melainkan ejaan bunyi resmi Bahasa Mandarin yang
// memakai huruf Latin, dipakai berdampingan dengan Hanzi (aksara Mandarin).
//
// "声母" (shēngmǔ, konsonan awal) dan "韵母" (yùnmǔ, vokal akhir) adalah dua
// kelompok dasar yang selalu diajarkan lebih dulu sebelum belajar kosakata,
// persis seperti Hiragana/Katakana buat Bahasa Jepang.

export type PinyinItem = { native: string; reading: string };
export type PinyinRow = { label: string; items: (PinyinItem | null)[] };

// Konsonan awal (声母). Konsonan tunggal tidak punya bunyi kalau diucapkan
// sendirian, jadi menurut konvensi pengajaran Pinyin yang umum, tiap
// konsonan dipasangkan dengan vokal netral supaya bisa didengar & diucapkan
// (persis seperti buku pelajaran Mandarin pemula pada umumnya).
export const PINYIN_INITIAL_ROWS: PinyinRow[] = [
  {
    label: "b-p-m-f",
    items: [
      { native: "b", reading: "bo" },
      { native: "p", reading: "po" },
      { native: "m", reading: "mo" },
      { native: "f", reading: "fo" },
    ],
  },
  {
    label: "d-t-n-l",
    items: [
      { native: "d", reading: "de" },
      { native: "t", reading: "te" },
      { native: "n", reading: "ne" },
      { native: "l", reading: "le" },
    ],
  },
  {
    label: "g-k-h",
    items: [
      { native: "g", reading: "ge" },
      { native: "k", reading: "ke" },
      { native: "h", reading: "he" },
      null,
    ],
  },
  {
    label: "j-q-x",
    items: [
      { native: "j", reading: "ji" },
      { native: "q", reading: "qi" },
      { native: "x", reading: "xi" },
      null,
    ],
  },
  {
    label: "zh-ch-sh-r",
    items: [
      { native: "zh", reading: "zhi" },
      { native: "ch", reading: "chi" },
      { native: "sh", reading: "shi" },
      { native: "r", reading: "ri" },
    ],
  },
  {
    label: "z-c-s",
    items: [
      { native: "z", reading: "zi" },
      { native: "c", reading: "ci" },
      { native: "s", reading: "si" },
      null,
    ],
  },
];

// Vokal akhir (韵母). Beda dengan konsonan awal, ini sudah bisa diucapkan
// apa adanya, jadi "reading"-nya sama persis dengan ejaannya sendiri.
export const PINYIN_FINAL_ROWS: PinyinRow[] = [
  {
    label: "vokal dasar",
    items: [
      { native: "a", reading: "a" },
      { native: "o", reading: "o" },
      { native: "e", reading: "e" },
      { native: "i", reading: "i" },
    ],
  },
  {
    label: "vokal dasar",
    items: [
      { native: "u", reading: "u" },
      { native: "ü", reading: "ü" },
      null,
      null,
    ],
  },
  {
    label: "diftong -i/-o",
    items: [
      { native: "ai", reading: "ai" },
      { native: "ei", reading: "ei" },
      { native: "ao", reading: "ao" },
      { native: "ou", reading: "ou" },
    ],
  },
  {
    label: "berakhiran -n/-ng",
    items: [
      { native: "an", reading: "an" },
      { native: "en", reading: "en" },
      { native: "ang", reading: "ang" },
      { native: "eng", reading: "eng" },
    ],
  },
  {
    label: "gugus i-",
    items: [
      { native: "ong", reading: "ong" },
      { native: "ia", reading: "ia" },
      { native: "ie", reading: "ie" },
      { native: "iao", reading: "iao" },
    ],
  },
  {
    label: "gugus i- lanjutan",
    items: [
      { native: "iu", reading: "iu" },
      { native: "ian", reading: "ian" },
      { native: "in", reading: "in" },
      { native: "iang", reading: "iang" },
    ],
  },
  {
    label: "gugus u-",
    items: [
      { native: "ing", reading: "ing" },
      { native: "iong", reading: "iong" },
      { native: "ua", reading: "ua" },
      { native: "uo", reading: "uo" },
    ],
  },
];
