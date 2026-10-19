// node synth.mjs <cues.json> <out.wav>
// The Glyph kit sound: one room (a 1989–1990s room you do work in: a muffled mechanical keyboard, a CRT
// that's on, the hard disk, the floppy drive, a PC speaker, an FM sound card), one key (A minor),
// three buses (bed, pulse, accent) with the bed dipping under accents. Small events fold into one
// gesture (typing is one texture, not a click per letter); accents land only on primary events. The
// four glyphs are the sound logo: four dry clicks open the film, the same four, pitched and rising,
// close it. Dither has its own sound: grains in four density steps, like the press's four levels.
// Input: { dur, bpm, cues: [{ t, type, ... }] } from the film page. Loudness is set afterwards (-14 LUFS).
import { readFileSync, writeFileSync } from "node:fs";

const SR = 48000;
const spec = JSON.parse(readFileSync(process.argv[2], "utf8"));
const OUT = process.argv[3];
const DUR = spec.dur;
const N = Math.round(DUR * SR);
const BPM = spec.bpm ?? 120;
const bus = () => [new Float32Array(N), new Float32Array(N)];
const BUS = { bed: bus(), pulse: bus(), accent: bus() };

// ── Basics ──────────────────────────────────────────────────────────────────────────────────────
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const noise = (n) => Float32Array.from({ length: n }, () => rnd() * 2 - 1);
const len = (d) => Math.max(1, Math.round(d * SR));
const env = (n, fn) => Float32Array.from({ length: n }, (_, i) => fn(i / SR));
function biquad(x, type, f, q = 0.707) {
  const w = (2 * Math.PI * Math.min(f, SR * 0.45)) / SR, a = Math.sin(w) / (2 * q), c = Math.cos(w);
  let b0, b1, b2;
  if (type === "lp") (b0 = (1 - c) / 2), (b1 = 1 - c), (b2 = (1 - c) / 2);
  else if (type === "hp") (b0 = (1 + c) / 2), (b1 = -(1 + c)), (b2 = (1 + c) / 2);
  else (b0 = a), (b1 = 0), (b2 = -a); // band-pass
  const a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    (x2 = x1), (x1 = x[i]), (y2 = y1), (y1 = v), (y[i] = v);
  }
  return y;
}
const bp = (x, lo, hi) => biquad(biquad(x, "hp", lo), "lp", hi);
const mul = (a, b) => a.map((v, i) => v * (b[i] ?? 0));
const add = (into, x, at = 0, g = 1) => {
  for (let i = 0; i < x.length; i++) if (at + i < into.length && at + i >= 0) into[at + i] += x[i] * g;
  return into;
};

// A minor, natural: degree 1 = A at the given octave (A4 = 440 Hz).
const STEPS = [0, 2, 3, 5, 7, 8, 10];
const hz = (deg = 1, oct = 4) => {
  const d = deg - 1, o = oct + Math.floor(d / 7);
  return 440 * 2 ** (o - 4) * 2 ** (STEPS[((d % 7) + 7) % 7] / 12);
};
const sine = (n, f, phase = 0) => env(n, (t) => Math.sin(2 * Math.PI * f * t + phase));

// ── The room's machines: lo-fi helpers ─────────────────────────────────────────────────────────
/* Memory was scarce: hold every sample for a lower rate and round it to fewer bits. */
const lofi = (x, rate = 11025, bits = 8) => {
  const hold = Math.max(1, Math.round(SR / rate)), q = 2 ** (bits - 1), y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = i % hold === 0 ? Math.round(Math.max(-1, Math.min(1, x[i])) * q) / q : y[i - 1];
  return biquad(y, "lp", rate * 0.42);
};
const square = (n, f) => env(n, (t) => (Math.sin(2 * Math.PI * f * t) >= 0 ? 1 : -1));
/* A PC speaker: a square wave through a small, tinny cone. */
const speaker = (n, f, decay = 5) => bp(mul(square(n, f), env(n, (t) => Math.min(1, t / 0.002) * Math.exp(-t * decay))), 350, 3200);
const crackle = (d, count, g = 1) => {
  const out = new Float32Array(len(d));
  for (let k = 0; k < count; k++) add(out, mul(bp(noise(len(0.003)), 2000, 9000), env(len(0.003), (x) => Math.exp(-x * 2200))), Math.floor(rnd() * (out.length - len(0.004))), (0.08 + rnd() * 0.12) * g);
  return out;
};

// ── Voices: a 1989–1990s room you do work in ───────────────────────────────────────────────────
const V = {
  /* An ordinary keyboard: a light plastic tap, a soft bottom-out, the key coming back up. The
     space bar is a little deeper. Every key is a little different. */
  key({ g = 1, big = false } = {}) {
    const v = 0.9 + rnd() * 0.2, n = len(0.14), out = new Float32Array(n);
    add(out, mul(bp(noise(len(0.006)), 1800, 6000), env(len(0.006), (t) => Math.exp(-t * 1100))), 0, 0.42);
    add(out, mul(bp(noise(len(0.02)), (big ? 220 : 320) * v, (big ? 700 : 950) * v), env(len(0.02), (t) => Math.exp(-t * (big ? 160 : 230)))), len(0.001), big ? 0.5 : 0.38);
    add(out, mul(sine(len(0.025), (big ? 150 : 210) * v), env(len(0.025), (t) => Math.exp(-t * 150))), len(0.001), 0.14);
    add(out, mul(bp(noise(len(0.005)), 2000, 5500), env(len(0.005), (t) => Math.exp(-t * 1300))), len(0.055 + rnd() * 0.03), 0.16);
    const room = new Float32Array(n);
    [[0.006, 0.18], [0.013, 0.1]].forEach(([d, a]) => add(room, out, len(d), a));
    return add(out, biquad(room, "lp", 3000)).map((x) => x * g);
  },
  /* The space bar. */
  spacebar({ g = 1 } = {}) {
    return V.key({ g, big: true });
  },
  /* The space bar: its stabiliser rattle and a deeper clack. */
  spacebar({ g = 1 } = {}) {
    return V.key({ g, big: true });
  },
  /* Typing as one gesture: words. Letters at a human pace, a space bar between words, a small pause. */
  type({ d = 0.5, g = 1 }) {
    const n = len(d + 0.25), out = new Float32Array(n);
    let t = 0.01, inWord = 0, word = 3 + Math.floor(rnd() * 4);
    while (t < d) {
      if (inWord >= word) {
        add(out, V.key({ g: 0.75, big: true }), len(t));
        t += 0.12 + rnd() * 0.06;
        inWord = 0;
        word = 3 + Math.floor(rnd() * 4);
      } else {
        add(out, V.key({ g: 0.55 + rnd() * 0.3 }), len(t));
        t += 0.075 + rnd() * 0.05;
        inWord++;
      }
    }
    return out.map((v) => v * 0.7 * g);
  },
  /* One tone of the sound logo: a soft, warm bell, slightly lo-fi. */
  logoKey({ deg = 6, oct = 4, step = 0 }) {
    const f = hz(deg, oct), n = len(2.2);
    const tone = env(n, (t) => (Math.sin(2 * Math.PI * f * t) + 0.18 * Math.sin(2 * Math.PI * 2 * f * t) + 0.05 * Math.sin(2 * Math.PI * 3 * f * t)) * Math.min(1, t / 0.012) * Math.exp(-t * 1.6));
    return biquad(lofi(tone, 22050, 12), "lp", 2200 + step * 400).map((v) => v * 0.12);
  },
  /* The swell the logo opens into: a warm chord rising and settling, like a 90s start-up sound. */
  swell({ chord = [6, 8, 10, 12, 14], d = 3.5 }) {
    const n = len(d), s = new Float32Array(n);
    chord.forEach((deg, i) => [-0.004, 0.004].forEach((det) => {
      const f = hz(deg, 3 + (i > 2 ? 1 : 0)) * (1 + det), ph = rnd() * 6;
      add(s, env(n, (t) => Math.sin(2 * Math.PI * f * t + ph) + 0.15 * Math.sin(4 * Math.PI * f * t + ph)), 0, 1 / (chord.length * 2));
    }));
    const bright = biquad(s, "lp", 1800);
    return mul(lofi(bright, 22050, 12), env(n, (t) => Math.min(1, t / 0.6) ** 1.4 * Math.exp(-Math.max(0, t - 0.9) * 0.9) * 0.16));
  },
  /* A number counting up: the hard disk reading, irregular head ticks over a faint spin. */
  roll({ d = 0.5 }) {
    const n = len(d + 0.05), out = new Float32Array(n);
    for (let t = 0; t < d; t += 0.018 + rnd() * 0.03) add(out, mul(bp(noise(len(0.005)), 600, 2400), env(len(0.005), (x) => Math.exp(-x * 900))), len(t), 0.16 + rnd() * 0.1);
    add(out, mul(sine(n, 90), env(n, (t) => Math.min(1, t / 0.05) * Math.min(1, (d - t) / 0.05))), 0, 0.012);
    return out;
  },
  /* A number landing: one short PC-speaker blip. */
  land({ deg = 5, oct = 5 }) {
    return lofi(speaker(len(0.12), hz(deg, oct), 18), 11025, 8).map((v) => v * 0.09);
  },
  /* Bars growing: the floppy drive's head stepping, four steps of sharp metal ticks over the motor. */
  fill({ steps = 4, dir = 1, every = 0.12 }) {
    const total = steps * every + 0.15, out = new Float32Array(len(total));
    const motor = mul(biquad(biquad(noise(len(total)), "lp", 320), "hp", 70), env(len(total), (t) => (0.75 + 0.25 * Math.sin(2 * Math.PI * 30 * t)) * Math.min(1, t / 0.04) * Math.min(1, (total - t) / 0.06)));
    add(out, motor, 0, 0.06);
    for (let k = 0; k < steps; k++)
      for (let j = 0; j < 3; j++) {
        const at = k * every + j * 0.009;
        add(out, mul(bp(noise(len(0.003)), 2200, 6500), env(len(0.003), (t) => Math.exp(-t * 2000))), len(at), 0.3);
        add(out, mul(sine(len(0.03), 3100), env(len(0.03), (t) => Math.exp(-t * 160))), len(at), 0.03);
      }
    return out;
  },
  /* The press, digital: a tiny run of soft square-wave blips stepping up as the frame covers, one low
     digital tick at full cover, the run stepping back down as it reveals. */
  press({ swap = 0.52, quietReveal = false }) {
    const out = new Float32Array(len(swap + 1));
    const blip = (deg, oct, g) => lofi(biquad(mul(square(len(0.045), hz(deg, oct)), env(len(0.045), (t) => Math.min(1, t / 0.002) * Math.exp(-t * 70))), "lp", 2400), 16000, 8).map((v) => v * g);
    const up = [1, 3, 4, 5];
    [0.08, 0.2, 0.32, 0.44].forEach((t, k) => add(out, blip(up[k], 5, 0.06), len(t)));
    add(out, lofi(biquad(mul(square(len(0.07), hz(1, 3)), env(len(0.07), (t) => Math.min(1, t / 0.002) * Math.exp(-t * 45))), "lp", 900), 16000, 8), len(swap), 0.14);
    if (!quietReveal) [0.1, 0.22, 0.34].forEach((t, k) => add(out, blip(up[2 - k], 5, 0.035), len(swap + t)));
    return out;
  },
  /* The pulse: the hard disk's activity tick, small and dry. */
  tick() {
    const n = len(0.05);
    return mul(bp(noise(n), 700, 2000), env(n, (t) => Math.exp(-t * 320))).map((v) => v * 0.1);
  },
  /* The room: an old computer humming under the desk. The fan's airflow, a smooth power-supply hum,
     the hard disk spinning. Very quiet, and nothing high. */
  room({ d }) {
    const n = len(d), out = new Float32Array(n);
    add(out, biquad(biquad(noise(n), "lp", 650), "hp", 80), 0, 0.022);
    add(out, env(n, (t) => Math.sin(2 * Math.PI * 50 * t) + 0.45 * Math.sin(2 * Math.PI * 100 * t) + 0.2 * Math.sin(2 * Math.PI * 150 * t)), 0, 0.004);
    add(out, env(n, (t) => Math.sin(2 * Math.PI * 90 * t + 0.2 * Math.sin(2 * Math.PI * 0.3 * t)) * 0.7 + 0.3 * Math.sin(2 * Math.PI * 180 * t)), 0, 0.003);
    return mul(out, env(n, (t) => Math.min(1, t / 1.2) * Math.min(1, (d - t) / 1.5)));
  },
  /* The boot: the power supply clicks on, the fan and hard disk spin up, the floppy drive seeks,
     then the BIOS's single beep. */
  boot({ quick = false } = {}) {
    const q = quick ? 0.45 : 1; // quick: the same boot, done in under a second
    const d = 3 * q + 0.6, n = len(d), out = new Float32Array(n);
    add(out, biquad(env(len(0.25), (t) => Math.sin(2 * Math.PI * 85 * t) * Math.min(1, t / 0.002) * Math.exp(-t * 35)), "lp", 500), 0, 0.35);
    add(out, mul(bp(noise(len(0.01)), 800, 3000), env(len(0.01), (t) => Math.exp(-t * 600))), 0, 0.25);
    // the fan and the hard disk spinning up
    const fan = biquad(noise(n), "lp", 500);
    add(out, mul(fan, env(n, (t) => Math.min(1, t / (1.4 * q)) ** 2 * Math.min(1, (d - t) / 0.4))), 0, 0.03);
    let ph = 0;
    add(out, env(n, (t) => { const f = 20 + 70 * Math.min(1, t / (1.6 * q)) ** 0.6; ph += (2 * Math.PI * f) / SR; return Math.sin(ph) * Math.min(1, t / 0.3) * Math.min(1, (d - t) / 0.4); }), 0, 0.012);
    // the floppy drive: the head seeks home, then reads
    for (let k = 0; k < 7; k++) add(out, mul(bp(noise(len(0.003)), 2000, 6000), env(len(0.003), (t) => Math.exp(-t * 2000))), len(0.7 * q + k * 0.016), 0.3);
    add(out, mul(biquad(noise(len(0.35)), "lp", 300), env(len(0.35), (t) => (0.7 + 0.3 * Math.sin(2 * Math.PI * 30 * t)) * Math.sin(Math.PI * t / 0.35))), len(0.72 * q), 0.08);
    for (let k = 0; k < 3; k++) add(out, mul(bp(noise(len(0.003)), 2000, 6000), env(len(0.003), (t) => Math.exp(-t * 2000))), len(1.2 * q + k * 0.05), 0.22);
    // the BIOS beep: one short PC-speaker tone
    add(out, lofi(speaker(len(0.3), 880, 3), 11025, 8), len(1.9 * q), 0.09);
    return out;
  },
  /* The bed: calm, warm lo-fi ambient. F maj9 and C maj9 drifting slowly into each other, soft and
     detuned, a gentle tape wobble, a faint hiss, a short room. Nothing eerie. */
  pad({ prog = [[6, 8, 10, 12, 14], [3, 5, 7, 9, 11]], every = 6, d = 12, soft = false }) {
    const n = len(d), s = new Float32Array(n);
    const total = Math.ceil(d / every);
    for (let k = 0; k < total; k++) {
      const c = prog[k % prog.length], t0 = k * every, seg = len(Math.min(d - t0, every + 2));
      c.forEach((deg, i) => [-0.003, 0.003].forEach((det) => {
        const f = hz(deg, 2 + (i > 1 ? 1 : 0)) * (1 + det), ph = rnd() * 6;
        add(s, env(seg, (t) => {
          const w = 1 + 0.0025 * Math.sin(2 * Math.PI * 0.4 * (t + t0));
          return (Math.sin(2 * Math.PI * f * w * t + ph) + 0.25 * Math.sin(4 * Math.PI * f * w * t + ph)) * Math.min(1, t / 1.8) * Math.min(1, (every + 2 - t) / 2);
        }), len(t0), 1 / (c.length * 2));
      }));
    }
    const warm = lofi(biquad(s, "lp", 1100), 22050, 12);
    const room = new Float32Array(n);
    [[0.03, 0.25], [0.07, 0.18], [0.13, 0.1]].forEach(([dl, a]) => add(room, warm, len(dl), a));
    const hiss = biquad(biquad(noise(n), "lp", 5000), "hp", 1500);
    const out = add(add(warm.slice(), biquad(room, "lp", 800)), hiss, 0, 0.006);
    return mul(out, env(n, (t) => Math.min(1, t / 2) ** 1.5 * Math.min(1, (d - t) / 2) * (soft ? 0.07 : 0.085)));
  },
};
const BUS_OF = { room: "bed", pad: "bed", tick: "pulse", type: "pulse", roll: "pulse", fill: "pulse", key: "accent", spacebar: "accent", logoKey: "accent", swell: "accent", land: "accent", press: "accent", boot: "accent" };
const WIDE = { bed: 0.6, pulse: 0.15, accent: 0 };

// ── Place every cue ─────────────────────────────────────────────────────────────────────────────
let placed = 0;
const missing = [];
for (const c of spec.cues) {
  const v = V[c.type];
  if (!v) {
    missing.push(c.type);
    continue;
  }
  const b = BUS[c.bus ?? BUS_OF[c.type] ?? "accent"];
  const x = v(c), at = Math.round(c.t * SR), wide = WIDE[c.bus ?? BUS_OF[c.type]];
  // The bed is widened with a short offset between the channels; accents sit in the centre.
  add(b[0], x, at, (c.g ?? 1) * (1 + wide * 0.1));
  add(b[1], x, at + Math.round(wide * 0.011 * SR), (c.g ?? 1) * (1 - wide * 0.1));
  placed++;
}

// ── Mix: the bed dips under accents; a small room; a soft ceiling ───────────────────────────────
const duck = new Float32Array(N);
{
  let e = 0;
  const att = Math.exp(-1 / (0.01 * SR)), rel = Math.exp(-1 / (0.3 * SR));
  for (let i = 0; i < N; i++) {
    const v = Math.abs(BUS.accent[0][i]);
    e = v > e ? att * e + (1 - att) * v : rel * e + (1 - rel) * v;
    duck[i] = e;
  }
  const peak = Math.max(1e-6, ...duck.filter((_, i) => i % 64 === 0));
  for (let i = 0; i < N; i++) duck[i] = 1 - 0.33 * Math.min(1, duck[i] / peak); // about -3.5 dB at the strongest accent
}
function room(x) {
  const scale = SR / 44100, combs = [1116, 1188, 1277, 1356].map((d) => Math.round(d * scale)), alls = [556, 441].map((d) => Math.round(d * scale));
  const y = new Float32Array(x.length);
  for (const d of combs) {
    const buf = new Float32Array(d);
    let p = 0, lp = 0;
    for (let i = 0; i < x.length; i++) {
      const o = buf[p];
      lp = o * 0.6 + lp * 0.4;
      buf[p] = x[i] + lp * 0.72;
      y[i] += o * 0.25;
      p = (p + 1) % d;
    }
  }
  for (const d of alls) {
    const buf = new Float32Array(d);
    let p = 0;
    for (let i = 0; i < y.length; i++) {
      const b = buf[p], v = -y[i] * 0.5 + b;
      buf[p] = y[i] + b * 0.5;
      y[i] = v;
      p = (p + 1) % d;
    }
  }
  return y;
}
const SEND = { bed: 0.12, pulse: 0.1, accent: 0.22 };
const L = new Float32Array(N), R = new Float32Array(N), send = new Float32Array(N);
for (const [name, [l, r]] of Object.entries(BUS))
  for (let i = 0; i < N; i++) {
    const g = name === "bed" ? duck[i] : 1;
    L[i] += l[i] * g;
    R[i] += r[i] * g;
    send[i] += (l[i] + r[i]) * 0.5 * SEND[name];
  }
const wet = room(send);
let peak = 1e-6;
for (let i = 0; i < N; i++) {
  L[i] += wet[i];
  R[i] += wet[(i + 37) % N];
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const out = Buffer.alloc(44 + N * 4);
out.write("RIFF", 0); out.writeUInt32LE(36 + N * 4, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22);
out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 4, 40);
const ref = spec.fixedPeak ?? peak; // fixedPeak keeps sounds at their real levels against each other
const soft = (v) => Math.max(-1, Math.min(1, (Math.tanh((v / ref) * 1.1) / Math.tanh(1.1)) * 0.9));
for (let i = 0; i < N; i++) {
  out.writeInt16LE(Math.round(soft(L[i]) * 32767), 44 + i * 4);
  out.writeInt16LE(Math.round(soft(R[i]) * 32767), 46 + i * 4);
}
writeFileSync(OUT, out);

// ── The rules, measured: how busy it is, and whether accents ever pile up on a beat ─────────────
const events = spec.cues.filter((c) => (BUS_OF[c.type] ?? "accent") !== "bed");
const accentsPerBeat = {};
events.filter((c) => BUS_OF[c.type] === "accent").forEach((c) => (accentsPerBeat[Math.floor(c.t / (60 / BPM))] = (accentsPerBeat[Math.floor(c.t / (60 / BPM))] ?? 0) + 1));
console.log(`placed ${placed}/${spec.cues.length}${missing.length ? `, unknown: ${[...new Set(missing)].join(", ")}` : ""} → ${OUT}`);
console.log(`${(events.length / DUR).toFixed(2)} sounds a second; beats with more than one accent: ${Object.values(accentsPerBeat).filter((n) => n > 1).length}`);
