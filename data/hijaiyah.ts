// Data 28 Huruf Hijaiyah — dipakai di halaman /alphabet saat bahasa yang
// dipelajari adalah Bahasa Arab (padanan dari "Huruf Kana" punya Bahasa
// Jepang, tapi dinamai "Hijaiyah" karena itu istilah yang benar & paling
// dikenal orang Indonesia buat huruf dasar Arab — bukan "kana", yang
// khusus istilah sistem tulisan Jepang).
//
// Urutan & transliterasi mengikuti urutan abjad Arab standar (bukan urutan
// hafalan "alif-ba-ta" doang lalu berhenti) dan ejaan Latin yang lazim
// diajarkan di TPA/pengajian Indonesia. Ada 2 huruf yang sama-sama sering
// ditulis "ha" dalam ejaan santai (ح di urutan awal, ه di urutan akhir) —
// supaya tidak ketuker, keduanya ditandai hurufnya masing-masing.

export type HijaiyahItem = { native: string; reading: string };
export type HijaiyahRow = { label: string; items: (HijaiyahItem | null)[] };

export const HIJAIYAH_ROWS: HijaiyahRow[] = [
  {
    label: "1-4",
    items: [
      { native: "ا", reading: "alif" },
      { native: "ب", reading: "ba" },
      { native: "ت", reading: "ta" },
      { native: "ث", reading: "tsa" },
    ],
  },
  {
    label: "5-8",
    items: [
      { native: "ج", reading: "jim" },
      { native: "ح", reading: "ha (ح)" },
      { native: "خ", reading: "kho" },
      { native: "د", reading: "dal" },
    ],
  },
  {
    label: "9-12",
    items: [
      { native: "ذ", reading: "dzal" },
      { native: "ر", reading: "ro" },
      { native: "ز", reading: "zai" },
      { native: "س", reading: "sin" },
    ],
  },
  {
    label: "13-16",
    items: [
      { native: "ش", reading: "syin" },
      { native: "ص", reading: "shod" },
      { native: "ض", reading: "dhod" },
      { native: "ط", reading: "tho" },
    ],
  },
  {
    label: "17-20",
    items: [
      { native: "ظ", reading: "zho" },
      { native: "ع", reading: "ain" },
      { native: "غ", reading: "ghain" },
      { native: "ف", reading: "fa" },
    ],
  },
  {
    label: "21-24",
    items: [
      { native: "ق", reading: "qof" },
      { native: "ك", reading: "kaf" },
      { native: "ل", reading: "lam" },
      { native: "م", reading: "mim" },
    ],
  },
  {
    label: "25-28",
    items: [
      { native: "ن", reading: "nun" },
      { native: "ه", reading: "ha (ه)" },
      { native: "و", reading: "wawu" },
      { native: "ي", reading: "ya" },
    ],
  },
];
