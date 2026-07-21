// Data referensi Alfabet Cyrillic — dipakai di halaman /alphabet saat bahasa
// yang dipelajari adalah Rusia (padanan dari "Huruf Kana" punya Bahasa
// Jepang / "Pinyin" punya Mandarin). BEDA dengan Pinyin: alfabet Cyrillic
// ITU SENDIRI adalah aksara/huruf yang dipakai menulis Bahasa Rusia (bukan
// sekadar ejaan bunyi berdampingan dengan aksara lain seperti Pinyin-Hanzi),
// jadi ini persis seperti belajar Hiragana: mengenal setiap HURUF-nya
// langsung, bukan cara baca terpisah dari aksaranya.
//
// 33 huruf resmi alfabet Rusia modern, dikelompokkan jadi dua bagian yang
// lazim diajarkan: huruf hidup (vokal, 10 huruf) dan huruf mati (konsonan,
// 21 huruf) + 2 tanda (tidak punya bunyi sendiri: tanda keras/lunak).

export type CyrillicItem = { native: string; reading: string };
export type CyrillicRow = { label: string; items: (CyrillicItem | null)[] };

// Vokal (гласные буквы). 5 vokal "keras" dan 5 pasangannya yang "lunak"
// (melembutkan konsonan sebelumnya) — pasangan ini ditata berdampingan
// supaya polanya kelihatan, persis cara buku ajar Rusia pemula menyusunnya.
export const CYRILLIC_VOWEL_ROWS: CyrillicRow[] = [
  {
    label: "keras",
    items: [
      { native: "А а", reading: "a" },
      { native: "Э э", reading: "e" },
      { native: "Ы ы", reading: "y" },
      { native: "О о", reading: "o" },
    ],
  },
  {
    label: "keras (lanjutan)",
    items: [
      { native: "У у", reading: "u" },
      null,
      null,
      null,
    ],
  },
  {
    label: "lunak (pasangan)",
    items: [
      { native: "Я я", reading: "ya" },
      { native: "Е е", reading: "ye" },
      { native: "И и", reading: "i" },
      { native: "Ё ё", reading: "yo" },
    ],
  },
  {
    label: "lunak (lanjutan)",
    items: [
      { native: "Ю ю", reading: "yu" },
      null,
      null,
      null,
    ],
  },
];

// Konsonan (согласные буквы), ditata per baris 4 huruf supaya rapi dilihat
// di layar HP, urut sesuai urutan abjad Rusia aslinya.
export const CYRILLIC_CONSONANT_ROWS: CyrillicRow[] = [
  {
    label: "б-в-г-д",
    items: [
      { native: "Б б", reading: "b" },
      { native: "В в", reading: "v" },
      { native: "Г г", reading: "g" },
      { native: "Д д", reading: "d" },
    ],
  },
  {
    label: "ж-з-й-к",
    items: [
      { native: "Ж ж", reading: "zh" },
      { native: "З з", reading: "z" },
      { native: "Й й", reading: "y" },
      { native: "К к", reading: "k" },
    ],
  },
  {
    label: "л-м-н-п",
    items: [
      { native: "Л л", reading: "l" },
      { native: "М м", reading: "m" },
      { native: "Н н", reading: "n" },
      { native: "П п", reading: "p" },
    ],
  },
  {
    label: "р-с-т-ф",
    items: [
      { native: "Р р", reading: "r" },
      { native: "С с", reading: "s" },
      { native: "Т т", reading: "t" },
      { native: "Ф ф", reading: "f" },
    ],
  },
  {
    label: "х-ц-ч-ш",
    items: [
      { native: "Х х", reading: "kh" },
      { native: "Ц ц", reading: "ts" },
      { native: "Ч ч", reading: "ch" },
      { native: "Ш ш", reading: "sh" },
    ],
  },
  {
    label: "щ + tanda",
    items: [
      { native: "Щ щ", reading: "shch" },
      { native: "Ъ ъ", reading: "(tanda keras, tanpa bunyi)" },
      { native: "Ь ь", reading: "(tanda lunak, tanpa bunyi)" },
      null,
    ],
  },
];
