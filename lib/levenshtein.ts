/**
 * Menghitung jarak edit (Levenshtein distance) antara dua string —
 * jumlah minimum operasi tambah/hapus/ganti huruf untuk mengubah `a` jadi `b`.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // hapus
        curr[j - 1] + 1, // tambah
        prev[j - 1] + cost // ganti
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

export type TypoCheckResult = "exact" | "typo" | "wrong";

/**
 * Membandingkan jawaban pengguna dengan jawaban benar, dengan toleransi typo kecil.
 * - Sama persis -> "exact"
 * - Beda 1-2 huruf saja (tergantung panjang kata) -> "typo" (tetap dianggap benar, dengan catatan)
 * - Selain itu -> "wrong"
 */
export function checkTypoTolerant(input: string, answer: string): TypoCheckResult {
  const a = input.toLowerCase().replace(/\s+/g, " ").trim();
  const b = answer.toLowerCase().replace(/\s+/g, " ").trim();
  if (a === b) return "exact";
  if (a.length === 0) return "wrong";

  const distance = levenshtein(a, b);
  const tolerance = b.length <= 4 ? 1 : b.length <= 9 ? 2 : 3;

  return distance <= tolerance ? "typo" : "wrong";
}
