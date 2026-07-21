import { Exercise, ExerciseOption, ExerciseType, Lesson, Vocab } from "@/lib/types";
import { allVocabUpTo, getLessonsFor } from "@/data/curriculum";

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Cache kosakata lengkap per bahasa, dipakai sebagai fallback distraktor.
// Dibuat lazy (bukan di top-level) supaya tidak dihitung ulang tiap panggilan.
const fullVocabCache: Partial<Record<Vocab["lang"], Vocab[]>> = {};
function fullVocabFor(lang: Vocab["lang"]): Vocab[] {
  if (!fullVocabCache[lang]) {
    fullVocabCache[lang] = getLessonsFor(lang).flatMap((l) => l.vocab);
  }
  return fullVocabCache[lang]!;
}

/**
 * BUG LAMA: kalau `pool` (kosakata yang sudah "dipelajari sejauh ini") lebih
 * kecil dari `count` — sangat sering terjadi di pelajaran-pelajaran awal
 * tiap unit, karena baru sedikit kata yang dikenal — soal pilihan ganda bisa
 * cuma punya 1-2 opsi jawaban, bukan 4. Sekarang kalau kurang, sisanya
 * diambil dari SELURUH kosakata bahasa itu (termasuk pelajaran yang belum
 * ditempuh) supaya jumlah opsi tetap konsisten 4 di semua pelajaran.
 */
function pickDistractors(
  pool: Vocab[],
  correct: Vocab,
  count: number
): Vocab[] {
  const chosen: Vocab[] = [];
  const usedIds = new Set<string>([correct.id]);

  const fromPool = shuffle(
    pool.filter((v) => !usedIds.has(v.id) && v.id_ !== correct.id_)
  );
  for (const v of fromPool) {
    if (chosen.length >= count) break;
    chosen.push(v);
    usedIds.add(v.id);
  }

  if (chosen.length < count) {
    const fallback = shuffle(
      fullVocabFor(correct.lang).filter(
        (v) => !usedIds.has(v.id) && v.id_ !== correct.id_
      )
    );
    for (const v of fallback) {
      if (chosen.length >= count) break;
      chosen.push(v);
      usedIds.add(v.id);
    }
  }

  return chosen;
}

let uid = 0;
function nextId() {
  uid += 1;
  return `ex-${Date.now()}-${uid}`;
}

function mcJpToId(vocab: Vocab, pool: Vocab[]): Exercise {
  const distractors = pickDistractors(pool, vocab, 3);
  const options: ExerciseOption[] = shuffle([
    { id: vocab.id, label: vocab.id_, correct: true },
    ...distractors.map((d) => ({ id: d.id, label: d.id_, correct: false })),
  ]);
  return {
    id: nextId(),
    type: "mc_jp_to_id",
    prompt: vocab.jp,
    promptSub: vocab.romaji,
    vocabId: vocab.id,
    jp: vocab.jp,
    romaji: vocab.romaji,
    options,
    example: vocab.example,
    exampleId: vocab.exampleId,
    meaning: vocab.id_,
    lang: vocab.lang,
  };
}

function mcIdToJp(vocab: Vocab, pool: Vocab[]): Exercise {
  const distractors = pickDistractors(pool, vocab, 3);
  const options: ExerciseOption[] = shuffle([
    { id: vocab.id, label: vocab.jp, sub: vocab.romaji, correct: true },
    ...distractors.map((d) => ({ id: d.id, label: d.jp, sub: d.romaji, correct: false })),
  ]);
  return {
    id: nextId(),
    type: "mc_id_to_jp",
    prompt: vocab.id_,
    vocabId: vocab.id,
    jp: vocab.jp,
    romaji: vocab.romaji,
    options,
    meaning: vocab.id_,
    lang: vocab.lang,
  };
}

function listenChoose(vocab: Vocab, pool: Vocab[]): Exercise {
  // Dulu soal ini cuma nampilin tombol putar audio tanpa teksnya sama
  // sekali (murni "dengarkan lalu pilih"), jadi kesannya acak/ga jelas:
  // pengguna disuruh dengar kata yang belum pernah mereka tahu artinya
  // ataupun tulisannya. Sekarang disamakan dengan mc_jp_to_id — teks kata
  // target (+ romaji + contoh kalimat kalau ada) tetap ditampilkan, cuma
  // beda tipe soal ini sengaja naruh tombol putar audio paling menonjol
  // (lihat SpeakButton di PromptBlock) buat tetap melatih pendengaran.
  const distractors = pickDistractors(pool, vocab, 3);
  const options: ExerciseOption[] = shuffle([
    { id: vocab.id, label: vocab.id_, correct: true },
    ...distractors.map((d) => ({ id: d.id, label: d.id_, correct: false })),
  ]);
  return {
    id: nextId(),
    type: "listen_choose",
    prompt: vocab.jp,
    promptSub: vocab.romaji,
    vocabId: vocab.id,
    jp: vocab.jp,
    romaji: vocab.romaji,
    options,
    example: vocab.example,
    exampleId: vocab.exampleId,
    meaning: vocab.id_,
    lang: vocab.lang,
  };
}

function typeRomaji(vocab: Vocab): Exercise {
  return {
    id: nextId(),
    type: "type_romaji",
    prompt: vocab.jp,
    promptSub: vocab.id_,
    vocabId: vocab.id,
    jp: vocab.jp,
    romaji: vocab.romaji,
    answer: vocab.romaji.toLowerCase().replace(/\s+/g, " ").trim(),
    meaning: vocab.id_,
    lang: vocab.lang,
  };
}

function splitIntoSyllables(word: string): string[] | null {
  // Pola mora Bahasa Jepang: konsonan(0+) + vokal, "n" yang berdiri sendiri,
  // atau sisa konsonan di ujung kata (mis. "-tsu" tanpa vokal setelahnya).
  // Alternatif terakhir ini penting supaya TIDAK ADA huruf yang hilang.
  const syll = word.match(/[^aiueo]*[aiueo]|n(?![aiueo])|[^aiueo]+$/g);
  // Verifikasi gabungan hasil pecahan sama persis dengan kata asal — kalau
  // tidak, jangan dipakai (biar jatuh ke pemecahan per huruf) supaya tidak
  // ada huruf yang hilang/rusak saat disusun ulang.
  if (syll && syll.length > 1 && syll.join("") === word) return syll;
  return null;
}

// Pemecah "suku kata" generik untuk transliterasi Latin bahasa NON-Jepang
// (Inggris, Pinyin Mandarin, transliterasi Arab, transliterasi Rusia, dst).
// BUG LAMA yang diperbaiki: sebelumnya cuma Bahasa Jepang yang dipecah per
// suku kata, bahasa lain SELALU dipecah per huruf satu-satu — bikin soal
// susun-kata jadi lambat & melelahkan untuk kata panjang (mis. kata Rusia
// "zdravstvuyte" jadi 12 kotak huruf terpisah). Sekarang dipecah per gugus
// konsonan+vokal (mis. "teacher" -> "tea"+"cher", "privet" -> "pri"+"vet")
// pakai pola vokal umum a-e-i-o-u yang berlaku luas untuk ejaan Latin bahasa
// manapun.
//
// SELALU diverifikasi ketat: hasil gabungan semua potongan harus SAMA PERSIS
// dengan kata asal (termasuk sisa konsonan di ujung kata yang tidak diikuti
// vokal, mis. akhiran "-ct", "-st", "-nt" dirapel ke potongan terakhir).
// Kalau verifikasi gagal ATAU hasilnya cuma 1 potongan (kata terlalu pendek/
// tanpa huruf vokal sama sekali, mis. singkatan), fungsi ini mengembalikan
// `null` dan caller otomatis jatuh ke pemecahan per huruf seperti semula —
// jadi TIDAK ADA kemungkinan huruf hilang atau soal jadi rusak.
function splitIntoChunksGeneric(word: string): string[] | null {
  const syll = word.match(/[^aeiou]*[aeiou]+/g);
  if (!syll) return null;
  let joined = syll.join("");
  if (joined !== word) {
    // Ada sisa konsonan di ujung kata yang belum kepecah (regex butuh
    // minimal 1 huruf vokal per potongan) — rapel ke potongan terakhir.
    if (!word.startsWith(joined)) return null;
    syll[syll.length - 1] += word.slice(joined.length);
    joined = syll.join("");
  }
  if (joined === word && syll.length > 1) return syll;
  return null;
}

function buildWord(vocab: Vocab): Exercise {
  // Pecah kata jadi beberapa bagian untuk disusun ulang. Bahasa Jepang
  // dipecah per suku kata (mora) romaji yang polanya khas (lihat
  // splitIntoSyllables); bahasa lain dipecah per gugus konsonan+vokal yang
  // lebih generik (lihat splitIntoChunksGeneric) supaya kata panjang tidak
  // jadi puluhan kotak huruf satu-satu. Keduanya SELALU diverifikasi hasil
  // gabungannya sama persis dengan kata asal — kalau gagal, baru jatuh ke
  // pemecahan per huruf polos (inilah penyebab bug lama: "teacher" jadi
  // kehilangan huruf "r" waktu pemecahan suku kata dipaksakan tanpa verifikasi).
  const clean = vocab.romaji.toLowerCase().replace(/[^a-z ]/g, "");
  const chunks = clean.split(" ").flatMap((word) => {
    if (!word) return [];
    if (vocab.lang === "ja") {
      const syll = splitIntoSyllables(word);
      if (syll) return syll;
    } else {
      const syll = splitIntoChunksGeneric(word);
      if (syll) return syll;
    }
    return word.split("");
  });
  const scrambled = shuffle(chunks.length > 1 ? chunks : [...clean]);
  return {
    id: nextId(),
    type: "build_word",
    prompt: vocab.id_,
    promptSub: vocab.jp,
    vocabId: vocab.id,
    jp: vocab.jp,
    romaji: vocab.romaji,
    answer: clean.replace(/\s+/g, ""),
    scrambled,
    meaning: vocab.id_,
    lang: vocab.lang,
  };
}

function speakPrompt(vocab: Vocab): Exercise {
  // Utamakan contoh kalimat kalau ada (lebih natural buat latihan ngomong,
  // persis pola "Ulangi perkataan ..." ala Duolingo), fallback ke kata itu
  // sendiri kalau vocab ini tidak punya contoh kalimat.
  const target = vocab.example || vocab.jp;
  return {
    id: nextId(),
    type: "speak",
    prompt: target,
    promptSub: vocab.romaji,
    vocabId: vocab.id,
    jp: target,
    romaji: vocab.romaji,
    answer: target,
    meaning: vocab.id_,
    lang: vocab.lang,
  };
}

// PENTING buat pemula dari nol: kata yang BARU PERTAMA KALI muncul di
// sebuah pelajaran wajib dikenalkan lewat soal "pengenalan" dulu — lihat
// kata/dengar audio, lalu pilih artinya dari 4 opsi. Ini murni MENGENALI,
// bukan memproduksi, jadi user tidak butuh tahu apa-apa soal kata itu
// sebelumnya untuk bisa menjawab benar (tinggal baca/dengar lalu cocokkan).
const RECOGNITION_TYPES: ExerciseType[] = ["mc_jp_to_id", "listen_choose"];

// Jenis soal yang menuntut MENGINGAT atau MEMPRODUKSI kata itu sendiri
// (bukan cuma mengenali di antara pilihan) — pantas dipakai di ronde
// pengulangan, setelah kata itu sudah sempat diperkenalkan lebih dulu di
// pelajaran yang sama.
const RECALL_TYPES: ExerciseType[] = [
  "mc_id_to_jp",
  "build_word",
  "type_romaji",
  "speak",
];

/** Pilih satu jenis soal secara acak dari daftar, opsional mengecualikan
 *  satu jenis (dipakai supaya ronde ke-2 tidak dapat jenis soal yang sama
 *  persis dengan ronde ke-1 untuk kata yang sama — biar terasa "diulang
 *  dengan cara berbeda", bukan diulang persis sama). */
function randomType(pool: ExerciseType[], exclude?: ExerciseType): ExerciseType {
  const candidates = exclude ? pool.filter((t) => t !== exclude) : pool;
  const options = candidates.length > 0 ? candidates : pool;
  return options[Math.floor(Math.random() * options.length)];
}

function buildExercise(type: ExerciseType, vocab: Vocab, pool: Vocab[]): Exercise {
  switch (type) {
    case "mc_id_to_jp":
      return mcIdToJp(vocab, pool);
    case "listen_choose":
      return listenChoose(vocab, pool);
    case "build_word":
      return buildWord(vocab);
    case "type_romaji":
      return typeRomaji(vocab);
    case "speak":
      return speakPrompt(vocab);
    case "mc_jp_to_id":
    default:
      return mcJpToId(vocab, pool);
  }
}

/**
 * Susun ulang urutan soal supaya jenis yang sama tidak numpuk berturut-turut
 * (mis. 3 soal "speak"/mic nyambung terus, padahal user lagi di tempat umum
 * atau gak pake headphone). Sebelumnya urutan cuma hasil `shuffle()` polos,
 * yang secara statistik cukup sering menghasilkan run 2-3 jenis sama persis
 * berturut-turut. Pakai strategi mirip "task scheduler": tiap langkah pilih
 * dari kelompok jenis yang masih tersisa PALING BANYAK, asalkan bukan jenis
 * yang barusan dipakai.
 */
function spreadOutTypes(exercises: Exercise[]): Exercise[] {
  const buckets = new Map<ExerciseType, Exercise[]>();
  for (const ex of exercises) {
    if (!buckets.has(ex.type)) buckets.set(ex.type, []);
    buckets.get(ex.type)!.push(ex);
  }

  const result: Exercise[] = [];
  let lastType: ExerciseType | null = null;
  while (result.length < exercises.length) {
    const candidates = Array.from(buckets.entries())
      .filter(([, items]) => items.length > 0)
      .sort((a, b) => b[1].length - a[1].length);
    if (candidates.length === 0) break;
    const pick = candidates.find(([type]) => type !== lastType) || candidates[0];
    const [type, items] = pick;
    result.push(items.shift()!);
    lastType = type;
  }
  return result;
}

export function generateExerciseQueue(lesson: Lesson): Exercise[] {
  const pool = allVocabUpTo(lesson.unitId, lesson.id);

  // Urutan kata BARU yang diperkenalkan diacak (biar tiap kali mengulang
  // pelajaran terasa beda), tapi urutan MUNCULNYA soal untuk tiap kata tetap
  // dijaga: soal "pengenalan" (recognition) selalu ditempatkan sebelum soal
  // "pengulangan" (recall/produksi) untuk kata yang sama. Sebelumnya semua
  // soal (ronde 1 dan ronde 2) digabung lalu di-shuffle rata, jadi soal berat
  // seperti ketik/susun huruf/ngomong bisa nongol duluan untuk kata yang
  // belum pernah dikenalkan sama sekali — sangat membingungkan buat pemula.
  const order = shuffle(lesson.vocab.map((_, i) => i));

  const queue: Exercise[] = [];
  const pendingRecall: Vocab[] = [];
  let lastType: ExerciseType | null = null;

  function pushRecognition(vocab: Vocab) {
    const type = randomType(RECOGNITION_TYPES, lastType ?? undefined);
    queue.push(buildExercise(type, vocab, pool));
    lastType = type;
  }
  function pushRecall(vocab: Vocab) {
    const type = randomType(RECALL_TYPES, lastType ?? undefined);
    queue.push(buildExercise(type, vocab, pool));
    lastType = type;
  }

  let i = 0;
  while (i < order.length || pendingRecall.length > 0) {
    if (i < order.length) {
      const vocab = lesson.vocab[order[i]];
      pushRecognition(vocab);
      pendingRecall.push(vocab);
      i++;
    }
    // Baru selipkan soal pengulangan kalau sudah ada jarak minimal satu soal
    // lain sejak kata itu diperkenalkan (efek "spaced repetition" ringan),
    // atau kalau semua kata baru sudah habis diperkenalkan (sisa antrian
    // pengulangan harus tetap dikeluarkan semua sampai habis).
    if (pendingRecall.length >= 2 || (i >= order.length && pendingRecall.length > 0)) {
      const vocab = pendingRecall.shift()!;
      pushRecall(vocab);
    }
  }

  return queue;
}

export function generateReviewQueue(vocabList: Vocab[], allPool: Vocab[]): Exercise[] {
  const types: ExerciseType[] = [
    "mc_jp_to_id",
    "mc_id_to_jp",
    "listen_choose",
    "type_romaji",
    "speak",
  ];
  return spreadOutTypes(
    shuffle(vocabList.map((v) => buildExercise(randomType(types), v, allPool)))
  );
}
