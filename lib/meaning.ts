// Normalisasi "arti Indonesia" kosakata menjadi SATU arti utama.
//
// Data mentah kurikulum (data/curriculum.*.ts) sengaja ditulis lengkap dan
// kadang memuat beberapa arti sekaligus, mis. "baik / sehat", "kantor /
// perusahaan", atau catatan pemakaian dalam kurung, mis. "dia (laki-laki)".
// Itu bikin pengguna pusing: soal pilihan ganda terasa ambigu, dan soal
// ketik arti hampir mustahil dijawab "persis" kalau ada 2-3 arti yang
// semuanya sah. Modul ini dipanggil SEKALI di curriculumFactory untuk SEMUA
// bahasa sekaligus, jadi aturan "satu kata = satu arti" berlaku otomatis,
// termasuk untuk kosakata yang ditambahkan di masa depan.
//
//   "baik / sehat"                        -> arti: "baik"
//   "dia (laki-laki) / pacar"             -> arti: "dia",   catatan: "laki-laki"
//   "satu (1)"                            -> arti: "satu",  catatan: "1"
//   "kanji: tengah / dalam, juga dibaca 'chuu'"
//                                         -> arti: "tengah", catatan: "juga dibaca 'chuu'"
//
// Aturannya (berurutan):
//  1. Awalan "kanji:" dibuang (hanya label, bukan bagian arti).
//  2. Keterangan tambahan setelah koma yang diawali "juga dibaca" / "dipakai"
//     dipindah jadi catatan.
//  3. Pemisah "/" (di luar tanda kurung) memecah beberapa arti -> ambil yang
//     PERTAMA saja (urutan di data = arti paling umum).
//  4. Isi tanda kurung dipindah jadi catatan (bukan bagian arti yang dinilai).
//     Kalau ternyata arti jadi kosong (seluruh teks ada di dalam kurung),
//     isi kurung itulah yang dipakai sebagai arti.

export type NormalizedMeaning = {
  /** Satu arti utama (tanpa "/", tanpa kurung). Selalu tidak kosong. */
  meaning: string;
  /** Catatan pemakaian (opsional), mis. "laki-laki", "santai". */
  note?: string;
  /** Arti-arti lain yang dibuang dari tampilan ("kantor / perusahaan" ->
   *  ["perusahaan"]). TIDAK PERNAH ditampilkan ke pengguna; hanya dipakai
   *  supaya jawaban ketikan yang sebenarnya benar (mis. "perusahaan")
   *  tidak dihitung salah. */
  alternates: string[];
};

/** Pecah teks pada karakter pemisah, tapi hanya yang berada DI LUAR tanda kurung. */
function splitTopLevel(text: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let buf = "";
  for (const ch of text) {
    if (ch === "(") depth += 1;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === sep && depth === 0) {
      parts.push(buf);
      buf = "";
    } else {
      buf += ch;
    }
  }
  parts.push(buf);
  return parts;
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

export function normalizeMeaning(raw: string): NormalizedMeaning {
  const notes: string[] = [];
  let text = clean(raw || "");

  // 1. Label "kanji:" bukan bagian arti.
  text = text.replace(/^kanji\s*:\s*/i, "");

  // 2. Keterangan tambahan setelah koma (khusus pola data kanji).
  const extra = text.match(/,\s*((?:juga dibaca|dipakai)\b.*)$/i);
  if (extra) {
    notes.push(clean(extra[1]));
    text = clean(text.slice(0, extra.index));
  }

  // 3. Ambil arti pertama sebelum "/" (di luar kurung); sisanya jadi alternatif.
  const segments = splitTopLevel(text, "/").map(clean).filter(Boolean);
  const first = segments[0] || "";

  // 4. Keluarkan isi kurung jadi catatan.
  const parenTexts: string[] = [];
  const withoutParens = clean(
    first.replace(/\(([^)]*)\)/g, (_, inner: string) => {
      const t = clean(inner);
      if (t) parenTexts.push(t);
      return " ";
    })
  );

  let meaning = withoutParens;
  if (!meaning) {
    // Seluruh teks ada di dalam kurung -> pakai isi kurung itu sebagai arti.
    meaning = parenTexts.shift() || clean(raw || "") || "?";
  }
  notes.unshift(...parenTexts);

  const note = notes.filter(Boolean).join("; ") || undefined;

  const seen = new Set<string>([meaningKey(meaning)]);
  const alternates: string[] = [];
  for (const seg of segments.slice(1)) {
    const alt = clean(seg.replace(/\([^)]*\)/g, " "));
    const key = meaningKey(alt);
    if (alt && key && !seen.has(key)) {
      seen.add(key);
      alternates.push(alt);
    }
  }
  return { meaning, note, alternates };
}

/** Kunci pembanding arti: huruf kecil, tanpa tanda baca, spasi dirapikan.
 *  Dipakai untuk menentukan dua kata "berarti sama" (sinonim) dan untuk
 *  mencocokkan jawaban ketikan pengguna. */
export function meaningKey(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[.,!?;:'"“”‘’()\[\]\-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
