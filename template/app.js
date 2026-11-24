/*
 * A gesture birthday card — from Wendy's world to CJINN's (https://cjinn.org/).
 *
 * Every finger holds a nickname AND a language. A tap calls the name (the
 * sender's style), then the world answers in that language (the recipient's
 * style). Each new name moves the whole card a step from one style toward the
 * other; the last finger plays every language and opens a birthday edition.
 *
 * Fingertip contact detection is TapTalk's ContactTracker (contact-tracker.mjs,
 * copied unchanged) on MediaPipe Hand Landmarker with TapTalk's live
 * thresholds. Speech is pre-recorded with the Mac's voices (audio/, made by
 * make-audio.mjs); the browser's speech engine is only a fallback.
 *
 * ── Edit the words in fingers.js, then run `node make-audio.mjs` ─────────
 */
import { ContactTracker, FINGER_IDS, TRACKING_STATES } from "./contact-tracker.mjs";
import { FINGERS, audioFor } from "./fingers.js"; // the eight names + languages live in fingers.js

const EDITION = {
  letter: [], // optional closing note for the birthday edition, one string per paragraph
  stamp: "CJINN · 2026", // small text on the finale's postmarks
};

// Easter egg: tap finger `index` three times in a row to skip straight to the finale.
const SHORTCUT = { index: 2, taps: 3, windowMs: 3000 };

// Once the finale has said this many languages, gestures (and keys/clicks) stop being
// recognised until the birthday edition is closed, so nothing can interrupt the ending.
const FINALE_LOCK_AFTER = 4;

/* ── Editable fingers (like TapTalk): name, greeting, language ─────── */

// Languages offered in the editor. Edited text is spoken by the browser's voice.
const LANGS = {
  "zh-CN": ["简体中文", "简"], "zh-HK": ["粵語", "粤"], "zh-TW": ["國語", "臺"],
  "en-US": ["English", "EN"], "en-GB": ["English (UK)", "UK"], "ko-KR": ["한국어", "한"],
  "ja-JP": ["日本語", "日"], "es-ES": ["Español", "ES"], "fr-FR": ["Français", "FR"],
  "de-DE": ["Deutsch", "DE"], "it-IT": ["Italiano", "IT"], "pt-BR": ["Português", "PT"],
  "ru-RU": ["Русский", "RU"], "th-TH": ["ไทย", "ไทย"], "vi-VN": ["Tiếng Việt", "VI"],
  "id-ID": ["Bahasa Indonesia", "ID"], "hi-IN": ["हिन्दी", "हि"], "ar-SA": ["العربية", "ع"],
};
const DEFAULTS = structuredClone(FINGERS);
const CUSTOM_KEY = "bday-card-fingers";

/** Guess which voice should read an edited nickname. */
function guessLang(text, fallback) {
  if (/[가-힯]/.test(text)) return "ko-KR";
  if (/[぀-ヿ]/.test(text)) return "ja-JP";
  if (/[一-鿿]/.test(text)) return fallback.startsWith("zh") ? fallback : "zh-CN";
  return "en-US";
}

/** custom[i] = { name?, greet?, lang? }, only the fields that differ from fingers.js. */
function applyCustom(custom) {
  FINGERS.forEach((f, i) => {
    const d = DEFAULTS[i];
    const c = custom?.[i] ?? {};
    for (const key of Object.keys(f)) delete f[key];
    Object.assign(f, structuredClone(d));
    if (c.name && c.name !== d.name) {
      f.name = c.name;
      f.nameLang = guessLang(c.name, d.nameLang);
      delete f.nameSay;
      f.nameCustom = true;
    }
    if (c.lang && c.lang !== d.lang && LANGS[c.lang]) {
      f.lang = c.lang;
      delete f.tag;
      if (!f.finale) [f.language, f.glyph] = LANGS[c.lang];
      f.greetCustom = true;
    }
    if (c.greet && c.greet !== d.greet) {
      f.greet = c.greet;
      delete f.greetSay;
      f.greetCustom = true;
    }
  });
}

// Recorded clip only when the words are still the ones in fingers.js.
const clipFor = (i, part) => ((part === "name" ? FINGERS[i].nameCustom : FINGERS[i].greetCustom) ? undefined : audioFor(i, part));

// A shared link (#f=…) wins over what this browser saved.
const encodeCustom = (custom) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(custom))))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function decodeCustom(s) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0))));
}
function loadCustom() {
  const hash = new URLSearchParams(location.hash.slice(1)).get("f");
  try {
    if (hash) return decodeCustom(hash);
  } catch {}
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? "null");
  } catch {
    return null;
  }
}
applyCustom(loadCustom());

/* ───────────────────────────────────────────────────────────────────── */

const FINALE = FINGERS.findIndex((f) => f.finale);
const REGULAR = FINGERS.filter((f) => !f.finale).length;
const MEDIAPIPE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35";
const MODEL_URL = new URL("./models/hand_landmarker.task", import.meta.url).href;
const LIVE_CONTACT_OPTIONS = {
  contactThreshold: 0.55,
  separationThreshold: 0.78,
  contactConfirmFrames: 1,
  separationConfirmFrames: 1,
  minConfidence: 0,
};
const REDUCED_MOTION = matchMedia("(prefers-reduced-motion: reduce)").matches;
const STORE_KEY = "bday-card-collected";

const $ = (id) => document.getElementById(id);
const els = {
  stage: $("stage"),
  video: $("video"),
  markers: $("markers"),
  placeholder: $("placeholder"),
  start: $("start"),
  stop: $("stop"),
  status: $("status"),
  caption: $("caption"),
  name: $("cap-name"),
  greet: $("cap-greet"),
  left: $("hand-left"),
  right: $("hand-right"),
  langRow: $("lang-row"),
  passport: $("passport-cells"),
  journeyCount: $("journey-count"),
  restart: $("restart"),
  buddy: $("buddy"),
  catPlaceholder: $("cat-placeholder"),
  confetti: $("confetti"),
  edition: $("edition"),
  editionNames: $("edition-names"),
  editionList: $("edition-list"),
  editionLetter: $("edition-letter"),
  editionCat: $("edition-cat"),
  editionClose: $("edition-close"),
  editionRestart: $("edition-restart"),
  editor: $("editor"),
  editorForm: $("editor-form"),
  editorRows: $("editor-rows"),
  editorNote: $("editor-note"),
};

const slotLabel = (i) => `${i < 4 ? "L" : "R"}${(i % 4) + 1}`;
const nth = (i) => `N° ${String(i + 1).padStart(2, "0")}`;

/* ── Progress: from the sender's colours to the recipient's ───────── */

const FROM = { bg: "#F6F8FA", surface: "#FFFFFF", ink: "#1B2D42", muted: "#5B6B7B", rule: "#DCE4EA", accent: "#1D5C82", "accent-soft": "#7397AB", "accent-tint": "#E6EEF3", "stage-bg": "#1B2D42" };
const TO = { bg: "#F7F6F2", surface: "#F6F3EC", ink: "#202322", muted: "#777777", rule: "#DDDCD5", accent: "#B75C45", "accent-soft": "#C98B78", "accent-tint": "#EFEEE9", "stage-bg": "#131B1E" };

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => {
  const [x, y] = [hex(a), hex(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`;
};

let shownT = 0;
let tweenRaf = 0;
function paint(t) {
  shownT = t;
  const root = document.documentElement;
  root.style.setProperty("--t", t.toFixed(4));
  for (const key of Object.keys(FROM)) root.style.setProperty(`--${key}`, mix(FROM[key], TO[key], t));
  root.dataset.phase = t >= 0.5 ? "his" : "her";
}
function tweenTo(target, ms = 1100) {
  cancelAnimationFrame(tweenRaf);
  if (REDUCED_MOTION) return paint(target);
  const from = shownT;
  const start = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - k, 3);
    paint(from + (target - from) * eased);
    if (k < 1) tweenRaf = requestAnimationFrame(step);
  };
  tweenRaf = requestAnimationFrame(step);
}

let collected = loadCollected();
function loadCollected() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]");
    return new Set(saved.filter((i) => Number.isInteger(i) && i >= 0 && i < FINGERS.length));
  } catch {
    return new Set();
  }
}
function saveCollected() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify([...collected])); } catch {}
}
function targetT() {
  if (collected.has(FINALE)) return 1;
  return Math.min(1, [...collected].filter((i) => i !== FINALE).length / REGULAR);
}

function refreshProgress({ animate = true } = {}) {
  const count = `${collected.size} / ${FINGERS.length}`;
  els.journeyCount.textContent = count;
  animate ? tweenTo(targetT()) : paint(targetT());

  document.querySelectorAll(".slot").forEach((slot) => {
    slot.classList.toggle("is-got", collected.has(Number(slot.dataset.index)));
  });
  els.langRow.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("got", collected.has(Number(b.dataset.index)));
  });
  markerEls.forEach((m, i) => m.classList.toggle("is-got", collected.has(i)));
  renderPassport();

}

/* ── Board, language row, passport ─────────────────────────────────── */

function renderBoard() {
  els.left.replaceChildren();
  els.right.replaceChildren();
  FINGERS.forEach((finger, index) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "slot" + (finger.finale ? " is-finale" : "");
    button.dataset.index = index;
    button.innerHTML = `<span class="slot-num"></span><span class="slot-name"></span><span class="slot-lang"></span><span class="slot-greet"></span>`;
    button.querySelector(".slot-num").textContent = slotLabel(index);
    const name = button.querySelector(".slot-name");
    name.textContent = finger.name;
    name.lang = finger.nameLang;
    const greet = button.querySelector(".slot-greet");
    greet.textContent = finger.greet;
    greet.lang = finger.tag ?? finger.lang;
    button.querySelector(".slot-lang").textContent = finger.language;
    button.addEventListener("click", () => activate(index));
    li.append(button);
    (index < 4 ? els.left : els.right).append(li);
  });

  els.langRow.replaceChildren();
  FINGERS.forEach((finger, index) => {
    if (finger.finale) return;
    if (els.langRow.childElementCount) {
      const sep = document.createElement("span");
      sep.className = "sep";
      sep.textContent = "/";
      els.langRow.append(sep);
    }
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = finger.language;
    button.dataset.index = index;
    button.addEventListener("click", () => activate(index));
    els.langRow.append(button);
  });
  const all = document.createElement("button");
  all.type = "button";
  all.textContent = "↗";
  all.title = FINGERS[FINALE].language;
  all.dataset.index = FINALE;
  all.addEventListener("click", () => activate(FINALE));
  els.langRow.append(all);
}

function stampSvg(finger, index) {
  const size = finger.glyph.length > 2 ? 20 : finger.glyph.length > 1 ? 26 : 32;
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="3"/>
    <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3"/>
    <text x="50" y="30" text-anchor="middle" font-size="9" letter-spacing="1.5" fill="currentColor" font-family="Georgia, serif">${nth(index)}</text>
    <text x="50" y="${52 + size / 3}" text-anchor="middle" font-size="${size}" fill="currentColor" font-family="Georgia, 'Noto Serif SC', 'Noto Serif KR', serif">${finger.glyph}</text>
    <text x="50" y="80" text-anchor="middle" font-size="8" letter-spacing="1.5" fill="currentColor" font-family="Georgia, serif">2026</text>
  </svg>`;
}

let justStamped = -1;
function renderPassport() {
  els.passport.replaceChildren();
  FINGERS.forEach((finger, index) => {
    const li = document.createElement("li");
    const got = collected.has(index);
    li.className = "cell" + (got ? " is-got" : "") + (index === justStamped ? " is-new" : "");
    const rot = ((index * 37) % 28) - 14;
    li.innerHTML = `<span class="cell-slot" style="--rot:${rot}deg">${
      got
        ? `<span class="cell-stamp">${stampSvg(finger, index)}</span><span class="cell-cat">${catSvg(true)}</span>`
        : slotLabel(index)
    }</span><span class="cell-name"></span>`;
    li.querySelector(".cell-name").textContent = finger.name;
    els.passport.append(li);
  });
  justStamped = -1;
}

// Typing in the editor shouldn't fire fingers or shortcuts.
const typing = (event) => els.editor.open || event.target.closest?.("input, select, textarea");

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !els.edition.hidden) return closeEdition();
  if (typing(event) || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
  const n = Number(event.key);
  if (n >= 1 && n <= 8) activate(n - 1);
});

/* ── Speech (newest tap wins, like TapTalk) ────────────────────────── */

const PREFERRED_VOICES = {
  "zh-CN": ["Tingting", "Ting-Ting", "Lili", "Google 普通话"],
  "zh-TW": ["Meijia", "Mei-Jia", "Google 國語"],
  "zh-HK": ["Sinji", "Sin-ji", "Google 粤語", "Google 粵語"],
  "en-US": ["Samantha", "Karen", "Daniel", "Google US English"],
  "ko-KR": ["Yuna", "Google 한국의"],
  "ja-JP": ["Kyoko", "Google 日本語"],
  "es-ES": ["Mónica", "Monica", "Paulina", "Google español"],
};
let voices = [];
const loadVoices = () => (voices = globalThis.speechSynthesis?.getVoices() ?? []);
if (globalThis.speechSynthesis) {
  loadVoices();
  speechSynthesis.addEventListener?.("voiceschanged", loadVoices);
}

function pickVoice(lang) {
  const norm = (v) => v.lang.replace("_", "-").toLowerCase();
  const exact = voices.filter((v) => norm(v) === lang.toLowerCase());
  for (const name of PREFERRED_VOICES[lang] ?? []) {
    const match = exact.find((v) => v.name.includes(name));
    if (match) return match;
  }
  if (exact.length) return exact.find((v) => v.localService) ?? exact[0];
  const prefix = lang.split("-")[0];
  return voices.find((v) => norm(v).startsWith(prefix)) ?? null;
}

/*
 * Chrome's speech engine has a few known ways to go silent in a long-lived tab:
 * an utterance spoken right after cancel() can be dropped, the engine can stay
 * paused after the tab was hidden or recorded, and an utterance object can be
 * garbage-collected mid-sentence. So: resume() before every line, leave a short
 * gap after interrupting, keep the live utterance referenced, and if a line
 * hasn't started within 1.2 s, reset the engine and say it again (once).
 */
let speechToken = 0;
let liveUtterance = null; // strong reference: Chrome can otherwise GC it and lose onend
let lastCancelAt = 0;
/* Pre-recorded clips (audio/*.m4a), loaded up front so they play instantly. */
const clips = new Map();
let currentClip = null;
function getClip(src) {
  if (!clips.has(src)) {
    const clip = new Audio(src);
    clip.preload = "auto";
    clips.set(src, clip);
  }
  return clips.get(src);
}
FINGERS.forEach((_, i) => ["name", "greet"].forEach((part) => getClip(audioFor(i, part))));

/* Browsers only allow sound after the first click/key on the page. If a tap comes
   before that (e.g. a gesture right after reload), say so on the card. */
let soundHintTimer = 0;
function showSoundHint() {
  let toast = els.stage.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("p");
    toast.className = "toast";
    toast.textContent = "点一下页面任意处就有声音了 · Click anywhere once to turn on sound";
    els.stage.append(toast);
  }
  toast.hidden = false;
  clearTimeout(soundHintTimer);
  soundHintTimer = setTimeout(() => (toast.hidden = true), 4000);
}
addEventListener("pointerdown", () => els.stage.querySelector(".toast")?.setAttribute("hidden", ""));

function stopSpeech() {
  speechToken += 1;
  if (currentClip) {
    currentClip.onended = null;
    currentClip.onerror = null;
    currentClip.pause();
    currentClip = null;
  }
  const synth = globalThis.speechSynthesis;
  if (synth && (synth.speaking || synth.pending)) lastCancelAt = performance.now();
  synth?.cancel();
}
globalThis.speechSynthesis?.cancel(); // start every page load from a clean engine
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) globalThis.speechSynthesis?.resume();
});

/** Speak items in turn. `onEach(item)` fires as each starts; `onDone` after the last. */
function speakSequence(items, onEach = () => {}, onDone = () => {}) {
  stopSpeech();
  const token = speechToken;
  let i = 0;
  const next = () => {
    if (token !== speechToken) return;
    if (i >= items.length) return onDone();
    const item = items[i++];
    onEach(item);
    const synth = globalThis.speechSynthesis;
    if (!synth) {
      setTimeout(next, 1300);
      return;
    }
    let finished = false;
    const finish = () => {
      if (finished || token !== speechToken) return;
      finished = true;
      setTimeout(next, item.pause ?? 150);
    };
    const say = (attempt) => {
      if (finished || token !== speechToken) return;
      const utterance = new SpeechSynthesisUtterance(item.say);
      utterance.lang = item.lang;
      const voice = pickVoice(item.lang);
      if (voice) utterance.voice = voice;
      utterance.rate = 0.95;
      let started = false;
      utterance.onstart = () => (started = true);
      utterance.onend = finish;
      utterance.onerror = (e) => {
        if (e.error === "interrupted" || e.error === "canceled") return;
        console.warn("speech error", e.error, item.say);
        finish();
      };
      liveUtterance = utterance;
      synth.resume();
      synth.speak(utterance);
      // Watchdog: a line that never starts gets one retry on a reset engine, then is skipped.
      setTimeout(() => {
        if (started || finished || token !== speechToken) return;
        console.warn(`speech didn't start (attempt ${attempt}):`, item.say);
        synth.cancel();
        if (attempt === 1) setTimeout(() => say(2), 120);
        else finish();
      }, 1200);
    };
    const speakWithEngine = () => {
      if (finished || token !== speechToken) return;
      // Give the engine a moment if we just interrupted it (Chrome drops a speak() right after cancel()).
      const sinceCancel = performance.now() - lastCancelAt;
      if (sinceCancel < 120) setTimeout(() => say(1), 120 - sinceCancel);
      else say(1);
    };
    setTimeout(finish, 8000); // safety net if nothing ever reports the end

    // First choice: the pre-recorded clip. Only if it can't play, use the speech engine.
    if (item.audio) {
      const clip = getClip(item.audio);
      currentClip = clip;
      clip.onended = finish;
      clip.onerror = speakWithEngine;
      try { clip.currentTime = 0; } catch {}
      clip.play().catch((error) => {
        console.warn("audio clip failed:", error?.name, item.audio);
        if (error?.name === "NotAllowedError") showSoundHint();
        speakWithEngine();
      });
    } else {
      speakWithEngine();
    }
  };
  next();
}

/* ── Caption ───────────────────────────────────────────────────────── */

let captionTimer = 0;
function showName(finger, index, meta) {
  clearTimeout(captionTimer);
  els.name.textContent = finger.name;
  els.name.lang = finger.nameLang;
  els.greet.textContent = "";
  els.caption.classList.remove("show-greet");
  els.caption.classList.add("is-on");
  els.stage.classList.add("has-caption");
}
function showGreet({ meta, text, lang }) {
  els.greet.textContent = text;
  els.greet.lang = lang;
  // Long lines (お誕生日おめでとう！, ¡Feliz cumpleaños!) step down a size so they stay on one line.
  const cjk = /[぀-ヿ一-鿿가-힯]/.test(text);
  els.greet.classList.toggle("is-long", [...text].length > (cjk ? 8 : 15));
  els.caption.classList.remove("show-greet");
  void els.caption.offsetWidth;
  els.caption.classList.add("show-greet");
}
function hideCaptionLater(ms) {
  clearTimeout(captionTimer);
  captionTimer = setTimeout(hideCaption, ms);
}
function hideCaption() {
  clearTimeout(captionTimer);
  els.caption.classList.remove("is-on", "show-greet");
  els.stage.classList.remove("has-caption");
}

function flash(el, cls, ms = 600) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}
function chooseLanguage(index) {
  els.langRow.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("chosen", Number(b.dataset.index) === index);
  });
}

/* ── Activation ────────────────────────────────────────────────────── */

let streak = { index: -1, count: 0, at: 0 };
function isShortcut(index) {
  const now = performance.now();
  const same = streak.index === index && now - streak.at <= SHORTCUT.windowMs;
  streak = { index, count: same ? streak.count + 1 : 1, at: now };
  if (index === SHORTCUT.index && streak.count >= SHORTCUT.taps) {
    streak = { index: -1, count: 0, at: 0 };
    return true;
  }
  return false;
}

function collect(index) {
  const isNew = !collected.has(index);
  collected.add(index);
  if (isNew) justStamped = index;
  saveCollected();
  refreshProgress();
  return isNew;
}

function activate(index) {
  const finger = FINGERS[index];
  if (!finger || inputLocked || !els.edition.hidden) return;

  const slot = document.querySelector(`.slot[data-index="${index}"]`);
  flash(slot, "is-hit", 900);
  flash(markerEls[index], "is-hit", 600);
  catReact(finger.meow);

  if (finger.finale || isShortcut(index)) {
    if (!finger.finale) collect(index);
    playFinale(finger.finale ? index : FINALE);
    return;
  }

  const isNew = collect(index);
  chooseLanguage(index);
  showName(finger, index);
  const greet = { meta: `${nth(index)} · ${finger.language}`, text: finger.greet, lang: finger.tag ?? finger.lang };
  speakSequence(
    [
      { say: finger.nameSay ?? finger.name, lang: finger.nameLang, audio: clipFor(index, "name"), pause: 250 },
      { say: finger.greetSay ?? finger.greet, lang: finger.lang, audio: clipFor(index, "greet"), greet },
    ],
    (item) => {
      if (item.greet) {
        showGreet(item.greet);
        burst(isNew ? 46 : 24);
        streamers(isNew ? 30 : 20); // streamers on every tap, too
      }
    },
    () => hideCaptionLater(2200),
  );
  hideCaptionLater(9000); // in case speech never finishes
}

function playFinale(index) {
  const finger = FINGERS[index];
  collect(index);
  chooseLanguage(-1);
  showName(finger, index, `${slotLabel(index)} · 最后一声`);
  clearTimeout(captionTimer);
  burst(140, true);

  const greetings = FINGERS.flatMap((f, i) =>
    f.finale
      ? []
      : [{
          say: f.greetSay ?? f.greet,
          lang: f.lang,
          audio: clipFor(i, "greet"),
          index: i,
          fx: f.fx,
          meow: f.meow,
          greet: { meta: `${nth(i)} · ${f.language} · ${f.name}`, text: f.greet, lang: f.tag ?? f.lang },
        }],
  );
  speakSequence(
    [
      { say: finger.nameSay ?? finger.name, lang: finger.nameLang, audio: clipFor(index, "name"), pause: 300 },
      ...greetings,
      {
        say: finger.greetSay ?? finger.greet,
        lang: finger.lang,
        audio: clipFor(index, "greet"),
        index: -1,
        fx: finger.fx,
        greet: { meta: "全部 · ALL", text: finger.greet, lang: "en" },
      },
    ],
    (item) => {
      if (!item.greet) return;
      showGreet(item.greet);
      chooseLanguage(item.index);
      catReact(item.meow);
      // index is 0-based: index 4 starting means four languages are done (-1 is the closing line).
      if (item.index === -1 || item.index >= FINALE_LOCK_AFTER) lockInput();
      playFx(item.fx);
      // Every birthday wish in the finale also brings a fresh shower of streamers.
      if (item.fx !== "ribbons" && item.fx !== "world") streamers(30);
    },
    // Let every flag land before the birthday edition opens over the map.
    () => setTimeout(openEdition, Math.max(900, worldRemaining() + 800)),
  );
}

/* ── The birthday edition ──────────────────────────────────────────── */

function renderEdition() {
  els.editionNames.textContent = FINGERS.map((f) => f.name).join(" · ");
  els.editionNames.title = els.editionNames.textContent;
  els.editionList.replaceChildren();
  FINGERS.forEach((finger, index) => {
    if (finger.finale) return;
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<span class="n"></span><span class="l"></span><span><span class="g"></span><span class="who"></span></span>`;
    button.querySelector(".n").textContent = String(index + 1).padStart(2, "0");
    button.querySelector(".l").textContent = finger.language;
    const g = button.querySelector(".g");
    g.textContent = finger.greet;
    g.lang = finger.tag ?? finger.lang;
    button.querySelector(".who").textContent = `— to ${finger.name}`;
    button.addEventListener("click", () =>
      speakSequence([
        { say: finger.nameSay ?? finger.name, lang: finger.nameLang, audio: clipFor(index, "name"), pause: 200 },
        { say: finger.greetSay ?? finger.greet, lang: finger.lang, audio: clipFor(index, "greet") },
      ]),
    );
    li.append(button);
    els.editionList.append(li);
  });
  els.editionLetter.replaceChildren(
    ...EDITION.letter.map((text) => Object.assign(document.createElement("p"), { textContent: text })),
  );
  els.editionLetter.hidden = EDITION.letter.length === 0;
  els.editionCat.innerHTML = catSvg(true);
}

let lastFocus = null;
function openEdition() {
  hideCaption();
  lastFocus = document.activeElement;
  els.edition.hidden = false;
  fitNames();
  // Focus the sheet (not the × button) so no focus ring shows in recordings.
  els.edition.querySelector(".edition-sheet").focus({ preventScroll: true });
  burst(180, true);
}

/** Keep the eight names on one line: shrink the font until the line fits. */
function fitNames() {
  const el = els.editionNames;
  el.style.fontSize = "";
  let size = parseFloat(getComputedStyle(el).fontSize);
  while (el.scrollWidth > el.clientWidth && size > 9) {
    size -= 0.5;
    el.style.fontSize = `${size}px`;
  }
}
addEventListener("resize", () => {
  if (!els.edition.hidden) fitNames();
});
/* Input lock for the end of the finale */
let inputLocked = false;
function lockInput() {
  if (inputLocked) return;
  inputLocked = true;
  updateMarkers(FINGER_IDS.map(() => ({ visible: false })));
}
function unlockInput() {
  inputLocked = false;
  tracker.reset(); // a finger must separate from the thumb again before it can fire
}

function closeEdition() {
  stopSpeech();
  els.edition.hidden = true;
  hideWorld();
  unlockInput();
  lastFocus?.focus?.();
}
function restart() {
  stopSpeech();
  hideCaption();
  els.edition.hidden = true;
  hideWorld();
  unlockInput();
  collected = new Set();
  saveCollected();
  chooseLanguage(-1);
  refreshProgress();
}
els.editionClose.addEventListener("click", closeEdition);
els.editionRestart.addEventListener("click", restart);
els.restart.addEventListener("click", restart);
els.edition.addEventListener("click", (e) => {
  if (e.target === els.edition) closeEdition();
});

/* ── Wendy's pixel cat (Big Fish) with a party hat ──────────────────── */

const rows = (spans, fill) =>
  spans.map(([y, x0, x1]) => `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="1" fill="${fill}"/>`).join("");
const range = (a, b) => Array.from({ length: b - a }, (_, i) => a + i);
const BODY = [[26, 10, 30], ...range(27, 36).map((y) => [y, 9, 31]), [36, 10, 30], [37, 11, 29]];
const CHEST = [[27, 15, 25], [28, 14, 26], [29, 14, 26], [30, 14, 26], [31, 15, 25], [32, 15, 25], [33, 16, 24], [34, 17, 23]];
const EARS = [[5, 7, 9], [6, 7, 10], [7, 6, 11], [8, 6, 12], [9, 6, 13], [10, 6, 14], [11, 6, 15], [5, 31, 33], [6, 30, 33], [7, 29, 34], [8, 28, 34], [9, 27, 34], [10, 26, 34], [11, 25, 34]];
const EAR_IN = [[7, 8, 9], [8, 8, 10], [9, 8, 11], [10, 8, 12], [7, 31, 32], [8, 30, 32], [9, 29, 32], [10, 28, 32]];
const HEAD = [[12, 6, 34], [13, 5, 35], ...range(14, 24).map((y) => [y, 5, 35]), [24, 6, 34], [25, 7, 33], [26, 9, 31]];
const BLAZE = [[17, 19, 21], [18, 18, 22], [19, 17, 23]];
const MUZZLE = [[20, 13, 27], [21, 11, 29], [22, 10, 30], [23, 10, 30], [24, 10, 30], [25, 11, 29], [26, 13, 27]];
const HAT = [[1, 19, 21], [2, 18, 22], [3, 18, 22], [4, 17, 23], [5, 17, 23], [6, 16, 24], [7, 16, 24], [8, 15, 25], [9, 15, 25], [10, 14, 26], [11, 14, 26]];

// Wendy's two British Shorthairs: 大鱼 Big Fish (blue-white) and 小竹子 Small Bamboo (golden).
const CAT_PALETTES = {
  fish: { fur: "#8FA3B8", shade: "#73879C", patch: "#F6F4EF", iris: "#E9A23B", blaze: true, socks: true },
  bamboo: { fur: "#E2C389", shade: "#C9A463", patch: "#F7EFD9", iris: "#6FAE5C", blaze: false, socks: false, stripes: "#C49A55" },
};

function catSvg(happy = false, variant = "fish") {
  const c = CAT_PALETTES[variant];
  const { fur, shade, patch, iris } = c;
  const eye = "#1A2C38";
  const eyes = happy
    ? `<rect x="10" y="17" width="2" height="1" fill="${eye}"/><rect x="12" y="16" width="2" height="1" fill="${eye}"/><rect x="14" y="17" width="2" height="1" fill="${eye}"/>
       <rect x="24" y="17" width="2" height="1" fill="${eye}"/><rect x="26" y="16" width="2" height="1" fill="${eye}"/><rect x="28" y="17" width="2" height="1" fill="${eye}"/>`
    : `<rect x="11" y="15" width="4" height="4" fill="${eye}"/><rect x="11" y="18" width="4" height="1" fill="${iris}"/><rect x="12" y="16" width="1" height="1" fill="#fff"/>
       <rect x="25" y="15" width="4" height="4" fill="${eye}"/><rect x="25" y="18" width="4" height="1" fill="${iris}"/><rect x="26" y="16" width="1" height="1" fill="#fff"/>`;
  // The hat's stripes are his terracotta: her cat, dressed for his party.
  return `<svg viewBox="0 -2 40 42" shape-rendering="crispEdges" aria-hidden="true">
    <rect x="26" y="32" width="5" height="5" fill="${shade}"/><rect x="30" y="28" width="4" height="5" fill="${shade}"/>
    <rect x="33" y="23" width="4" height="6" fill="${shade}"/><rect x="34" y="19" width="3" height="5" fill="${shade}"/>
    ${rows(BODY, fur)}${rows(CHEST, patch)}
    <rect x="12" y="37" width="4" height="2" fill="${c.socks ? patch : fur}"/><rect x="24" y="37" width="4" height="2" fill="${c.socks ? patch : fur}"/>
    ${rows(EARS, fur)}${rows(EAR_IN, "#E8B4BE")}${rows(HEAD, fur)}
    ${c.stripes ? `<g fill="${c.stripes}"><rect x="17" y="12" width="1" height="3"/><rect x="20" y="12" width="1" height="4"/><rect x="23" y="12" width="1" height="3"/></g>` : ""}
    ${c.blaze ? rows(BLAZE, patch) : ""}${rows(MUZZLE, patch)}
    ${eyes}
    <rect x="19" y="20" width="2" height="1" fill="#E39AA6"/>
    <rect x="18" y="22" width="1" height="1" fill="${shade}"/><rect x="21" y="22" width="1" height="1" fill="${shade}"/><rect x="19" y="23" width="2" height="1" fill="${shade}"/>
    <g fill="${shade}" opacity=".75"><rect x="2" y="21" width="4" height="1"/><rect x="2" y="23" width="4" height="1"/><rect x="34" y="21" width="4" height="1"/><rect x="34" y="23" width="4" height="1"/></g>
    <rect x="7" y="21" width="2" height="1" fill="#E8A6B0" opacity=".55"/><rect x="31" y="21" width="2" height="1" fill="#E8A6B0" opacity=".55"/>
    ${rows(HAT, "#7397AB")}
    <rect x="16" y="7" width="8" height="1" fill="#B75C45"/><rect x="15" y="10" width="10" height="1" fill="#B75C45"/>
    <rect x="17" y="4" width="6" height="1" fill="#B75C45"/>
    <rect x="19" y="-1" width="2" height="2" fill="#E9A23B"/>
  </svg>`;
}

let catTimer = 0;
function catReact(meow = false) {
  clearTimeout(catTimer);
  els.buddy.innerHTML = catSvg(true) + (meow ? `<span class="meow">喵～</span>` : "");
  flash(els.buddy, "is-hop", 600);
  catTimer = setTimeout(() => (els.buddy.innerHTML = catSvg(false)), 1600);
}

/* ── Effects ───────────────────────────────────────────────────────────
 * One canvas, many kinds of particle. Ordinary taps get the mixed confetti
 * (her pixel squares + his paper strips); the finale gives each language its
 * own effect, and ends with a parade of Wendy's two cats.
 */

const ctx = els.confetti.getContext("2d");
const HER_COLORS = ["#7397AB", "#A8C3BC", "#1D5C82", "#8BA391", "#E8A6B0", "#E9A23B", "#FFFFFF"];
const HIS_COLORS = ["#B75C45", "#202322", "#F6F3EC", "#C98B78", "#8A8984", "#DDDCD5"];
const FESTIVE = ["#B75C45", "#1D5C82", "#E9A23B", "#7397AB", "#E8A6B0", "#8BA391"];
const PETALS = ["#F6C1CC", "#F9D9DF", "#EFA7B8", "#FBE4E8"];
const HEARTS = ["#E8A6B0", "#E36D7E", "#B75C45", "#F4B6C2"];
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[(Math.random() * list.length) | 0];
let pieces = [];
let fxRaf = 0;
const W = () => innerWidth;
const H = () => innerHeight;

function add(p) {
  pieces.push({ life: 0, alpha: 1, rot: 0, vr: 0, vx: 0, vy: 0, ...p });
  if (!fxRaf) fxRaf = requestAnimationFrame(drawFx);
}
const later = (ms, fn) => setTimeout(fn, ms);

/** The everyday confetti, mixed by how far the journey has gone. */
function burst(count = 40, big = false) {
  if (REDUCED_MOTION) return;
  const rect = els.edition.hidden ? els.stage.getBoundingClientRect() : { left: 0, top: 0, width: W(), height: H() };
  const hisShare = 0.25 + 0.6 * shownT;
  for (let i = 0; i < count; i++) {
    const his = Math.random() < hisShare;
    const fromTop = big && i % 2 === 0;
    add({
      kind: his ? "strip" : "pixel",
      x: fromTop ? rand(0, W()) : rect.left + rect.width * rand(0.25, 0.75),
      y: fromTop ? -20 : rect.top + rect.height * 0.62,
      vx: fromTop ? rand(-1, 1) : rand(-4.5, 4.5),
      vy: fromTop ? rand(1, 3) : -rand(5, 14),
      size: his ? rand(6, 12) : pick([6, 9]),
      color: pick(his ? HIS_COLORS : HER_COLORS),
      rot: rand(0, Math.PI),
      vr: his ? rand(-0.15, 0.15) : 0,
      max: 420,
    });
  }
}

/** Curly streamers (彩带) raining down from the top of the window. */
function streamers(count) {
  if (REDUCED_MOTION) return;
  for (let i = 0; i < count; i++) {
    add({ kind: "ribbon", x: rand(0, W()), y: rand(-260, -30), vy: rand(1.6, 3.2), color: pick(FESTIVE), len: rand(46, 90), phase: rand(0, 6), max: 520 });
  }
}

const EFFECTS = {
  // 简体中文 — the big streamer shower
  ribbons() {
    streamers(60);
  },
  // 繁體中文 — fireworks
  fireworks() {
    for (let b = 0; b < 5; b++) {
      later(b * 320, () => {
        const cx = rand(W() * 0.15, W() * 0.85);
        const cy = rand(H() * 0.12, H() * 0.45);
        const color = pick(FESTIVE.concat(["#F3A712", "#FFFFFF"]));
        for (let i = 0; i < 46; i++) {
          const a = (i / 46) * Math.PI * 2;
          const s = rand(2.5, 6);
          add({ kind: "spark", x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color, max: rand(55, 80) });
        }
      });
    }
  },
  // English — balloons float up
  balloons() {
    for (let i = 0; i < 16; i++) {
      add({ kind: "balloon", x: rand(0, W()), y: H() + rand(30, 220), vy: -rand(1.8, 3.2), size: rand(22, 36), color: pick(FESTIVE), phase: rand(0, 6), max: 700 });
    }
  },
  // 한국어 — finger-hearts rise
  hearts() {
    for (let i = 0; i < 36; i++) {
      add({ kind: "heart", x: rand(0, W()), y: H() + rand(10, 200), vy: -rand(1.8, 3.6), size: rand(12, 26), color: pick(HEARTS), phase: rand(0, 6), max: 520 });
    }
  },
  // 朝漢混用 — his postmarks stamp down all over the page
  stamps() {
    const glyphs = FINGERS.filter((f) => !f.finale).map((f) => f.glyph);
    for (let i = 0; i < 10; i++) {
      later(i * 140, () =>
        add({ kind: "stamp", x: rand(60, W() - 60), y: rand(70, H() - 70), rot: rand(-0.4, 0.4), glyph: pick(glyphs), size: rand(28, 44), max: 120 }),
      );
    }
  },
  // Español — strings of flags from all over the world swing down
  bunting() {
    for (let g = 0; g < 3; g++) {
      add({ kind: "garland", x: 0, y: -90, target: 22 + g * 72, sag: rand(26, 46), offset: g * 31, max: 260 });
    }
    burst(40);
  },
  // 日本語 — sakura petals drift across
  sakura() {
    for (let i = 0; i < 70; i++) {
      add({ kind: "petal", x: rand(-W() * 0.2, W()), y: rand(-H() * 0.6, -10), vx: rand(0.6, 1.8), vy: rand(0.9, 2), size: rand(6, 11), color: pick(PETALS), rot: rand(0, 6), vr: rand(-0.06, 0.06), phase: rand(0, 6), max: 700 });
    }
  },
  // Finale: a dotted world map, flags from everywhere fly home
  world() {
    showWorld();
    later(2600, () => burst(160, true));
  },
};

function playFx(name) {
  if (!name) return;
  // The previous language's effect bows out quickly so they don't pile up.
  for (const p of pieces) if (p.kind !== "pixel" && p.kind !== "strip") p.fade = true;
  if (name === "world") return EFFECTS.world(); // the map also shows with reduced motion
  if (REDUCED_MOTION) return;
  (EFFECTS[name] ?? (() => burst(60)))();
}

/* ── The world map finale ─────────────────────────────────────────── */

// [ISO code, lat, lon] of each capital. VISITED (e.g. places the birthday person has been)
// land first and a little larger.
const VISITED = [
  ["CN", 39.9, 116.4], ["JP", 35.7, 139.7], ["GB", 51.5, -0.1], ["US", 38.9, -77.0], ["FR", 48.9, 2.35],
  ["KR", 37.6, 127.0], ["ES", 40.4, -3.7],
];
const ELSEWHERE = [
  ["AU", -35.3, 149.1], ["TH", 13.8, 100.5], ["MY", 3.1, 101.7], ["IR", 35.7, 51.4], ["MM", 19.8, 96.1],
  ["ID", -6.2, 106.8], ["IT", 41.9, 12.5], ["AE", 24.5, 54.4], ["NZ", -41.3, 174.8], ["KH", 11.6, 104.9],
  ["CA", 45.4, -75.7], ["UA", 50.45, 30.5], ["CH", 46.9, 7.4], ["SG", 1.35, 103.8], ["PL", 52.2, 21.0],
  ["MN", 47.9, 106.9], ["LB", 33.9, 35.5], ["IE", 53.35, -6.26], ["EG", 30.0, 31.2], ["DK", 55.7, 12.6],
  ["BE", 50.85, 4.35], ["VN", 21.0, 105.85], ["SY", 33.5, 36.3], ["SB", -9.4, 160.0], ["NL", 52.37, 4.9],
  ["FM", 6.9, 158.2], ["MX", 19.4, -99.1], ["LA", 17.97, 102.6], ["JO", 31.95, 35.9], ["BG", 42.7, 23.3],
  ["RU", 55.75, 37.6], ["CU", 23.1, -82.4],
  ["BR", -15.8, -47.9], ["AR", -34.6, -58.4], ["CL", -33.45, -70.65], ["PE", -12.05, -77.05], ["CO", 4.7, -74.1],
  ["VE", 10.5, -66.9], ["EC", -0.2, -78.5], ["BO", -16.5, -68.15], ["UY", -34.9, -56.2], ["PY", -25.3, -57.6],
  ["ZA", -25.7, 28.2], ["NG", 9.1, 7.5], ["KE", -1.3, 36.8], ["ET", 9.0, 38.75], ["MA", 34.0, -6.8],
  ["DZ", 36.75, 3.05], ["TN", 36.8, 10.2], ["GH", 5.6, -0.2], ["SN", 14.7, -17.45], ["TZ", -6.8, 39.3],
  ["UG", 0.35, 32.6], ["CM", 3.85, 11.5], ["AO", -8.8, 13.2], ["MG", -18.9, 47.5], ["IN", 28.6, 77.2],
  ["PK", 33.7, 73.05], ["BD", 23.8, 90.4], ["LK", 6.9, 79.85], ["NP", 27.7, 85.3], ["PH", 14.6, 121.0],
  ["SA", 24.7, 46.7], ["TR", 39.9, 32.85], ["QA", 25.3, 51.5], ["KZ", 51.15, 71.45], ["UZ", 41.3, 69.25],
  ["DE", 52.5, 13.4], ["PT", 38.7, -9.15], ["AT", 48.2, 16.4], ["CZ", 50.1, 14.4], ["HU", 47.5, 19.05],
  ["GR", 37.98, 23.7], ["SE", 59.3, 18.05], ["NO", 59.9, 10.75], ["FI", 60.2, 24.95], ["IS", 64.15, -21.95],
  ["RO", 44.4, 26.1], ["HR", 45.8, 15.98], ["RS", 44.8, 20.45], ["EE", 59.4, 24.75], ["JM", 18.0, -76.8],
  ["PA", 9.0, -79.5], ["CR", 9.9, -84.1], ["GT", 14.6, -90.5], ["FJ", -18.1, 178.4], ["PG", -9.4, 147.2],
];
const MAP_TOP = 80;
const MAP_BOTTOM = -56;
const MAP_ASPECT = 360 / (MAP_TOP - MAP_BOTTOM);
const WORLD_MS = 4600; // how long the flags take to all land
const flagEmoji = (code) => [...code].map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join("");
const project = (lat, lon) => ({ x: (lon + 180) / 360, y: (MAP_TOP - lat) / (MAP_TOP - MAP_BOTTOM) });

// Land outlines (Natural Earth 1:110m via world-atlas), fetched early so the finale is instant.
const landReady = (async () => {
  try {
    const [{ feature }, topo] = await Promise.all([
      import("https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/+esm"),
      fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json").then((r) => r.json()),
    ]);
    return feature(topo, topo.objects.land);
  } catch (error) {
    console.warn("World map unavailable; flags will fly without it.", error);
    return null;
  }
})();

const worldEl = document.getElementById("world");
const worldMap = document.getElementById("world-map");
const worldCanvas = document.getElementById("world-canvas");
document.getElementById("world-cat").innerHTML = catSvg(true);
let worldShownAt = 0;

async function drawDottedLand() {
  const land = await landReady;
  const dpr = devicePixelRatio || 1;
  const w = worldMap.clientWidth;
  const h = worldMap.clientHeight;
  worldCanvas.width = Math.round(w * dpr);
  worldCanvas.height = Math.round(h * dpr);
  const out = worldCanvas.getContext("2d");
  out.setTransform(dpr, 0, 0, dpr, 0, 0);
  out.clearRect(0, 0, w, h);
  if (!land) return;

  // Rasterise land into a mask, then sample it on a grid: his dotted-map look.
  const mask = document.createElement("canvas");
  mask.width = w;
  mask.height = h;
  const m = mask.getContext("2d", { willReadFrequently: true });
  m.fillStyle = "#000";
  for (const f of land.features ?? [land]) {
    const geom = f.geometry ?? f;
    const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
    for (const poly of polys) {
      m.beginPath();
      for (const ring of poly) {
        ring.forEach(([lon, lat], i) => {
          const p = project(lat, lon);
          i ? m.lineTo(p.x * w, p.y * h) : m.moveTo(p.x * w, p.y * h);
        });
        m.closePath();
      }
      m.fill("evenodd");
    }
  }
  const data = m.getImageData(0, 0, w, h).data;
  const step = Math.max(4.5, w / 190);
  out.fillStyle = "rgba(32, 35, 34, 0.42)";
  for (let y = step / 2; y < h; y += step) {
    for (let x = step / 2; x < w; x += step) {
      if (data[(Math.floor(y) * w + Math.floor(x)) * 4 + 3] > 0) {
        out.beginPath();
        out.arc(x, y, step * 0.3, 0, Math.PI * 2);
        out.fill();
      }
    }
  }
}

function launchFlags() {
  worldMap.querySelectorAll(".flag").forEach((f) => f.remove());
  const all = [...VISITED.map((c) => [...c, true]), ...ELSEWHERE.map((c) => [...c, false])];
  const span = Math.max(innerWidth, innerHeight);
  all.forEach(([code, lat, lon, been], i) => {
    const { x, y } = project(lat, lon);
    const flag = document.createElement("span");
    flag.className = "flag" + (been ? " been" : "");
    flag.textContent = flagEmoji(code);
    const angle = rand(0, Math.PI * 2);
    flag.style.setProperty("--x", `${(x * 100).toFixed(2)}%`);
    flag.style.setProperty("--y", `${(y * 100).toFixed(2)}%`);
    flag.style.setProperty("--dx", `${Math.cos(angle) * span}px`);
    flag.style.setProperty("--dy", `${Math.sin(angle) * span}px`);
    flag.style.setProperty("--r", `${rand(-200, 200).toFixed(0)}deg`);
    const delay = been ? 0.9 + i * 0.045 : 2.1 + (i - VISITED.length) * 0.03 + rand(0, 0.3);
    flag.style.setProperty("--d", `${delay.toFixed(2)}s`);
    worldMap.append(flag);
  });
}

async function showWorld() {
  worldShownAt = performance.now();
  worldEl.hidden = false;
  worldEl.classList.remove("is-on", "is-flying");
  await drawDottedLand();
  launchFlags();
  void worldEl.offsetWidth;
  worldEl.classList.add("is-on");
  requestAnimationFrame(() => worldEl.classList.add("is-flying"));
}
function hideWorld() {
  worldEl.hidden = true;
  worldEl.classList.remove("is-on", "is-flying");
}
/** Milliseconds until the flags have all landed (0 if the map isn't showing). */
function worldRemaining() {
  return worldEl.hidden ? 0 : Math.max(0, WORLD_MS - (performance.now() - worldShownAt));
}

function heartPath(s) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.3);
  ctx.bezierCurveTo(0, 0, -s * 0.5, 0, -s * 0.5, s * 0.3);
  ctx.bezierCurveTo(-s * 0.5, s * 0.6, 0, s * 0.8, 0, s);
  ctx.bezierCurveTo(0, s * 0.8, s * 0.5, s * 0.6, s * 0.5, s * 0.3);
  ctx.bezierCurveTo(s * 0.5, 0, 0, 0, 0, s * 0.3);
  ctx.fill();
}

function step(p) {
  p.life += 1;
  if (p.fade) p.fm = (p.fm ?? 1) * 0.86;
  switch (p.kind) {
    case "pixel":
    case "strip":
      p.vy += 0.22; p.vx *= 0.99; break;
    case "ribbon":
      p.x += Math.sin(p.phase + p.life * 0.03) * 0.7; break;
    case "spark":
      p.vx *= 0.96; p.vy = p.vy * 0.96 + 0.06; p.alpha = 1 - p.life / p.max; break;
    case "balloon":
    case "heart":
      p.x += Math.sin(p.phase + p.life * 0.04) * 0.6;
      if (p.kind === "heart" && p.life > p.max - 60) p.alpha = Math.max(0, (p.max - p.life) / 60);
      break;
    case "petal":
      p.x += Math.sin(p.phase + p.life * 0.05) * 0.5; break;
    case "stamp":
      p.alpha = p.life > p.max - 30 ? Math.max(0, (p.max - p.life) / 30) : 0.92; break;
    case "garland":
      if (p.life < 40) p.y = -90 + (p.target + 90) * (1 - Math.pow(1 - p.life / 40, 3));
      else if (p.life > 170) { p.vy += 0.35; }
      break;
  }
  p.x += p.vx;
  p.y += p.vy;
  p.rot += p.vr;
}

function alive(p) {
  if (p.life > p.max) return false;
  if (p.fade && p.fm < 0.03) return false;
  if (p.kind === "balloon" || p.kind === "heart") return p.y > -120;
  return p.y < H() + 120;
}

function draw(p) {
  ctx.save();
  ctx.globalAlpha = p.alpha * (p.fm ?? 1);
  ctx.translate(p.x, p.y);
  ctx.fillStyle = p.color;
  ctx.strokeStyle = p.color;
  switch (p.kind) {
    case "pixel":
      ctx.fillRect(Math.round(-p.size / 2), Math.round(-p.size / 2), p.size, p.size);
      break;
    case "strip":
      ctx.rotate(p.rot);
      ctx.fillRect(-p.size / 2, -p.size / 6, p.size, p.size / 3);
      break;
    case "ribbon": {
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) {
        const px = Math.sin(p.phase + p.life * 0.09 + i * 0.75) * 8;
        const py = (i / 10) * p.len;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
      break;
    }
    case "spark":
      ctx.beginPath();
      ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "balloon": {
      const s = p.size;
      ctx.strokeStyle = "rgba(32,35,34,.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, s);
      ctx.quadraticCurveTo(Math.sin(p.life * 0.08) * 8, s * 1.8, 0, s * 2.6);
      ctx.stroke();
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.8, s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-4, s + 4); ctx.lineTo(4, s + 4); ctx.lineTo(0, s - 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.35)";
      ctx.beginPath();
      ctx.ellipse(-s * 0.3, -s * 0.35, s * 0.18, s * 0.3, -0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "heart":
      ctx.rotate(Math.sin(p.phase + p.life * 0.05) * 0.25);
      heartPath(p.size);
      break;
    case "petal":
      ctx.rotate(p.rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "stamp": {
      const pop = p.life < 8 ? 1.8 - p.life * 0.1 : 1;
      ctx.rotate(p.rot);
      ctx.scale(pop, pop);
      ctx.strokeStyle = "#B75C45";
      ctx.fillStyle = "#B75C45";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.arc(0, 0, p.size * 0.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${Math.round(p.size * (p.glyph.length > 1 ? 0.55 : 0.75))}px Georgia, "Noto Serif SC", "Noto Serif KR", serif`;
      ctx.fillText(p.glyph, 0, 1);
      ctx.font = `${Math.round(p.size * 0.22)}px Georgia, serif`;
      ctx.fillText(EDITION.stamp, 0, p.size * 0.52);
      break;
    }
    case "garland": {
      const x0 = -20, x1 = W() + 20, cx = W() / 2, cy = p.sag;
      ctx.strokeStyle = "rgba(32,35,34,.45)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x0, 0);
      ctx.quadraticCurveTo(cx, cy * 2, x1, 0);
      ctx.stroke();
      // Each pennant is a national flag, hanging from the string.
      const codes = [...VISITED, ...ELSEWHERE].map(([code]) => code);
      const n = Math.max(8, Math.round(W() / 44));
      ctx.font = "30px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const bx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
        const by = 4 * (1 - t) * t * cy; // quadratic with control point at (cx, 2·cy)
        ctx.save();
        ctx.translate(bx, by - 4);
        ctx.rotate(Math.sin(p.life * 0.08 + k) * 0.12);
        ctx.fillText(flagEmoji(codes[(k + p.offset) % codes.length]), 0, 0);
        ctx.restore();
      }
      break;
    }
  }
  ctx.restore();
}

function drawFx() {
  const dpr = devicePixelRatio || 1;
  if (els.confetti.width !== W() * dpr || els.confetti.height !== H() * dpr) {
    els.confetti.width = W() * dpr;
    els.confetti.height = H() * dpr;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W(), H());
  for (const p of pieces) step(p);
  pieces = pieces.filter(alive);
  for (const p of pieces) draw(p);
  fxRaf = pieces.length ? requestAnimationFrame(drawFx) : 0;
}

/* ── Fingertip markers ─────────────────────────────────────────────── */

let markerEls = [];
function renderMarkers() {
  els.markers.replaceChildren();
  markerEls = FINGER_IDS.map((id, index) => {
    const marker = document.createElement("div");
    marker.className = "marker is-off";
    marker.innerHTML = `<span class="marker-dot"></span><span class="marker-label"></span>`;
    marker.querySelector(".marker-label").textContent = FINGERS[index].name;
    els.markers.append(marker);
    return marker;
  });
}

/** Map a normalized landmark to stage pixels for a mirrored, object-fit: cover video. */
function toStage(point) {
  const sw = els.stage.clientWidth;
  const sh = els.stage.clientHeight;
  const vw = els.video.videoWidth || 16;
  const vh = els.video.videoHeight || 9;
  const scale = Math.max(sw / vw, sh / vh);
  const rw = vw * scale;
  const rh = vh * scale;
  return { x: (1 - point.x) * rw - (rw - sw) / 2, y: point.y * rh - (rh - sh) / 2 };
}

function updateMarkers(fingers) {
  fingers.forEach((finger, index) => {
    const marker = markerEls[index];
    if (!marker) return;
    if (!finger.visible || !finger.fingertip) {
      marker.classList.add("is-off");
      return;
    }
    const { x, y } = toStage(finger.fingertip);
    marker.classList.remove("is-off");
    marker.style.setProperty("--x", `${x}px`);
    marker.style.setProperty("--y", `${y}px`);
    marker.classList.toggle(
      "is-near",
      finger.state === TRACKING_STATES.APPROACHING || finger.state === TRACKING_STATES.CONTACT_CANDIDATE,
    );
  });
}

/* ── Camera + hand tracking ────────────────────────────────────────── */

let landmarker = null;
let stream = null;
let running = false;
let raf = 0;
const tracker = new ContactTracker(LIVE_CONTACT_OPTIONS);
const IDLE_STATUS = "摄像头画面只留在这台设备上 · Nothing leaves this device";
const setStatus = (text) => (els.status.textContent = text);

async function loadLandmarker() {
  if (landmarker) return landmarker;
  setStatus("正在加载手势模型… Loading the hand model");
  const { FilesetResolver, HandLandmarker } = await import(`${MEDIAPIPE}/vision_bundle.mjs`);
  const vision = await FilesetResolver.forVisionTasks(`${MEDIAPIPE}/wasm`);
  const options = (delegate) => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "VIDEO",
    numHands: 2,
    minHandDetectionConfidence: 0.35,
    minHandPresenceConfidence: 0.35,
    minTrackingConfidence: 0.4,
  });
  try {
    landmarker = await HandLandmarker.createFromOptions(vision, options("GPU"));
  } catch {
    landmarker = await HandLandmarker.createFromOptions(vision, options("CPU"));
  }
  return landmarker;
}

function semanticHand(category) {
  const name = String(category?.categoryName ?? category?.displayName ?? "").toLowerCase();
  if (name.includes("left")) return "left";
  if (name.includes("right")) return "right";
  return category?.index === 0 ? "left" : category?.index === 1 ? "right" : null;
}

async function startCamera() {
  els.start.disabled = true;
  // Unlock speech inside the click gesture (Safari needs this).
  if (globalThis.speechSynthesis) {
    const warm = new SpeechSynthesisUtterance(" ");
    warm.volume = 0;
    speechSynthesis.speak(warm);
  }
  try {
    setStatus("正在打开摄像头… Opening the camera");
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    els.video.srcObject = stream;
    await els.video.play();
    await loadLandmarker();
  } catch (error) {
    console.error(error);
    stopCamera();
    setStatus(
      error?.name === "NotAllowedError"
        ? "摄像头权限被拒绝了。也可以直接点右边的手指，或按 1–8。"
        : "摄像头或模型没能打开。也可以直接点右边的手指，或按 1–8。",
    );
    return;
  }
  setStatus(IDLE_STATUS);
  els.placeholder.hidden = true;
  els.stop.hidden = false;
  els.stage.classList.add("is-live");
  tracker.reset();
  running = true;
  loop();
}

function stopCamera() {
  running = false;
  cancelAnimationFrame(raf);
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  els.video.srcObject = null;
  els.placeholder.hidden = false;
  els.stop.hidden = true;
  els.start.disabled = false;
  els.stage.classList.remove("is-live");
  updateMarkers(FINGER_IDS.map(() => ({ visible: false })));
  setStatus(IDLE_STATUS);
}

let lastVideoTime = -1;
let lastTimestamp = -1;
let frameId = 0;
function loop() {
  if (!running) return;
  const video = els.video;
  // While the finale is locked, hand tracking pauses entirely (no markers, no taps).
  if (!inputLocked && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const ts = Math.max(Math.round(performance.now()), lastTimestamp + 1);
    lastTimestamp = ts;
    try {
      const result = landmarker.detectForVideo(video, ts);
      const handedness = result.handedness ?? result.handednesses ?? [];
      const hands = (result.landmarks ?? []).flatMap((landmarks, i) => {
        const side = semanticHand(handedness[i]?.[0]);
        return side ? [{ handedness: side, landmarks }] : [];
      });
      const tracked = tracker.processFrame({ timestampMs: ts, frameId: ++frameId, hands });
      updateMarkers(tracked.fingers);
      for (const event of tracked.events) {
        if (event.state === TRACKING_STATES.ACTIVATED) activate(FINGER_IDS.indexOf(event.fingerId));
      }
    } catch (error) {
      console.error(error);
    }
  }
  raf = requestAnimationFrame(loop);
}

// Camera off: clicking the card while a caption shows brings the start button back.
els.stage.addEventListener("click", (event) => {
  if (!els.stage.classList.contains("is-live") && els.stage.classList.contains("has-caption") && event.target !== els.start) {
    stopSpeech();
    hideCaption();
  }
});
els.start.addEventListener("click", startCamera);
els.stop.addEventListener("click", stopCamera);
addEventListener("pagehide", stopCamera);

/* ── One-screen layout + the finger-board switch ───────────────────── */

const screenEl = document.querySelector(".screen");
const stageCol = document.querySelector(".stage-col");
const toggleBoard = document.getElementById("toggle-board");

/**
 * Desktop: shrink the stage (keeping 16:9) until the header, title, stage,
 * language row and passport all fit in the window without scrolling.
 */
function fitStage() {
  stageCol.style.width = "";
  if (innerWidth <= 900) return;
  const fullWidth = stageCol.getBoundingClientRect().width;
  let width = fullWidth;
  const padBottom = parseFloat(getComputedStyle(stageCol.parentElement).paddingBottom) || 0;
  for (let i = 0; i < 4; i++) {
    // Only the stage column counts: header + title above it, language row + passport below.
    const col = stageCol.getBoundingClientRect();
    const stageH = els.stage.getBoundingClientRect().height;
    const above = col.top + scrollY;
    const below = col.height - stageH;
    const room = innerHeight - above - below - padBottom;
    const next = Math.min(fullWidth, Math.max(320, (room * 16) / 9));
    if (Math.abs(next - width) < 1) break;
    width = next;
    stageCol.style.width = `${width}px`;
  }
}

function setBoardHidden(hidden) {
  document.documentElement.classList.toggle("board-hidden", hidden);
  toggleBoard.setAttribute("aria-pressed", String(hidden));
  try { localStorage.setItem("bday-card-board-hidden", hidden ? "1" : "0"); } catch {}
  fitStage();
}
toggleBoard.addEventListener("click", () =>
  setBoardHidden(!document.documentElement.classList.contains("board-hidden")),
);
document.addEventListener("keydown", (event) => {
  if (typing(event)) return;
  if ((event.key === "s" || event.key === "S") && !event.metaKey && !event.ctrlKey && !event.altKey) {
    setBoardHidden(!document.documentElement.classList.contains("board-hidden"));
  }
});
addEventListener("resize", fitStage);
document.fonts?.ready.then(fitStage);

/* ── Finger editor ─────────────────────────────────────────────────── */

const editorNote = els.editorNote.textContent;

function fillEditor(source) {
  els.editorRows.replaceChildren();
  source.forEach((finger, index) => {
    const d = DEFAULTS[index];
    const li = document.createElement("li");
    li.className = "editor-row";
    li.innerHTML = `<span class="editor-slot"></span>
      <label><span>昵称 · Name</span><input name="name" maxlength="24" required autocomplete="off" /></label>
      <label><span>祝福 · Greeting</span><input name="greet" maxlength="48" required autocomplete="off" /></label>
      <label><span>语言 · Voice</span><select name="lang"></select></label>`;
    li.querySelector(".editor-slot").textContent = slotLabel(index) + (d.finale ? " ★" : "");
    li.querySelector('[name="name"]').value = finger.name;
    li.querySelector('[name="greet"]').value = finger.greet;
    const select = li.querySelector("select");
    const codes = [d.lang, ...Object.keys(LANGS).filter((code) => code !== d.lang)];
    for (const code of codes) {
      const label = code === d.lang && !d.finale ? d.language : LANGS[code]?.[0] ?? code;
      select.append(new Option(`${label} · ${code}`, code));
    }
    select.value = finger.lang;
    els.editorRows.append(li);
  });
}

/** Read the form into the compact { name?, greet?, lang? } diff against fingers.js. */
function readEditor() {
  const custom = [...els.editorRows.children].map((row, i) => {
    const d = DEFAULTS[i];
    const c = {};
    const name = row.querySelector('[name="name"]').value.trim();
    const greet = row.querySelector('[name="greet"]').value.trim();
    const lang = row.querySelector('[name="lang"]').value;
    if (name && name !== d.name) c.name = name;
    if (greet && greet !== d.greet) c.greet = greet;
    if (lang !== d.lang) c.lang = lang;
    return Object.keys(c).length ? c : null;
  });
  return custom.some(Boolean) ? custom : null;
}

function rerenderFingers() {
  stopSpeech();
  hideCaption();
  renderBoard();
  renderMarkers();
  renderEdition();
  refreshProgress({ animate: false });
}

$("edit-fingers").addEventListener("click", () => {
  els.editorNote.textContent = editorNote;
  fillEditor(FINGERS);
  els.editor.showModal();
});
$("editor-x").addEventListener("click", () => els.editor.close());
$("editor-reset").addEventListener("click", () => fillEditor(DEFAULTS));
$("editor-link").addEventListener("click", async () => {
  const custom = readEditor();
  const url = location.origin + location.pathname + (custom ? `#f=${encodeCustom(custom)}` : "");
  try {
    await navigator.clipboard.writeText(url);
    els.editorNote.textContent = "链接已复制。打开它的人会看到这里填的内容 · Link copied.";
  } catch {
    els.editorNote.textContent = url;
  }
});
els.editorForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const custom = readEditor();
  try {
    custom ? localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom)) : localStorage.removeItem(CUSTOM_KEY);
  } catch {}
  // This browser's saved version is now the source; drop a shared #f= so it doesn't override.
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  applyCustom(custom);
  rerenderFingers();
  els.editor.close();
});

/* ── Boot ──────────────────────────────────────────────────────────── */

els.buddy.innerHTML = catSvg(false);
els.catPlaceholder.innerHTML = catSvg(true);
renderBoard();
renderMarkers();
renderEdition();
refreshProgress({ animate: false });
// The finger list starts hidden (clean for screen recording); the header button or S shows it.
let boardHidden = true;
try { boardHidden = localStorage.getItem("bday-card-board-hidden") !== "0"; } catch {}
setBoardHidden(boardHidden);
