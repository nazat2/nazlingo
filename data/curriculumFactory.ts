import { Unit, Vocab, Lesson } from "@/lib/types";
import { LanguageCode } from "@/lib/languages";
import { normalizeMeaning } from "@/lib/meaning";

// Format penulisan kompak: [kata, cara_baca, arti_indonesia, contoh?, contoh_arti?]
export type RawWord = [string, string, string, string?, string?];

export type RawLesson = {
  num: number;
  title: string;
  subtitle: string;
  words: RawWord[];
};

export type RawUnit = {
  id: string; // id generik tanpa prefix bahasa, mis. "u1" — dinamespace otomatis
  title: string;
  titleNative: string; // subjudul dalam bahasa target / tulisan aslinya
  description: string;
  icon: string;
  color: Unit["color"];
  lessons: RawLesson[];
};

function makeLesson(
  lang: LanguageCode,
  unitId: string,
  lessonNum: number,
  title: string,
  subtitle: string,
  words: RawWord[]
): Lesson {
  const id = `${unitId}-l${lessonNum}`;
  // Arti mentah di data boleh lengkap (mis. "baik / sehat", "dia (laki-laki)"),
  // tapi yang masuk ke aplikasi SELALU satu arti utama saja — lihat
  // lib/meaning.ts. Catatan dalam kurung jadi `hint`; arti lain disimpan di
  // `alt` (tidak pernah ditampilkan, hanya melonggarkan pengecekan ketikan).
  const vocab: Vocab[] = words.map((w, i) => {
    const m = normalizeMeaning(w[2]);
    return {
      id: `${id}-${i}`,
      jp: w[0],
      romaji: w[1],
      id_: m.meaning,
      hint: m.note,
      alt: m.alternates.length > 0 ? m.alternates : undefined,
      example: w[3],
      exampleId: w[4],
      lang,
    };
  });
  return { id, unitId, title, subtitle, vocab };
}

/**
 * Membangun daftar Unit untuk satu bahasa dari data mentah. Setiap id unit
 * dan pelajaran diberi prefix kode bahasa (mis. "ja-u1", "en-u1") supaya
 * progres belajar antar bahasa tidak saling bercampur meski strukturnya sama.
 */
export function buildCurriculum(lang: LanguageCode, raw: RawUnit[]): Unit[] {
  return raw.map((u, idx) => {
    const unitId = `${lang}-${u.id}`;
    return {
      id: unitId,
      index: idx,
      title: u.title,
      titleJp: u.titleNative,
      description: u.description,
      icon: u.icon,
      color: u.color,
      lessons: u.lessons.map((l) =>
        makeLesson(lang, unitId, l.num, l.title, l.subtitle, l.words)
      ),
    };
  });
}
