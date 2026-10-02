// Membersihkan teks kosakata sebelum dibacakan oleh text-to-speech.
//
// Beberapa kata di data punya "catatan" yang BUKAN bagian ucapan, mis.
// "Hello (phone)", "Pass (exam)", atau pasangan alternatif "Pleasant/delightful"
// dan "يسجل / يصور". Kalau teks mentah itu dikirim apa adanya ke mesin suara,
// hasilnya bisa aneh: tanda kurung dibaca/dilewati tidak konsisten antar
// browser, dan "/" kadang dibaca "slash" atau bikin suara terpotong.
//
//   "Hello (phone)"        -> "Hello"
//   "Pleasant/delightful"  -> "Pleasant, delightful"   (koma = jeda singkat)
//   "يسجل / يصور"          -> "يسجل, يصور"
export function toSpeakable(text: string): string {
  const original = (text || "").trim();
  if (!original) return "";
  let t = original
    .replace(/\([^)]*\)/g, " ") // catatan dalam kurung tidak ikut dibaca
    .replace(/\s*\/\s*/g, ", ") // "a/b" -> jeda, bukan kata "slash"
    .replace(/[~～…]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,]+|[\s,]+$/g, "")
    .replace(/(,\s*){2,}/g, ", ")
    .trim();
  // Kalau ternyata semua isinya catatan (jadi kosong), pakai teks asli saja.
  if (!t) t = original;
  return t;
}
