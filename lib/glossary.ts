// Kamus kata-per-kata untuk fitur "ketuk kata untuk lihat arti" (gaya Duolingo).
// Dibangun otomatis dari seluruh kosakata kurikulum (jp/en/zh/ar -> id_), lalu
// ditambah daftar partikel & kata fungsi umum yang tidak selalu jadi kosakata
// tersendiri (mis. partikel Jepang は/を/に, atau kata sambung Inggris "the").
//
// tokenizeForGloss() memecah sebuah kalimat/kata menjadi potongan-potongan
// yang bisa diketuk (ada arti Indonesianya) maupun potongan biasa (tanda
// baca, spasi, atau kata yang belum ada di kamus).

import { LanguageCode } from "@/lib/languages";
import { getLessonsFor } from "@/data/curriculum";

export type GlossToken = {
  key: string; // key unik untuk React
  text: string; // teks yang ditampilkan
  gloss?: string; // arti Indonesia (kalau ada => token bisa diketuk)
};

// Partikel & kata fungsi Bahasa Jepang yang sering muncul di contoh kalimat
// tapi tidak selalu diajarkan sebagai kosakata baris tersendiri.
const JA_PARTICLES: Record<string, string> = {
  は: "penanda topik kalimat",
  が: "penanda subjek",
  を: "penanda objek",
  に: "ke / pada / di (waktu, tujuan)",
  で: "di (tempat) / dengan (alat)",
  と: "dan / dengan",
  の: "penanda kepemilikan (~nya / punya)",
  も: "juga",
  か: "penanda kalimat tanya",
  ね: "ya, kan? (partikel penegas)",
  よ: "lho! (partikel penegas)",
  から: "dari / karena",
  まで: "sampai",
  より: "daripada",
  へ: "ke (arah tujuan)",
  や: "dan (contoh tak lengkap)",
  ちゃん: "panggilan sayang",
  くん: "panggilan akrab (laki-laki)",
  たち: "penanda jamak (~sekalian)",
  でした: "adalah (bentuk lampau)",
  ました: "akhiran kata kerja bentuk lampau (sopan)",
  ます: "akhiran kata kerja bentuk sopan",
  ません: "akhiran kata kerja negatif (sopan)",
  たなかさん: "Tanaka (nama orang + panggilan hormat)",
  ほんとうに: "sungguh / benar-benar",
};

// Partikel & kata fungsi Bahasa Mandarin yang sering muncul di contoh kalimat
// tapi tidak selalu diajarkan sebagai kosakata baris tersendiri. Mandarin
// (seperti Jepang) ditulis tanpa spasi antar kata, jadi partikel 1 karakter
// ini penting supaya tokenizer bisa memecah kalimat dengan benar.
const ZH_PARTICLES: Record<string, string> = {
  的: "penanda kepemilikan (~nya / punya)",
  了: "penanda sudah terjadi/selesai",
  吗: "penanda kalimat tanya",
  呢: "partikel penegas (kan? / lalu?)",
  吧: "partikel ajakan/perkiraan (~yuk / mungkin)",
  也: "juga",
  都: "semua / sama-sama",
  和: "dan / dengan",
  在: "di / sedang (kata kerja)",
  不: "tidak",
  没: "tidak (untuk 'punya'/lampau)",
  很: "sangat",
  这: "ini",
  那: "itu",
  我: "saya",
  你: "kamu",
  他: "dia (laki-laki)",
  她: "dia (perempuan)",
  们: "penanda jamak (~sekalian)",
  会: "bisa (kemampuan) / akan",
  要: "mau / akan",
};

// Kata fungsi Bahasa Arab yang umum tapi mungkin belum ada di kosakata.
const AR_FUNCTION_WORDS: Record<string, string> = {
  في: "di / pada",
  من: "dari",
  إلى: "ke",
  و: "dan",
  لا: "tidak / bukan",
  هذا: "ini (laki-laki)",
  هذه: "ini (perempuan)",
  على: "di atas / pada",
  مع: "dengan",
  أن: "bahwa",
  أنا: "saya",
  أنت: "kamu",
  هو: "dia (laki-laki)",
  هي: "dia (perempuan)",
  نعم: "ya",
  ال: "partikel penanda definit (the)",
};

// Kata fungsi Bahasa Inggris yang umum tapi mungkin belum ada di kosakata.
const EN_FUNCTION_WORDS: Record<string, string> = {
  a: "sebuah / seorang (kata sandang)",
  an: "sebuah / seorang (kata sandang)",
  the: "kata sandang penunjuk (si / itu)",
  is: "adalah (untuk dia/itu)",
  am: "adalah (untuk saya)",
  are: "adalah (untuk kamu/mereka)",
  was: "adalah (bentuk lampau, tunggal)",
  were: "adalah (bentuk lampau, jamak)",
  do: "kata bantu tanya/negatif",
  does: "kata bantu tanya/negatif (dia)",
  did: "kata bantu tanya/negatif (lampau)",
  it: "itu / dia (benda)",
  of: "dari / milik",
  on: "di atas / pada",
  at: "di (tempat/waktu spesifik)",
  my: "milik saya",
  your: "milik kamu",
  his: "milik dia (laki-laki)",
  her: "milik dia (perempuan)",
  our: "milik kami/kita",
  their: "milik mereka",
  we: "kami / kita",
  they: "mereka",
  him: "dia (laki-laki, objek)",
  can: "bisa / dapat",
  will: "akan",
  not: "tidak",
  don: "tidak (bagian dari don't)",
};

type Dict = Record<string, string>;
/** "id" = tampilkan arti Indonesia (default). "romaji" = tampilkan cara baca/romaji. */
export type GlossMode = "id" | "romaji";

// Cara baca (romaji) untuk partikel & kata fungsi umum, dipakai saat glossMode = "romaji".
const JA_PARTICLES_ROMAJI: Record<string, string> = {
  は: "wa",
  が: "ga",
  を: "o",
  に: "ni",
  で: "de",
  と: "to",
  の: "no",
  も: "mo",
  か: "ka",
  ね: "ne",
  よ: "yo",
  から: "kara",
  まで: "made",
  より: "yori",
  へ: "e",
  や: "ya",
  ちゃん: "chan",
  くん: "kun",
  たち: "tachi",
  でした: "deshita",
  ました: "mashita",
  ます: "masu",
  ません: "masen",
  たなかさん: "tanaka-san",
  ほんとうに: "hontou ni",
};

// Pinyin (tanpa tanda nada, konsisten dengan format romaji di data/curriculum.zh.ts)
// untuk partikel Mandarin di atas.
const ZH_PARTICLES_ROMAJI: Record<string, string> = {
  的: "de",
  了: "le",
  吗: "ma",
  呢: "ne",
  吧: "ba",
  也: "ye",
  都: "dou",
  和: "he",
  在: "zai",
  不: "bu",
  没: "mei",
  很: "hen",
  这: "zhe",
  那: "na",
  我: "wo",
  你: "ni",
  他: "ta",
  她: "ta",
  们: "men",
  会: "hui",
  要: "yao",
};

// Transliterasi (tanpa diakritik, konsisten dengan format romaji di
// data/curriculum.ar.ts) untuk kata fungsi Arab di atas.
const AR_FUNCTION_WORDS_ROMAJI: Record<string, string> = {
  في: "fi",
  من: "min",
  إلى: "ila",
  و: "wa",
  لا: "la",
  هذا: "hatha",
  هذه: "hathihi",
  على: "ala",
  مع: "maa",
  أن: "an",
  أنا: "ana",
  أنت: "anta",
  هو: "huwa",
  هي: "hiya",
  نعم: "naam",
  ال: "al",
};

const EN_FUNCTION_WORDS_ROMAJI: Record<string, string> = {};

// Kata fungsi Bahasa Rusia yang sangat sering muncul di contoh kalimat tapi
// belum tentu jadi kosakata utama sebuah pelajaran (kata depan/penghubung
// pendek) — supaya tetap bisa diketuk-lihat-arti walau bukan vocab inti.
const RU_FUNCTION_WORDS: Record<string, string> = {
  и: "dan",
  а: "sedangkan / tetapi",
  но: "tetapi",
  или: "atau",
  в: "di / ke dalam",
  на: "di atas",
  с: "dengan",
  не: "tidak",
  что: "apa / bahwa",
  это: "ini / adalah",
  я: "saya",
  ты: "kamu",
  он: "dia (laki-laki)",
  она: "dia (perempuan)",
  мы: "kami / kita",
  вы: "kalian / Anda",
  они: "mereka",
  да: "ya",
  нет: "tidak / tidak ada",
};

const RU_FUNCTION_WORDS_ROMAJI: Record<string, string> = {
  и: "i",
  а: "a",
  но: "no",
  или: "ili",
  в: "v",
  на: "na",
  с: "s",
  не: "ne",
  что: "chto",
  это: "eto",
  я: "ya",
  ты: "ty",
  он: "on",
  она: "ona",
  мы: "my",
  вы: "vy",
  они: "oni",
  да: "da",
  нет: "net",
};

let cache: Partial<Record<LanguageCode, Dict>> = {};
let romajiCache: Partial<Record<LanguageCode, Dict>> = {};

/** Buang tanda baca & rapikan spasi supaya frasa mudah dicocokkan. */
function normalizePhrase(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,!?"“”«»،؛؟—]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Dict tambahan (partikel/kata fungsi) per bahasa, untuk mode "id" maupun "romaji". */
function extraDictFor(lang: LanguageCode, mode: GlossMode): Dict {
  if (lang === "ja") return mode === "romaji" ? JA_PARTICLES_ROMAJI : JA_PARTICLES;
  if (lang === "zh") return mode === "romaji" ? ZH_PARTICLES_ROMAJI : ZH_PARTICLES;
  if (lang === "ar") return mode === "romaji" ? AR_FUNCTION_WORDS_ROMAJI : AR_FUNCTION_WORDS;
  if (lang === "ru") return mode === "romaji" ? RU_FUNCTION_WORDS_ROMAJI : RU_FUNCTION_WORDS;
  return mode === "romaji" ? EN_FUNCTION_WORDS_ROMAJI : EN_FUNCTION_WORDS;
}

/** Kamus kata/frasa (bentuk dinormalisasi) -> arti Indonesia, atau -> romaji. */
function buildDict(lang: LanguageCode, mode: GlossMode): Dict {
  const store = mode === "romaji" ? romajiCache : cache;
  if (store[lang]) return store[lang]!;
  const dict: Dict = { ...extraDictFor(lang, mode) };
  const lessons = getLessonsFor(lang);
  // Jepang & Mandarin tidak pakai spasi antar kata, jadi kunci kamusnya cukup
  // di-lowercase & trim saja (tanpa membuang tanda baca tengah kalimat).
  // Inggris & Arab dipisah spasi, jadi kuncinya dinormalisasi (buang tanda
  // baca, rapikan spasi) supaya cocok dengan hasil tokenizer berbasis kata.
  const useRawSurface = lang === "ja" || lang === "zh";
  for (const lesson of lessons) {
    for (const v of lesson.vocab) {
      const surface = useRawSurface ? v.jp.trim().toLowerCase() : normalizePhrase(v.jp);
      const value = mode === "romaji" ? v.romaji : v.id_;
      if (surface && value && !dict[surface]) dict[surface] = value;
    }
  }
  store[lang] = dict;
  return dict;
}

const JA_PUNCT = /[、。！？「」『』・～　\s]/;
// Mandarin juga tidak pakai spasi antar kata, jadi butuh tokenizer "greedy"
// yang sama seperti Jepang, hanya beda set tanda bacanya.
const ZH_PUNCT = /[，。！？；：、「」『』"“”～　\s]/;

/**
 * Tokenisasi bahasa tanpa spasi antar kata (Jepang/Mandarin): cocokkan
 * potongan terpanjang dulu (greedy longest-match) terhadap kamus.
 */
function tokenizeCJK(text: string, dict: Dict, punct: RegExp): GlossToken[] {
  const tokens: GlossToken[] = [];
  let i = 0;
  let plainBuf = "";
  const flushPlain = () => {
    if (plainBuf) {
      tokens.push({ key: `p${tokens.length}`, text: plainBuf });
      plainBuf = "";
    }
  };
  const MAX_LEN = 8;
  while (i < text.length) {
    const ch = text[i];
    if (punct.test(ch)) {
      flushPlain();
      tokens.push({ key: `s${tokens.length}`, text: ch });
      i += 1;
      continue;
    }
    let matched = false;
    for (let len = Math.min(MAX_LEN, text.length - i); len >= 1; len--) {
      const chunk = text.slice(i, i + len);
      const gloss = dict[chunk.toLowerCase()];
      if (gloss) {
        flushPlain();
        tokens.push({ key: `g${tokens.length}`, text: chunk, gloss });
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      plainBuf += ch;
      i += 1;
    }
  }
  flushPlain();
  return tokens;
}

/** Tokenisasi kalimat Jepang: cocokkan potongan terpanjang dulu (greedy). */
function tokenizeJapanese(text: string, dict: Dict): GlossToken[] {
  return tokenizeCJK(text, dict, JA_PUNCT);
}

/** Tokenisasi kalimat Mandarin: cocokkan potongan terpanjang dulu (greedy),
 *  karena hanzi juga ditulis tanpa spasi antar kata seperti Jepang. */
function tokenizeChinese(text: string, dict: Dict): GlossToken[] {
  return tokenizeCJK(text, dict, ZH_PUNCT);
}

const MAX_PHRASE_WORDS = 4;
// Rentang Unicode huruf Arab (termasuk varian Perso-Arab & bentuk presentasi).
const ARABIC_LETTER_RANGE = "\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF";
const ARABIC_WORD_SPLIT = new RegExp(`[${ARABIC_LETTER_RANGE}]+|[^${ARABIC_LETTER_RANGE}]+`, "g");
const ARABIC_WORD_TEST = new RegExp(`[${ARABIC_LETTER_RANGE}]`);

/**
 * Tokenisasi bahasa yang dipisah spasi antar kata (Inggris/Arab): cocokkan
 * frasa (sampai beberapa kata) dulu, baru per-kata, memakai regex huruf yang
 * sesuai bahasanya (huruf Latin untuk Inggris, huruf Arab untuk Arab).
 */
function tokenizeWordBased(
  text: string,
  dict: Dict,
  wordSplitRegex: RegExp,
  isWord: (p: string) => boolean
): GlossToken[] {
  // Pecah jadi kata & non-kata (spasi/tanda baca) sambil tetap urut,
  // supaya tanda baca asli (koma, dsb.) tetap tampil apa adanya.
  const parts = text.match(wordSplitRegex) || [text];
  // Index tiap part yang berupa kata, dalam urutan kemunculan.
  const wordPartIdx: number[] = [];
  parts.forEach((p, idx) => {
    if (isWord(p)) wordPartIdx.push(idx);
  });

  const tokens: GlossToken[] = [];
  let partIdx = 0;
  let wordCursor = 0; // posisi di wordPartIdx

  while (partIdx < parts.length) {
    const part = parts[partIdx];
    if (!isWord(part)) {
      tokens.push({ key: `s${tokens.length}`, text: part });
      partIdx += 1;
      continue;
    }

    // Coba cocokkan frasa terpanjang dulu (mis. "nice to meet you").
    let matched: { endPartIdx: number; gloss: string } | null = null;
    const maxSpan = Math.min(MAX_PHRASE_WORDS, wordPartIdx.length - wordCursor);
    for (let span = maxSpan; span >= 2; span--) {
      const lastWordPartIdx = wordPartIdx[wordCursor + span - 1];
      const phraseText = parts.slice(partIdx, lastWordPartIdx + 1).join("");
      const gloss = dict[normalizePhrase(phraseText)];
      if (gloss) {
        matched = { endPartIdx: lastWordPartIdx, gloss };
        break;
      }
    }
    if (matched) {
      const chunk = parts.slice(partIdx, matched.endPartIdx + 1).join("");
      tokens.push({ key: `g${tokens.length}`, text: chunk, gloss: matched.gloss });
      // Majukan wordCursor sejumlah kata yang terpakai dalam rentang ini.
      while (wordCursor < wordPartIdx.length && wordPartIdx[wordCursor] <= matched.endPartIdx) {
        wordCursor += 1;
      }
      partIdx = matched.endPartIdx + 1;
    } else {
      const gloss = dict[normalizePhrase(part)];
      tokens.push({ key: `w${tokens.length}`, text: part, gloss });
      wordCursor += 1;
      partIdx += 1;
    }
  }
  return tokens;
}

const ENGLISH_WORD_SPLIT = /[A-Za-z']+|[^A-Za-z']+/g;
const ENGLISH_WORD_TEST = /[A-Za-z]/;

/** Tokenisasi kalimat Inggris: cocokkan frasa (sampai 4 kata) dulu, baru per-kata. */
function tokenizeEnglish(text: string, dict: Dict): GlossToken[] {
  return tokenizeWordBased(text, dict, ENGLISH_WORD_SPLIT, (p) => ENGLISH_WORD_TEST.test(p));
}

/** Tokenisasi kalimat Arab: sama seperti Inggris, tapi kata dideteksi lewat
 *  rentang Unicode huruf Arab (bukan A-Z) karena tulisannya beda aksara. */
function tokenizeArabic(text: string, dict: Dict): GlossToken[] {
  return tokenizeWordBased(text, dict, ARABIC_WORD_SPLIT, (p) => ARABIC_WORD_TEST.test(p));
}

// U+0400–U+04FF = blok Unicode Cyrillic (huruf Rusia dkk). Dipakai supaya
// kata Rusia terdeteksi sebagai "kata" walau bukan huruf A-Z Latin — sama
// alasannya dengan kenapa Bahasa Arab butuh rentang Unicode sendiri di atas.
const CYRILLIC_WORD_SPLIT = /[A-Za-zА-Яа-яЁё]+|[^A-Za-zА-Яа-яЁё]+/g;
const CYRILLIC_WORD_TEST = /[А-Яа-яЁё]/;

/** Tokenisasi kalimat Rusia: sama seperti Inggris/Arab, kata dipisah spasi
 *  seperti Bahasa Inggris, tapi deteksi "kata" memakai rentang huruf
 *  Cyrillic supaya tidak salah dianggap tanda baca. */
function tokenizeRussian(text: string, dict: Dict): GlossToken[] {
  return tokenizeWordBased(text, dict, CYRILLIC_WORD_SPLIT, (p) => CYRILLIC_WORD_TEST.test(p));
}

/** Pecah teks jadi token-token untuk fitur ketuk-lihat-arti. */
export function tokenizeForGloss(
  text: string,
  lang: LanguageCode,
  mode: GlossMode = "id"
): GlossToken[] {
  if (!text) return [];
  const dict = buildDict(lang, mode);
  if (lang === "ja") return tokenizeJapanese(text, dict);
  if (lang === "zh") return tokenizeChinese(text, dict);
  if (lang === "ar") return tokenizeArabic(text, dict);
  if (lang === "ru") return tokenizeRussian(text, dict);
  return tokenizeEnglish(text, dict);
}
