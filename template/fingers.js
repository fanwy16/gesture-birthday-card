/*
 * The eight fingers: a nickname for the birthday person + a greeting in one language.
 * The example's seven languages follow the language row on https://cjinn.org/.
 *
 * Finger order: left index, middle, ring, pinky, then right index … pinky.
 *
 *   name / nameSay   what is shown / what is spoken for the name (nameSay defaults to name)
 *   greet / greetSay what is shown / what is spoken for the greeting
 *   nameLang / lang  language of each; picks the voice below
 *   fx               the effect when the finale reaches this language
 *                    (ribbons, fireworks, balloons, hearts, stamps, bunting, sakura, world)
 *   meow             the pixel cat meows on this finger
 *   finale           the last finger: plays every language, the world map and the birthday edition
 *
 * After changing any words, regenerate the audio:  node make-audio.mjs
 */
export const FINGERS = [
  { name: "CJINN", nameLang: "en-US", nameSay: "C. Jinn", greet: "生日快乐！", lang: "zh-CN", language: "简体中文", glyph: "简", fx: "ribbons" },
  { name: "CJINN", nameLang: "en-US", nameSay: "C. Jinn", greet: "生日快樂！", lang: "zh-HK", language: "繁體中文", glyph: "繁", fx: "fireworks" },
  { name: "CJINN", nameLang: "en-US", nameSay: "C. Jinn", greet: "Happy birthday!", lang: "en-US", language: "English", glyph: "EN", fx: "balloons" },
  { name: "CJINN", nameLang: "en-US", nameSay: "C. Jinn", greet: "생일 축하해!", lang: "ko-KR", language: "한국어", glyph: "한", fx: "hearts" },
  { name: "CJINN", nameLang: "en-US", nameSay: "C. Jinn", greet: "生日을 祝賀합니다!", greetSay: "생일을 축하합니다!", lang: "ko-KR", tag: "ko-Hani", language: "朝漢混用", glyph: "漢", fx: "stamps" },
  { name: "CJINN", nameLang: "en-US", nameSay: "C. Jinn", greet: "¡Feliz cumpleaños!", lang: "es-ES", language: "Español", glyph: "ES", fx: "bunting" },
  { name: "CJINN", nameLang: "en-US", nameSay: "C. Jinn", greet: "お誕生日おめでとう！", lang: "ja-JP", language: "日本語", glyph: "日", meow: true, fx: "sakura" },
  { name: "CJINN", nameLang: "en-US", nameSay: "C. Jinn", greet: "Happy birthday, CJINN.", greetSay: "Happy birthday, C. Jinn!", lang: "en-US", language: "全部 · All", glyph: "ALL", finale: true, fx: "world" },
];

// The macOS voice used for each language when the audio files are generated (`say -v '?'` lists them).
export const VOICES = {
  "zh-CN": "Tingting",
  "zh-HK": "Sinji",
  "zh-TW": "Meijia",
  "en-US": "Samantha",
  "ko-KR": "Yuna",
  "ja-JP": "Kyoko",
  "es-ES": "Mónica",
};

// Pre-recorded audio for each line (made by make-audio.mjs).
export const audioFor = (index, part) => `audio/${part}-${index}.m4a`;
