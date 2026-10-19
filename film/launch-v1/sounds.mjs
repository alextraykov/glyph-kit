// node film/sounds.mjs  →  film/out/sounds/NN-name.wav, one per sound in the film, and palette.wav
// with all of them in order, a second of silence between. Each sound is played the way the film
// uses it (the four clicks on the beat, the press with its cover and reveal), and every file shares
// one reference level, so the room sounds as quiet against the keys as it will in the film.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const OUT = join(HERE, "out", "sounds");
mkdirSync(OUT, { recursive: true });
const B = 0.5; // a beat at 120 BPM
const LEVEL = 0.62; // one reference level for every file, so they sound as they will against each other

export const SOUNDS = [
  ["boot", "Optional opening: the computer booting. The power supply clicks on, the fan and hard disk spin up, the floppy drive seeks, then the BIOS beep.", 3.2, [{ t: 0.1, type: "boot" }]],
  ["glyph-clicks", "The four glyphs typed at the start: an ordinary keyboard, one key per glyph, on the beat.", 2.6, [0, 1, 2, 3].map((k) => ({ t: 0.2 + k * B, type: "key" }))],
  ["typing", "Typing: an ordinary keyboard, words at a human pace with the space bar between them.", 2.4, [{ t: 0.1, type: "type", d: 2.0 }]],
  ["count-up", "A number counting up: the hard disk reading.", 1.0, [{ t: 0.1, type: "roll", d: 0.5 }]],
  ["number-lands", "The number landing: one short PC-speaker blip.", 0.8, [{ t: 0.1, type: "land", deg: 5, oct: 5 }]],
  ["bars-grow", "Bars growing: the floppy drive's head stepping, four steps of metal ticks over the motor.", 1.6, [{ t: 0.1, type: "fill", steps: 4, dir: 1, every: 0.3 }]],
  ["press", "The press between examples, digital: soft square-wave blips stepping up as the frame covers, a low digital tick at full cover, stepping down as it reveals.", 2.0, [{ t: 0.1, type: "press", swap: 0.52, total: 1.04 }]],
  ["beat-tick", "The pulse under the examples: the hard disk's activity tick on each beat.", 2.2, [0, 1, 2, 3].map((k) => ({ t: 0.1 + k * B, type: "tick" }))],
  ["room", "The room: an old computer humming under the desk (fan, power supply, hard disk). Very quiet, nothing high.", 6.0, [{ t: 0, type: "room", d: 6 }]],
  ["bed", "The bed: calm, warm lo-fi ambient. F maj9 and C maj9 drifting slowly, a gentle tape wobble, a faint hiss.", 12.0, [{ t: 0, type: "pad", d: 12 }]],
  ["sound-logo", "The close: a warm 90s start-up chime. Four soft tones rising F, A, C, E (one per glyph), opening into a warm chord swell.", 4.6, [
    ...[0, 1, 2, 3].map((k) => ({ t: 0.2 + k * (B / 2), type: "logoKey", deg: [6, 8, 10, 12][k], oct: 4, step: k })),
    { t: 0.2 + 2 * B, type: "swell", d: 3.6 }
  ]]
];

const files = [];
SOUNDS.forEach(([name, , dur, cues], i) => {
  const id = String(i + 1).padStart(2, "0");
  const cueFile = join(OUT, `${id}-${name}.json`);
  const wav = join(OUT, `${id}-${name}.wav`);
  writeFileSync(cueFile, JSON.stringify({ dur, bpm: 120, cues, fixedPeak: LEVEL }));
  execFileSync("node", [join(HERE, "synth.mjs"), cueFile, wav], { stdio: ["ignore", "ignore", "inherit"] });
  files.push(wav);
});

// The palette: every sound in order with a second of silence between.
const list = join(OUT, "palette.txt");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", "1", join(OUT, "gap.wav")]);
writeFileSync(list, files.flatMap((f) => [`file '${f}'`, `file '${join(OUT, "gap.wav")}'`]).join("\n"));
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-c:a", "pcm_s16le", join(OUT, "palette.wav")]);
SOUNDS.forEach(([name, about, dur], i) => console.log(`${String(i + 1).padStart(2, "0")}  ${name.padEnd(13)} ${dur.toFixed(1)} s  ${about}`));
console.log("film/out/sounds/palette.wav");
