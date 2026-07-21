"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { HIRAGANA_ROWS, KATAKANA_ROWS } from "@/data/hiragana";
import { PINYIN_INITIAL_ROWS, PINYIN_FINAL_ROWS } from "@/data/pinyin";
import { HIJAIYAH_ROWS } from "@/data/hijaiyah";
import { CYRILLIC_VOWEL_ROWS, CYRILLIC_CONSONANT_ROWS } from "@/data/cyrillic";
import { speakText } from "@/lib/tts";
import { cn } from "@/lib/cn";
import { LanguageCode } from "@/lib/languages";

// BUG LAMA: halaman referensi aksara ini dulu HANYA ada buat Bahasa Jepang
// (namanya "Huruf Kana", route /hiragana) — kalau lagi belajar Mandarin
// atau Arab, tidak ada padanannya sama sekali. Sekarang satu halaman ini
// otomatis menyesuaikan isinya dengan bahasa yang lagi aktif, dan
// namanya BUKAN "Kana" lagi buat bahasa selain Jepang — karena "Kana"
// memang istilah khusus sistem tulisan Jepang, bukan istilah umum:
// - Jepang    -> "Huruf Kana"      (Hiragana & Katakana)
// - Mandarin  -> "Pinyin"          (ejaan bunyi resmi, bukan aksara/huruf)
// - Arab      -> "Huruf Hijaiyah"  (28 huruf dasar Arab)
// - Rusia     -> "Alfabet Cyrillic" (33 huruf resmi, aksara asli Bahasa Rusia)
// - Inggris   -> tidak ada halaman ini sama sekali, karena Bahasa Inggris
//   sudah memakai huruf Latin yang persis sama dengan Bahasa Indonesia,
//   jadi tidak ada aksara terpisah yang perlu dipelajari.

type Item = { native: string; reading: string };
type Row = { label: string; items: (Item | null)[] };
type Tab = { key: string; label: string; rows: Row[]; speakLang: LanguageCode };

type PageConfig = {
  title: string;
  description: string;
  tabs: Tab[];
  note?: string;
};

function fromHiragana(rows: typeof HIRAGANA_ROWS): Row[] {
  return rows.map((r) => ({
    label: r.label,
    items: r.kana.map((k) => (k ? { native: k.jp, reading: k.romaji } : null)),
  }));
}

const CONFIG: Record<LanguageCode, PageConfig | null> = {
  ja: {
    title: "Huruf Kana",
    description:
      "Ketuk tiap huruf untuk dengar cara bacanya. Hiragana dipakai untuk kata asli Jepang, Katakana untuk kata serapan asing.",
    tabs: [
      { key: "hiragana", label: "Hiragana ひらがな", rows: fromHiragana(HIRAGANA_ROWS), speakLang: "ja" },
      { key: "katakana", label: "Katakana カタカナ", rows: fromHiragana(KATAKANA_ROWS), speakLang: "ja" },
    ],
  },
  zh: {
    title: "Pinyin",
    description:
      "Ketuk tiap suku kata untuk dengar cara bacanya. Pinyin bukan aksara tersendiri, tapi ejaan bunyi resmi Bahasa Mandarin pakai huruf Latin — dipakai berdampingan dengan Hanzi.",
    tabs: [
      { key: "initial", label: "Konsonan Awal", rows: PINYIN_INITIAL_ROWS, speakLang: "zh" },
      { key: "final", label: "Vokal Akhir", rows: PINYIN_FINAL_ROWS, speakLang: "zh" },
    ],
    note: "Suara mungkin kurang sempurna untuk suku kata lepas seperti ini (tanpa tanda nada) — nanti begitu masuk latihan kosakata, suaranya sudah kata Mandarin utuh.",
  },
  ar: {
    title: "Huruf Hijaiyah",
    description:
      "Ketuk tiap huruf untuk dengar bunyinya. Ini 28 huruf dasar Bahasa Arab, urut sesuai abjad aslinya.",
    tabs: [{ key: "hijaiyah", label: "Huruf Hijaiyah", rows: HIJAIYAH_ROWS, speakLang: "ar" }],
    note: "Suara berdasarkan bunyi huruf lepas, bisa sedikit berbeda dari cara ustadz/guru mengaji mengajarkannya.",
  },
  ru: {
    title: "Alfabet Cyrillic",
    description:
      "Ketuk tiap huruf untuk dengar bunyinya. Ini 33 huruf resmi alfabet Rusia — aksara asli yang dipakai menulis Bahasa Rusia, bukan sekadar ejaan Latin.",
    tabs: [
      { key: "vowels", label: "Vokal (Гласные)", rows: CYRILLIC_VOWEL_ROWS, speakLang: "ru" },
      { key: "consonants", label: "Konsonan (Согласные)", rows: CYRILLIC_CONSONANT_ROWS, speakLang: "ru" },
    ],
    note: "Ъ (tanda keras) dan Ь (tanda lunak) tidak punya bunyi sendiri — fungsinya mengubah cara baca huruf di sekitarnya, bukan menambah bunyi baru.",
  },
  en: null,
};

export default function AlphabetPage() {
  const { language } = useLanguage();
  const config = CONFIG[language];

  const [tabKey, setTabKey] = useState(config?.tabs[0]?.key ?? "");
  const activeTabs = config?.tabs ?? [];
  // Kalau bahasa baru saja dipindah (mis. dari Jepang ke Mandarin) dan
  // tabKey tersimpan sebelumnya tidak cocok lagi dengan tab bahasa baru,
  // jatuhkan balik ke tab pertama yang tersedia supaya tidak nge-blank.
  const tab = activeTabs.find((t) => t.key === tabKey) ?? activeTabs[0];

  if (!config) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 md:pb-12">
        <h1 className="font-display text-2xl font-bold">Huruf & Aksara</h1>
        <p className="mt-3 rounded-2xl bg-surface p-5 text-sm text-ink/60 shadow-card">
          Bahasa Inggris sudah memakai huruf Latin yang persis sama dengan
          Bahasa Indonesia, jadi tidak ada aksara khusus yang perlu dipelajari
          di sini. Langsung lanjut saja ke pelajaran kosakata.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 md:pb-12">
      <h1 className="font-display text-2xl font-bold">{config.title}</h1>
      <p className="mt-1 text-sm text-ink/50">{config.description}</p>

      {activeTabs.length > 1 && (
        <div className="mt-6 flex gap-2 rounded-2xl bg-ink/5 p-1.5">
          {activeTabs.map((t) => (
            <TabButton key={t.key} active={t.key === tab.key} onClick={() => setTabKey(t.key)}>
              {t.label}
            </TabButton>
          ))}
        </div>
      )}

      <div className="mt-8 space-y-3">
        {tab.rows.map((row, ri) => (
          <div key={`${row.label}-${ri}`} className="flex items-center gap-2 sm:gap-3">
            <div className="grid flex-1 grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3">
              {row.items.map((item, i) =>
                item ? (
                  <CharTile key={i} item={item} lang={tab.speakLang} />
                ) : (
                  <div key={i} />
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {config.note && (
        <p className="mt-6 text-xs text-ink/40">{config.note}</p>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors",
        active ? "bg-surface text-indigo-deep shadow-card" : "text-ink/40"
      )}
    >
      {children}
    </button>
  );
}

function CharTile({ item, lang }: { item: Item; lang: LanguageCode }) {
  return (
    <button
      onClick={() => speakText(item.native, lang)}
      className="flex aspect-square flex-col items-center justify-center rounded-2xl bg-surface shadow-card transition-transform hover:-translate-y-0.5 hover:shadow-node active:translate-y-0"
    >
      <span lang={lang} className="font-display text-2xl font-bold text-ink sm:text-3xl">
        {item.native}
      </span>
      <span className="mt-0.5 font-mono text-[11px] text-ink/40 sm:text-xs">
        {item.reading}
      </span>
    </button>
  );
}
