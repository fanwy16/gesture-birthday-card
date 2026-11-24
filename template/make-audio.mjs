// Records every name and greeting with the Mac's own voices into audio/*.m4a,
// so the card doesn't depend on the browser's speech engine.
//   Usage (macOS):  node make-audio.mjs
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { FINGERS, VOICES, audioFor } from "./fingers.js";

const here = fileURLToPath(new URL(".", import.meta.url)); // handles spaces in the path
mkdirSync(join(here, "audio"), { recursive: true });
const tmp = join(tmpdir(), `birthday-audio-${process.pid}.aiff`);

function record(text, lang, out) {
  const voice = VOICES[lang];
  if (!voice) throw new Error(`No voice configured for ${lang}`);
  execFileSync("say", ["-v", voice, "-r", "165", "-o", tmp, text]);
  execFileSync("afconvert", ["-f", "m4af", "-d", "aac", tmp, join(here, out)]);
  console.log(`${out}  ${voice.padEnd(9)} ${text}`);
}

FINGERS.forEach((f, i) => {
  record(f.nameSay ?? f.name, f.nameLang, audioFor(i, "name"));
  record(f.greetSay ?? f.greet, f.lang, audioFor(i, "greet"));
});
rmSync(tmp, { force: true });
