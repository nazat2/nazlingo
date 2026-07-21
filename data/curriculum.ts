import { Unit, Vocab, Lesson } from "@/lib/types";
import { LanguageCode, LANGUAGES } from "@/lib/languages";
import { buildCurriculum } from "./curriculumFactory";
import { JA_RAW } from "./curriculum.ja";
import { EN_RAW } from "./curriculum.en";
import { ZH_RAW } from "./curriculum.zh";
import { AR_RAW } from "./curriculum.ar";
import { RU_RAW } from "./curriculum.ru";

// Facade: menggabungkan kurikulum semua bahasa yang tersedia. Setiap unit &
// pelajaran punya id unik lintas bahasa (diberi prefix kode bahasa di
// curriculumFactory), jadi fungsi pencarian seperti getLesson/getUnit tidak
// perlu tahu bahasa apa yang sedang dipakai — cukup dari id-nya saja.

const JA_UNITS: Unit[] = buildCurriculum("ja", JA_RAW);
const EN_UNITS: Unit[] = buildCurriculum("en", EN_RAW);
const ZH_UNITS: Unit[] = buildCurriculum("zh", ZH_RAW);
const AR_UNITS: Unit[] = buildCurriculum("ar", AR_RAW);
const RU_UNITS: Unit[] = buildCurriculum("ru", RU_RAW);

const UNITS_BY_LANG: Record<LanguageCode, Unit[]> = {
  ja: JA_UNITS,
  en: EN_UNITS,
  zh: ZH_UNITS,
  ar: AR_UNITS,
  ru: RU_UNITS,
};

/** Semua unit dari semua bahasa digabung (dipakai untuk pencarian by-id). */
export const ALL_UNITS: Unit[] = [...JA_UNITS, ...EN_UNITS, ...ZH_UNITS, ...AR_UNITS, ...RU_UNITS];

/** Semua pelajaran dari semua bahasa digabung (dipakai untuk peta id->vocab). */
export const ALL_LESSONS: Lesson[] = ALL_UNITS.flatMap((u) => u.lessons);

/** Unit-unit untuk satu bahasa tertentu — dipakai halaman beranda. */
export function getUnitsFor(lang: LanguageCode): Unit[] {
  return UNITS_BY_LANG[lang];
}

/** Pelajaran-pelajaran untuk satu bahasa tertentu. */
export function getLessonsFor(lang: LanguageCode): Lesson[] {
  return UNITS_BY_LANG[lang].flatMap((u) => u.lessons);
}

function langOfUnitId(unitId: string): LanguageCode {
  // BUG LAMA: fungsi ini cuma cek `unitId.startsWith("en-") ? "en" : "ja"`.
  // Waktu cuma ada 2 bahasa (ja & en) itu kebetulan selalu benar, tapi
  // begitu ditambah bahasa baru (zh, ar, dst.) SEMUA unit non-"en-" bakal
  // salah kebaca sebagai "ja" — bikin allVocabUpTo/nextLesson nyasar ke
  // kurikulum Jepang buat pelajaran Mandarin/Arab. Sekarang deteksi
  // prefiksnya generik dari daftar LANGUAGES yang beneran terdaftar, jadi
  // otomatis benar untuk bahasa apa pun yang ditambah ke depannya.
  const found = LANGUAGES.find((l) => unitId.startsWith(`${l.code}-`));
  return found ? found.code : "ja";
}

export function getLesson(unitId: string, lessonId: string): Lesson | undefined {
  return ALL_UNITS.find((u) => u.id === unitId)?.lessons.find(
    (l) => l.id === lessonId
  );
}

export function getUnit(unitId: string): Unit | undefined {
  return ALL_UNITS.find((u) => u.id === unitId);
}

export function lessonIndexInUnit(unitId: string, lessonId: string): number {
  const unit = getUnit(unitId);
  if (!unit) return -1;
  return unit.lessons.findIndex((l) => l.id === lessonId);
}

export function allVocabUpTo(unitId: string, lessonId: string): Vocab[] {
  // Semua kosakata yang sudah "dipelajari" sampai pelajaran tertentu (untuk
  // distractor & review), dibatasi hanya pada bahasa yang sama dengan unitId.
  const unit = getUnit(unitId);
  if (!unit) return [];
  const scoped = UNITS_BY_LANG[langOfUnitId(unit.id)];
  const result: Vocab[] = [];
  for (const u of scoped) {
    for (const l of u.lessons) {
      result.push(...l.vocab);
      if (l.id === lessonId) return result;
    }
  }
  return result;
}

export function nextLesson(
  unitId: string,
  lessonId: string
): { unitId: string; lessonId: string } | null {
  const unit = getUnit(unitId);
  if (!unit) return null;
  const scoped = UNITS_BY_LANG[langOfUnitId(unit.id)];
  const unitIdx = scoped.findIndex((u) => u.id === unitId);
  if (unitIdx === -1) return null;
  const currentUnit = scoped[unitIdx];
  const lessonIdx = currentUnit.lessons.findIndex((l) => l.id === lessonId);
  if (lessonIdx < currentUnit.lessons.length - 1) {
    return { unitId, lessonId: currentUnit.lessons[lessonIdx + 1].id };
  }
  if (unitIdx < scoped.length - 1) {
    const nu = scoped[unitIdx + 1];
    return { unitId: nu.id, lessonId: nu.lessons[0].id };
  }
  return null;
}
