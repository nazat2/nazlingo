// Pengecekan jawaban ketikan untuk soal "type_meaning" (ketik arti Indonesia)
// dan "type_target" (tulis kata dalam bahasa target).
//
// Prinsip logikanya:
//  1. Jawaban DITERIMA kalau, setelah dinormalisasi, sama persis dengan salah
//     satu jawaban yang sah (exercise.accepts).
//  2. Kalau tidak sama persis tapi sangat mirip (salah ketik kecil), dihitung
//     benar dengan catatan "nyaris tepat" — TAPI hanya kalau yang diketik
//     BUKAN kata lain yang memang ada di kurikulum. Contoh: jawaban benar
//     "ayah" lalu pengguna mengetik "ayam" (beda 1 huruf, tapi "ayam" adalah
//     kata lain yang sah) -> itu bukan typo, itu jawaban salah.
//  3. Selain itu salah.

import { LanguageCode } from "@/lib/languages";
import { Exercise, Vocab } from "@/lib/types";
import { getAllVocabFor } from "@/data/curriculum";
import { levenshtein } from "@/lib/levenshtein";
import { meaningKey } from "@/lib/meaning";
import { digitsOfMeaning, collapseDigitGrouping } from "@/lib/numbers";

export type TypedResult = "exact" | "typo" | "wrong";

// ---------------------------------------------------------------------------
// Normalisasi tulisan bahasa target
// ---------------------------------------------------------------------------

// Tanda baca & spasi yang diabaikan saat membandingkan (ASCII, tanda baca CJK,
// Arab, dan tanda baca umum). Ditulis eksplisit (bukan \p{P}) supaya aman di
// target kompilasi ES2017.
const IGNORED_CHARS =
  /[\s!-\/:-@\[-`{-~\u00A1-\u00BF\u2000-\u206F\u2E00-\u2E7F\u3000-\u3004\u3008-\u3020\u3030\u303D\u30FB\u060C\u061B\u061F\u066A-\u066D\u06D4]+/g;

/**
 * Menyamakan bentuk tulisan supaya perbedaan yang tidak bermakna tidak
 * dihitung salah:
 *  - huruf besar/kecil, spasi, tanda baca, apostrof, tanda hubung
 *  - tanda diakritik huruf Latin (pinyin "nǐ hǎo" = "ni hao", "ō" = "o")
 *  - Mandarin: angka nada ("ni3 hao3" = "ni hao")
 *  - Arab: harakat/tatweel dan variasi alif (أ إ آ -> ا), alif maksura (ى -> ي)
 *  - Rusia: "ё" = "е"
 */
export function normalizeWriting(input: string, lang: LanguageCode): string {
  let t = (input ?? "").normalize("NFKC").toLowerCase();
  // Diakritik hanya dicopot dari huruf LATIN (supaya "й" Rusia tidak ikut
  // berubah jadi "и" — itu huruf berbeda).
  // Spanyol: huruf "ñ" adalah huruf tersendiri (año ≠ ano), jadi dijaga
  // dulu dengan penanda sementara lalu dikembalikan setelah diakritik lain
  // (á é í ó ú ü) dicopot.
  if (lang === "es") t = t.replace(/ñ/g, "\uE000");
  t = t.replace(/[\u00C0-\u024F\u1E00-\u1EFF]+/g, (m) =>
    m.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  );
  if (lang === "es") t = t.replace(/\uE000/g, "ñ");
  if (lang === "ar") {
    t = t
      .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
      .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
      .replace(/\u0649/g, "\u064A");
  }
  if (lang === "ru") t = t.replace(/\u0451/g, "\u0435");
  // Angka nada pinyin ("ni3 hao3") dibuang, tapi hanya kalau ada huruf Latin
  // di dalamnya — angka murni ("30") adalah jawaban bilangan, jangan dihapus.
  if (lang === "zh" && /[a-z]/.test(t)) t = t.replace(/[0-9]/g, "");
  return t.replace(IGNORED_CHARS, "");
}

/** Romaji Jepang sistem lain (Kunrei/Nihon-shiki) -> Hepburn, mis. "si" -> "shi". */
function hepburnize(s: string): string {
  return s
    .replace(/sy([aueo])/g, "sh$1")
    .replace(/ty([aueo])/g, "ch$1")
    .replace(/(?:zy|jy)([aueo])/g, "j$1")
    .replace(/si/g, "shi")
    .replace(/ti/g, "chi")
    .replace(/tu/g, "tsu")
    .replace(/hu/g, "fu")
    .replace(/zi/g, "ji");
}

/** Bentuk-bentuk lain yang masuk akal dari satu ketikan pengguna (tanpa duplikat). */
function writingCandidates(input: string, lang: LanguageCode): string[] {
  const out: string[] = [];
  const push = (s: string) => {
    if (s && out.indexOf(s) === -1) out.push(s);
  };
  const base = normalizeWriting(collapseDigitGrouping(input), lang);
  push(base);
  if (lang === "ja") {
    // Pengguna sering mengetik "ō" untuk "ou"/"oo" (ou/oo/uu/aa/ii/ei).
    const raw = (input ?? "").normalize("NFKC").toLowerCase();
    if (/[\u0101\u012B\u016B\u0113\u014D]/.test(raw)) {
      const expandA = raw
        .replace(/\u0101/g, "aa")
        .replace(/\u012B/g, "ii")
        .replace(/\u016B/g, "uu")
        .replace(/\u0113/g, "ei")
        .replace(/\u014D/g, "ou");
      push(normalizeWriting(expandA, lang));
      push(normalizeWriting(expandA.replace(/ou/g, "oo"), lang));
    }
    // Hanya ketikan beraksara Latin yang perlu variasi sistem romaji lain.
    if (/^[a-z]*$/.test(base)) push(hepburnize(base));
  }
  return out;
}

/** Semua bentuk tulisan sah dari satu kata: aksara asli + cara baca, masing-masing
 *  dengan/ tanpa catatan dalam kurung, dan tiap alternatif "a/b". */
export function acceptedWritings(v: Vocab): string[] {
  const out: string[] = [];
  const add = (s: string) => {
    const n = normalizeWriting(s, v.lang);
    if (n && out.indexOf(n) === -1) out.push(n);
  };
  for (const text of [v.jp, v.romaji]) {
    add(text);
    add(text.replace(/\([^)]*\)/g, " "));
    for (const part of text.replace(/\([^)]*\)/g, " ").split("/")) add(part);
  }
  // Kata bilangan juga boleh ditulis dengan angka ("30" untuk thirty / 三十 /
  // 三十 / ثلاثون / тридцать) — dibaca dari arti Indonesianya, jadi berlaku
  // untuk semua bahasa.
  const digits = digitsOfMeaning(v.id_);
  if (digits) add(digits);
  return out;
}

/** Semua kunci arti sah dari satu kata: arti utama + arti lain (alt). */
export function meaningKeysOf(v: Vocab): string[] {
  const out: string[] = [];
  for (const m of [v.id_, ...(v.alt ?? [])]) {
    const k = meaningKey(m);
    if (k && out.indexOf(k) === -1) out.push(k);
    // "tiga puluh" juga sah dijawab "30".
    const d = digitsOfMeaning(m);
    if (d && out.indexOf(d) === -1) out.push(d);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Indeks "kata lain yang sah" per bahasa (untuk membedakan typo vs kata lain)
// ---------------------------------------------------------------------------

const knownWritingCache: Partial<Record<LanguageCode, Set<string>>> = {};
const knownMeaningCache: Partial<Record<LanguageCode, Set<string>>> = {};

function knownWritings(lang: LanguageCode): Set<string> {
  let set = knownWritingCache[lang];
  if (!set) {
    set = new Set<string>();
    for (const v of getAllVocabFor(lang)) acceptedWritings(v).forEach((w) => set!.add(w));
    knownWritingCache[lang] = set;
  }
  return set;
}

function knownMeanings(lang: LanguageCode): Set<string> {
  let set = knownMeaningCache[lang];
  if (!set) {
    set = new Set<string>();
    for (const v of getAllVocabFor(lang)) meaningKeysOf(v).forEach((k) => set!.add(k));
    knownMeaningCache[lang] = set;
  }
  return set;
}

// ---------------------------------------------------------------------------
// Pengecekan
// ---------------------------------------------------------------------------

/** Berapa huruf salah yang masih dimaklumi, tergantung panjang jawaban benar.
 *  Kata pendek (<= 4 huruf) tidak diberi toleransi sama sekali: selisih satu
 *  huruf di kata sependek itu hampir selalu berarti KATA LAIN (ayah/ayam,
 *  ibu/itu), bukan salah ketik. */
function typoTolerance(len: number): number {
  if (len <= 4) return 0;
  if (len <= 7) return 1;
  if (len <= 12) return 2;
  return 3;
}

function closestMatch(candidates: string[], accepts: string[]): boolean {
  for (const c of candidates) {
    for (const a of accepts) {
      // Angka harus persis: "10001" bukan salah ketik dari "10000".
      if (/^\d+$/.test(a) || /^\d+$/.test(c)) continue;
      const tol = typoTolerance(a.length);
      if (tol === 0) continue;
      // Selisih panjang lebih besar dari toleransi pasti tidak lolos — lewati
      // hitungan Levenshtein yang lebih mahal.
      if (Math.abs(c.length - a.length) > tol) continue;
      if (levenshtein(c, a) <= tol) return true;
    }
  }
  return false;
}

/** Cek ketikan untuk soal ketik-arti-Indonesia. */
export function checkMeaningInput(
  input: string,
  accepts: string[],
  lang: LanguageCode
): TypedResult {
  const typed = meaningKey(collapseDigitGrouping(input));
  if (!typed) return "wrong";
  if (accepts.indexOf(typed) !== -1) return "exact";
  if (knownMeanings(lang).has(typed)) return "wrong"; // kata lain yang sah, bukan typo
  return closestMatch([typed], accepts) ? "typo" : "wrong";
}

/** Cek ketikan untuk soal tulis-dalam-bahasa-target. */
export function checkWritingInput(
  input: string,
  accepts: string[],
  lang: LanguageCode
): TypedResult {
  const candidates = writingCandidates(input, lang);
  if (candidates.length === 0) return "wrong";
  for (const c of candidates) {
    if (accepts.indexOf(c) !== -1) return "exact";
  }
  const known = knownWritings(lang);
  if (candidates.some((c) => known.has(c))) return "wrong"; // kata lain yang sah
  // Spanyol: "ano" untuk "año" dihitung benar dengan catatan penulisan yang
  // benar (tidak semua keyboard punya tombol ñ).
  if (lang === "es") {
    const flat = (s: string) => s.replace(/ñ/g, "n");
    if (candidates.some((c) => accepts.some((a) => a.indexOf("ñ") !== -1 && flat(a) === flat(c)))) {
      return "typo";
    }
  }
  return closestMatch(candidates, accepts) ? "typo" : "wrong";
}

/** Titik masuk tunggal untuk UI: periksa ketikan terhadap sebuah soal. */
export function checkTypedAnswer(exercise: Exercise, input: string): TypedResult {
  const accepts = exercise.accepts ?? [];
  if (accepts.length === 0) return "wrong";
  if (exercise.type === "type_meaning") return checkMeaningInput(input, accepts, exercise.lang);
  if (exercise.type === "type_target") return checkWritingInput(input, accepts, exercise.lang);
  return "wrong";
}
