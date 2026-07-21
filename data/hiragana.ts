export type Kana = { jp: string; romaji: string };
export type KanaRow = { label: string; kana: (Kana | null)[] };

export const HIRAGANA_ROWS: KanaRow[] = [
  { label: "a-i-u-e-o", kana: [{ jp: "あ", romaji: "a" }, { jp: "い", romaji: "i" }, { jp: "う", romaji: "u" }, { jp: "え", romaji: "e" }, { jp: "お", romaji: "o" }] },
  { label: "ka-ki-ku-ke-ko", kana: [{ jp: "か", romaji: "ka" }, { jp: "き", romaji: "ki" }, { jp: "く", romaji: "ku" }, { jp: "け", romaji: "ke" }, { jp: "こ", romaji: "ko" }] },
  { label: "sa-shi-su-se-so", kana: [{ jp: "さ", romaji: "sa" }, { jp: "し", romaji: "shi" }, { jp: "す", romaji: "su" }, { jp: "せ", romaji: "se" }, { jp: "そ", romaji: "so" }] },
  { label: "ta-chi-tsu-te-to", kana: [{ jp: "た", romaji: "ta" }, { jp: "ち", romaji: "chi" }, { jp: "つ", romaji: "tsu" }, { jp: "て", romaji: "te" }, { jp: "と", romaji: "to" }] },
  { label: "na-ni-nu-ne-no", kana: [{ jp: "な", romaji: "na" }, { jp: "に", romaji: "ni" }, { jp: "ぬ", romaji: "nu" }, { jp: "ね", romaji: "ne" }, { jp: "の", romaji: "no" }] },
  { label: "ha-hi-fu-he-ho", kana: [{ jp: "は", romaji: "ha" }, { jp: "ひ", romaji: "hi" }, { jp: "ふ", romaji: "fu" }, { jp: "へ", romaji: "he" }, { jp: "ほ", romaji: "ho" }] },
  { label: "ma-mi-mu-me-mo", kana: [{ jp: "ま", romaji: "ma" }, { jp: "み", romaji: "mi" }, { jp: "む", romaji: "mu" }, { jp: "め", romaji: "me" }, { jp: "も", romaji: "mo" }] },
  { label: "ya-yu-yo", kana: [{ jp: "や", romaji: "ya" }, null, { jp: "ゆ", romaji: "yu" }, null, { jp: "よ", romaji: "yo" }] },
  { label: "ra-ri-ru-re-ro", kana: [{ jp: "ら", romaji: "ra" }, { jp: "り", romaji: "ri" }, { jp: "る", romaji: "ru" }, { jp: "れ", romaji: "re" }, { jp: "ろ", romaji: "ro" }] },
  { label: "wa-(w)o-n", kana: [{ jp: "わ", romaji: "wa" }, null, null, null, { jp: "を", romaji: "wo" }] },
  { label: "n", kana: [{ jp: "ん", romaji: "n" }, null, null, null, null] },
];

export const KATAKANA_ROWS: KanaRow[] = [
  { label: "a-i-u-e-o", kana: [{ jp: "ア", romaji: "a" }, { jp: "イ", romaji: "i" }, { jp: "ウ", romaji: "u" }, { jp: "エ", romaji: "e" }, { jp: "オ", romaji: "o" }] },
  { label: "ka-ki-ku-ke-ko", kana: [{ jp: "カ", romaji: "ka" }, { jp: "キ", romaji: "ki" }, { jp: "ク", romaji: "ku" }, { jp: "ケ", romaji: "ke" }, { jp: "コ", romaji: "ko" }] },
  { label: "sa-shi-su-se-so", kana: [{ jp: "サ", romaji: "sa" }, { jp: "シ", romaji: "shi" }, { jp: "ス", romaji: "su" }, { jp: "セ", romaji: "se" }, { jp: "ソ", romaji: "so" }] },
  { label: "ta-chi-tsu-te-to", kana: [{ jp: "タ", romaji: "ta" }, { jp: "チ", romaji: "chi" }, { jp: "ツ", romaji: "tsu" }, { jp: "テ", romaji: "te" }, { jp: "ト", romaji: "to" }] },
  { label: "na-ni-nu-ne-no", kana: [{ jp: "ナ", romaji: "na" }, { jp: "ニ", romaji: "ni" }, { jp: "ヌ", romaji: "nu" }, { jp: "ネ", romaji: "ne" }, { jp: "ノ", romaji: "no" }] },
  { label: "ha-hi-fu-he-ho", kana: [{ jp: "ハ", romaji: "ha" }, { jp: "ヒ", romaji: "hi" }, { jp: "フ", romaji: "fu" }, { jp: "ヘ", romaji: "he" }, { jp: "ホ", romaji: "ho" }] },
  { label: "ma-mi-mu-me-mo", kana: [{ jp: "マ", romaji: "ma" }, { jp: "ミ", romaji: "mi" }, { jp: "ム", romaji: "mu" }, { jp: "メ", romaji: "me" }, { jp: "モ", romaji: "mo" }] },
  { label: "ya-yu-yo", kana: [{ jp: "ヤ", romaji: "ya" }, null, { jp: "ユ", romaji: "yu" }, null, { jp: "ヨ", romaji: "yo" }] },
  { label: "ra-ri-ru-re-ro", kana: [{ jp: "ラ", romaji: "ra" }, { jp: "リ", romaji: "ri" }, { jp: "ル", romaji: "ru" }, { jp: "レ", romaji: "re" }, { jp: "ロ", romaji: "ro" }] },
  { label: "wa-(w)o-n", kana: [{ jp: "ワ", romaji: "wa" }, null, null, null, { jp: "ヲ", romaji: "wo" }] },
  { label: "n", kana: [{ jp: "ン", romaji: "n" }, null, null, null, null] },
];
