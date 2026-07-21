// Kumpulan kata-kata motivasi yang tampil bergantian di layar loading.
// Dipakai bareng oleh AppSplash (loading awal/relog) dan app/loading.tsx
// (loading saat pindah halaman) supaya nadanya konsisten di seluruh app.
export const MOTIVATIONAL_QUOTES: string[] = [
  "Sedikit demi sedikit, lama-lama jadi bukit",
  "Satu kata hari ini, satu kalimat besok",
  "Konsisten itu lebih kuat dari sempurna",
  "Otak butuh latihan, bukan bakat ajaib",
  "5 menit hari ini lebih baik dari 0 menit",
  "Salah itu bagian dari belajar, bukan akhir dunia",
  "Streak-mu bukti kamu nggak gampang nyerah",
  "頑張って! Semangat terus, ya!",
  "Bahasa baru itu jendela ke dunia baru",
  "Tiap huruf hiragana yang kamu hafal itu progres nyata",
  "Pelan-pelan aja, yang penting jalan terus",
  "Practice makes progress, bukan perfect",
  "Kamu lebih jago dari kamu yang kemarin",
  "Belajar bahasa itu maraton, bukan sprint",
  "Tiap sesi kecil nambah satu bata di rumah bahasamu",
  "Fokus hari ini, hasilnya kelihatan bulan depan",
  "Kesalahan hari ini jadi kelancaran besok",
  "Ayo lanjutin, kamu udah sejauh ini!",
  "Ilmu itu investasi yang nggak pernah rugi",
  "Ngulang itu bukan lambat, itu menguatkan",
  "Hari ini belajar dikit, besok ngerti banyak",
  "Kamu nggak perlu sempurna, cukup nggak berhenti",
  "Menyerah itu gampang, makanya jarang ada yang jago",
  "Vocab baru = senjata baru buat ngobrol",
  "Tenang, semua yang jago juga mulai dari nol",
];

// Fisher–Yates shuffle — dipakai supaya urutan kalimat beda tiap kali
// halaman loading muncul, bukan monoton dari atas ke bawah terus.
export function getShuffledQuotes(): string[] {
  const arr = [...MOTIVATIONAL_QUOTES];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
