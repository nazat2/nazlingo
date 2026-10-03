// Mengenali angka yang ditulis dengan huruf dalam Bahasa Indonesia, supaya
// jawaban berupa ANGKA ("30") juga diterima untuk "tiga puluh" — dan
// sebaliknya, soal "tulis dalam bahasa target" untuk kata bilangan juga
// menerima angka. Berlaku untuk semua bahasa, karena yang dibaca adalah
// ARTI Indonesia kata itu (bukan bahasa targetnya).
//
//   "tiga puluh"            -> 30
//   "seratus dua puluh"     -> 120
//   "sebelas"               -> 11
//   "dua ribu lima ratus"   -> 2500
//   "sepuluh menit"         -> null (bukan bilangan murni)

const UNITS: Record<string, number> = {
  nol: 0, kosong: 0,
  satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5,
  enam: 6, tujuh: 7, delapan: 8, sembilan: 9,
};

/** Kembalikan angka bila SELURUH teks adalah bilangan bulat berbentuk huruf; selain itu null. */
export function parseIndonesianNumber(text: string): number | null {
  const words = (text || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return null;

  // Pecah awalan "se-" (seratus, seribu, sepuluh, sebelas, sejuta) dan
  // akhiran "-belas" supaya urutan token seragam.
  const tokens: string[] = [];
  for (const w of words) {
    if (w === "sepuluh") tokens.push("satu", "puluh");
    else if (w === "sebelas") tokens.push("sebelas");
    else if (w === "seratus") tokens.push("satu", "ratus");
    else if (w === "seribu") tokens.push("satu", "ribu");
    else if (w === "sejuta") tokens.push("satu", "juta");
    else if (w.endsWith("belas") && w.length > 5 && UNITS[w.slice(0, -5)] !== undefined) {
      tokens.push(w.slice(0, -5), "belas");
    } else tokens.push(w);
  }

  let total = 0; // hasil kelompok ribuan/jutaan yang sudah selesai
  let group = 0; // kelompok < 1000 yang sedang dibangun
  let current: number | null = null; // angka satuan yang menunggu pengali
  let sawNumber = false;

  const flushCurrent = () => {
    if (current !== null) {
      group += current;
      current = null;
    }
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (UNITS[t] !== undefined) {
      if (current !== null) return null; // "dua tiga" bukan bilangan
      current = UNITS[t];
      sawNumber = true;
    } else if (t === "sebelas") {
      if (current !== null) return null;
      group += 11;
      sawNumber = true;
    } else if (t === "belas") {
      if (current === null) return null;
      group += 10 + current;
      current = null;
    } else if (t === "puluh") {
      if (current === null) return null;
      group += current * 10;
      current = null;
    } else if (t === "ratus") {
      if (current === null) return null;
      group += current * 100;
      current = null;
    } else if (t === "ribu" || t === "juta") {
      flushCurrent();
      const mult = t === "ribu" ? 1000 : 1000000;
      if (group === 0) return null;
      total += group * mult;
      group = 0;
    } else {
      return null; // ada kata lain -> bukan bilangan murni
    }
  }
  flushCurrent();
  if (!sawNumber) return null;
  return total + group;
}

/** Bentuk digit dari arti Indonesia, atau null kalau bukan bilangan. */
export function digitsOfMeaning(meaning: string): string | null {
  const n = parseIndonesianNumber(meaning);
  return n === null ? null : String(n);
}

/** Ketikan pengguna berupa angka dengan pemisah ribuan ("1.000", "1,000",
 *  "1 000") dirapikan jadi digit polos ("1000"). Selain itu dikembalikan apa adanya. */
export function collapseDigitGrouping(input: string): string {
  const t = (input || "").trim();
  return /^\d{1,3}([.,\s]\d{3})+$/.test(t) ? t.replace(/[.,\s]/g, "") : t;
}
