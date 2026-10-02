import { Exercise, ExerciseOption, ExerciseType, Lesson, Vocab } from "@/lib/types";
import { allVocabUpTo, getAllVocabFor } from "@/data/curriculum";
import { getLanguageMeta } from "@/lib/languages";
import { acceptedWritings, meaningKeysOf, normalizeWriting } from "@/lib/answers";
import { meaningKey } from "@/lib/meaning";
import { isSpeechRecognitionSupported } from "@/lib/speech";

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Dua kata dianggap "berarti sama" kalau salah satu arti sahnya beririsan
 *  (arti utama atau arti lain yang tidak ditampilkan). */
function sharesMeaning(a: Vocab, b: Vocab): boolean {
  const keysA = meaningKeysOf(a);
  return meaningKeysOf(b).some((k) => keysA.indexOf(k) !== -1);
}

/**
 * Memilih pengecoh (jawaban salah) untuk soal pilihan ganda.
 *
 * Aturan yang dijaga (semuanya pernah jadi sumber soal "membingungkan"):
 *  - Pengecoh TIDAK BOLEH berarti sama dengan jawaban benar (mis. "Thanks"
 *    vs "Thank you" sama-sama "terima kasih") — kalau tidak, ada 2 jawaban
 *    yang sebenarnya benar.
 *  - Tidak ada dua pilihan yang TAMPILANNYA sama persis (mis. dua kata
 *    berbeda yang sama-sama berarti "tenang" muncul sebagai dua kotak
 *    "tenang"). `kind` menentukan apa yang jadi label pilihan: arti
 *    Indonesia ("meaning") atau kata bahasa target ("target").
 *  - Kalau kosakata yang sudah dipelajari (`pool`) terlalu sedikit (sering
 *    terjadi di pelajaran awal tiap unit), sisanya diambil dari SELURUH
 *    kosakata bahasa itu, supaya jumlah pilihan tetap konsisten 4.
 */
function pickDistractors(
  pool: Vocab[],
  correct: Vocab,
  count: number,
  kind: "meaning" | "target"
): Vocab[] {
  const labelOf = (v: Vocab) =>
    kind === "meaning" ? meaningKey(v.id_) : normalizeWriting(v.jp, v.lang);
  const usedLabels = new Set<string>([labelOf(correct)]);
  const usedIds = new Set<string>([correct.id]);
  const chosen: Vocab[] = [];

  const consume = (candidates: Vocab[]) => {
    for (const v of shuffle(candidates)) {
      if (chosen.length >= count) return;
      if (usedIds.has(v.id)) continue;
      const label = labelOf(v);
      if (!label || usedLabels.has(label)) continue;
      if (sharesMeaning(correct, v)) continue;
      chosen.push(v);
      usedIds.add(v.id);
      usedLabels.add(label);
    }
  };

  consume(pool);
  if (chosen.length < count) consume(getAllVocabFor(correct.lang));
  return chosen;
}

let uid = 0;
function nextId() {
  uid += 1;
  return `ex-${Date.now()}-${uid}`;
}

/** Tampilan "kata + cara baca" untuk bahasa beraksara sendiri, mis.
 *  "ありがとう (arigatou)". Bahasa Latin (Inggris) cukup kata aslinya. */
function targetWithReading(v: Vocab): string {
  if (getLanguageMeta(v.lang).latinScript) return v.jp;
  return `${v.jp} (${v.romaji})`;
}

function mcJpToId(vocab: Vocab, pool: Vocab[]): Exercise {
  const distractors = pickDistractors(pool, vocab, 3, "meaning");
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
    answerDisplay: vocab.id_,
    lang: vocab.lang,
  };
}

function mcIdToJp(vocab: Vocab, pool: Vocab[]): Exercise {
  const distractors = pickDistractors(pool, vocab, 3, "target");
  const options: ExerciseOption[] = shuffle([
    { id: vocab.id, label: vocab.jp, sub: vocab.romaji, correct: true },
    ...distractors.map((d) => ({ id: d.id, label: d.jp, sub: d.romaji, correct: false })),
  ]);
  return {
    id: nextId(),
    type: "mc_id_to_jp",
    prompt: vocab.id_,
    promptSub: vocab.hint,
    vocabId: vocab.id,
    jp: vocab.jp,
    romaji: vocab.romaji,
    options,
    meaning: vocab.id_,
    hint: vocab.hint,
    answerDisplay: targetWithReading(vocab),
    lang: vocab.lang,
  };
}

function listenChoose(vocab: Vocab, pool: Vocab[]): Exercise {
  // Teks kata target (+ romaji + contoh kalimat kalau ada) tetap ditampilkan
  // — sama seperti mc_jp_to_id — supaya pemula yang baru PERTAMA kali
  // bertemu kata ini tidak disuruh menebak sesuatu yang belum pernah
  // dilihat. Bedanya, di tipe ini tombol audio yang paling menonjol dan
  // suaranya diputar otomatis saat soal muncul (lihat ExerciseCard).
  const distractors = pickDistractors(pool, vocab, 3, "meaning");
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
    answerDisplay: vocab.id_,
    lang: vocab.lang,
  };
}

/**
 * Soal ketik #1 — TERJEMAHKAN ke Bahasa Indonesia: pengguna melihat kata
 * bahasa target (+ suara) lalu mengetik ARTInya. Jawaban yang diterima =
 * arti utama, ditambah arti lain dari data yang sebenarnya juga benar
 * (tidak pernah ditampilkan, cuma biar jawaban sah tidak dihitung salah).
 */
function typeMeaning(vocab: Vocab): Exercise {
  return {
    id: nextId(),
    type: "type_meaning",
    prompt: vocab.jp,
    promptSub: vocab.romaji,
    vocabId: vocab.id,
    jp: vocab.jp,
    romaji: vocab.romaji,
    accepts: meaningKeysOf(vocab),
    answerDisplay: vocab.id_,
    meaning: vocab.id_,
    example: vocab.example,
    exampleId: vocab.exampleId,
    lang: vocab.lang,
  };
}

/**
 * Soal ketik #2 — TULIS dalam bahasa target: pengguna melihat arti
 * Indonesia lalu menulis katanya. Boleh pakai aksara asli (ありがとう) ATAU
 * cara baca Latin (arigatou) — lihat lib/answers.ts. Kalau beberapa kata
 * berarti sama (sinonim, mis. "Thanks"/"Thank you"), SEMUANYA diterima.
 */
function typeTarget(vocab: Vocab): Exercise {
  const key = meaningKey(vocab.id_);
  const accepts: string[] = [];
  const addAll = (list: string[]) =>
    list.forEach((w) => {
      if (accepts.indexOf(w) === -1) accepts.push(w);
    });
  addAll(acceptedWritings(vocab));
  for (const other of getAllVocabFor(vocab.lang)) {
    if (other.id !== vocab.id && meaningKeysOf(other).indexOf(key) !== -1) {
      addAll(acceptedWritings(other));
    }
  }
  return {
    id: nextId(),
    type: "type_target",
    prompt: vocab.id_,
    promptSub: vocab.hint,
    vocabId: vocab.id,
    jp: vocab.jp,
    romaji: vocab.romaji,
    accepts,
    answerDisplay: targetWithReading(vocab),
    meaning: vocab.id_,
    hint: vocab.hint,
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

/** Pecah cara baca jadi potongan-potongan untuk soal susun-kata. Selalu
 *  menghasilkan potongan yang jika digabung SAMA PERSIS dengan `clean`. */
function chunkReading(clean: string, lang: Vocab["lang"]): string[] {
  const chunks = clean.split(" ").flatMap((word) => {
    if (!word) return [];
    if (lang === "ja") {
      const syll = splitIntoSyllables(word);
      if (syll) return syll;
    } else {
      const syll = splitIntoChunksGeneric(word);
      if (syll) return syll;
    }
    return word.split("");
  });
  return chunks.length > 1 ? chunks : [...clean.replace(/\s+/g, "")];
}

function cleanReading(vocab: Vocab): string {
  return vocab.romaji.toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();
}

/** Soal susun-kata hanya masuk akal kalau ada minimal 3 huruf untuk disusun. */
function canBuildWord(vocab: Vocab): boolean {
  return cleanReading(vocab).replace(/\s+/g, "").length >= 3;
}

function buildWord(vocab: Vocab): Exercise {
  // Bahasa Jepang dipecah per suku kata (mora) romaji; bahasa lain per gugus
  // konsonan+vokal. Keduanya SELALU diverifikasi hasil gabungannya sama persis
  // dengan kata asal — kalau gagal, jatuh ke pemecahan per huruf polos supaya
  // tidak ada huruf yang hilang.
  const clean = cleanReading(vocab);
  const answer = clean.replace(/\s+/g, "");
  const scrambled = shuffle(chunkReading(clean, vocab.lang));
  return {
    id: nextId(),
    type: "build_word",
    prompt: vocab.id_,
    promptSub: vocab.jp,
    vocabId: vocab.id,
    jp: vocab.jp,
    romaji: vocab.romaji,
    answer,
    scrambled,
    meaning: vocab.id_,
    hint: vocab.hint,
    answerDisplay: vocab.romaji,
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
    answerDisplay: target,
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
// (bukan cuma mengenali di antara pilihan) — dipakai di ronde pengulangan,
// setelah kata itu sudah sempat diperkenalkan lebih dulu di pelajaran yang
// sama. Dua soal ketik sengaja ada dua arah: terjemahkan ke Indonesia
// (type_meaning) DAN tulis dalam bahasa target (type_target), jadi latihan
// mengetik tidak lagi sekadar menyalin apa yang terlihat.
const RECALL_TYPES: ExerciseType[] = [
  "type_meaning",
  "type_target",
  "mc_id_to_jp",
  "build_word",
  "speak",
];

// Semua jenis soal yang dipakai di halaman Ulangi (review).
const REVIEW_TYPES: ExerciseType[] = [
  "mc_jp_to_id",
  "mc_id_to_jp",
  "listen_choose",
  "type_meaning",
  "type_target",
  "build_word",
  "speak",
];

/** Apakah jenis soal ini bisa dibuat/dikerjakan untuk kata tertentu di
 *  perangkat ini. Soal bicara disaring kalau browser tidak mendukung
 *  pengenalan suara (iOS Safari, Firefox, dll) — daripada muncul soal yang
 *  isinya cuma tombol "lewati". */
function isApplicable(type: ExerciseType, vocab: Vocab, speakOk: boolean): boolean {
  if (type === "speak") return speakOk;
  if (type === "build_word") return canBuildWord(vocab);
  return true;
}

function speechRecognitionAvailable(): boolean {
  try {
    return isSpeechRecognitionSupported();
  } catch {
    return false;
  }
}

/**
 * "Kantong" jenis soal bergilir: tiap jenis keluar sekali per putaran dalam
 * urutan acak, baru diisi ulang. Hasilnya jenis soal PASTI bervariasi dan
 * merata (di pelajaran 10 kata, tiap jenis muncul ~2x) — bukan murni acak
 * yang kadang bisa kebetulan 4 soal ketik berturut-turut atau tidak pernah
 * kebagian soal ketik sama sekali.
 */
class TypeBag {
  private bag: ExerciseType[] = [];
  constructor(private readonly types: ExerciseType[]) {}

  take(vocab: Vocab, speakOk: boolean, last: ExerciseType | null): ExerciseType {
    for (let round = 0; round < 2; round++) {
      if (this.bag.length === 0) this.bag = shuffle(this.types);
      // Prioritaskan jenis yang bisa dipakai & beda dari soal sebelumnya.
      let idx = this.bag.findIndex(
        (t) => t !== last && isApplicable(t, vocab, speakOk)
      );
      if (idx === -1) {
        idx = this.bag.findIndex((t) => isApplicable(t, vocab, speakOk));
      }
      if (idx !== -1) return this.bag.splice(idx, 1)[0];
      this.bag = []; // bahkan isi kantong baru pun tidak ada yang cocok -> fallback di bawah
    }
    return "mc_id_to_jp"; // selalu applicable
  }
}

function buildExercise(type: ExerciseType, vocab: Vocab, pool: Vocab[]): Exercise {
  switch (type) {
    case "mc_id_to_jp":
      return mcIdToJp(vocab, pool);
    case "listen_choose":
      return listenChoose(vocab, pool);
    case "build_word":
      return buildWord(vocab);
    case "type_meaning":
      return typeMeaning(vocab);
    case "type_target":
      return typeTarget(vocab);
    case "speak":
      return speakPrompt(vocab);
    case "mc_jp_to_id":
    default:
      return mcJpToId(vocab, pool);
  }
}

/** Pilih satu jenis acak dari daftar, tidak sama dengan soal sebelumnya. */
function randomType(types: ExerciseType[], last: ExerciseType | null): ExerciseType {
  const candidates = last ? types.filter((t) => t !== last) : types;
  const list = candidates.length > 0 ? candidates : types;
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Susun ulang urutan soal supaya jenis yang sama tidak numpuk berturut-turut.
 * Strategi mirip "task scheduler": tiap langkah ambil dari kelompok jenis yang
 * masih tersisa PALING BANYAK, asalkan bukan jenis yang barusan dipakai.
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
  const speakOk = speechRecognitionAvailable();
  const recallBag = new TypeBag(RECALL_TYPES);

  // Urutan kata BARU yang diperkenalkan diacak (biar tiap kali mengulang
  // pelajaran terasa beda), tapi urutan MUNCULNYA soal untuk tiap kata tetap
  // dijaga: soal "pengenalan" (recognition) selalu ditempatkan sebelum soal
  // "pengulangan" (recall/produksi) untuk kata yang sama.
  const order = shuffle(lesson.vocab.map((_, i) => i));

  const queue: Exercise[] = [];
  const pendingRecall: Vocab[] = [];
  let lastType: ExerciseType | null = null;

  function pushRecognition(vocab: Vocab) {
    const type = randomType(RECOGNITION_TYPES, lastType);
    queue.push(buildExercise(type, vocab, pool));
    lastType = type;
  }
  function pushRecall(vocab: Vocab) {
    const type = recallBag.take(vocab, speakOk, lastType);
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
    // Soal pengulangan baru diselipkan kalau sudah ada jarak minimal satu
    // soal lain sejak kata itu diperkenalkan (efek "spaced repetition"
    // ringan), atau kalau semua kata baru sudah habis diperkenalkan (sisa
    // antrian pengulangan tetap dikeluarkan sampai habis).
    if (pendingRecall.length >= 2 || (i >= order.length && pendingRecall.length > 0)) {
      pushRecall(pendingRecall.shift()!);
    }
  }

  return queue;
}

export function generateReviewQueue(vocabList: Vocab[], allPool: Vocab[]): Exercise[] {
  const speakOk = speechRecognitionAvailable();
  const bag = new TypeBag(REVIEW_TYPES);
  const exercises = shuffle(vocabList).map((v) =>
    buildExercise(bag.take(v, speakOk, null), v, allPool)
  );
  return spreadOutTypes(exercises);
}
